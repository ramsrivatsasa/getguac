import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';
import '../theme/gg_design.dart';

/// Cloudflare Turnstile CAPTCHA for signup, rendered in a tiny WebView.
///
/// Turnstile only runs on allow-listed hostnames (getguac.app), so the widget
/// can't be rendered natively — instead we load /turnstile-embed, which posts
/// the token back over the `TurnstileBridge` JavaScript channel. The token is
/// then sent as `turnstile_token` in POST /api/auth/sign-up, same as the web.
///
/// Resolves with the token, or null if the user cancels / the page won't load.
/// Most of the time Turnstile is non-interactive, so the dialog flashes for a
/// second and closes itself; suspicious traffic gets the interactive checkbox.
const _kTurnstileUrl = 'https://getguac.app/turnstile-embed';

Future<String?> runTurnstileCheck(BuildContext context) {
  return showDialog<String>(
    context: context,
    barrierDismissible: false,
    builder: (_) => const _TurnstileDialog(),
  );
}

class _TurnstileDialog extends StatefulWidget {
  const _TurnstileDialog();
  @override
  State<_TurnstileDialog> createState() => _TurnstileDialogState();
}

class _TurnstileDialogState extends State<_TurnstileDialog> {
  late final WebViewController _controller;
  bool _loading = true;
  String? _error;
  bool _done = false;

  @override
  void initState() {
    super.initState();
    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(Colors.white)
      ..addJavaScriptChannel('TurnstileBridge', onMessageReceived: (msg) {
        final token = msg.message.trim();
        // Empty token = widget error/expiry; it retries on its own, so keep
        // the dialog open. Only a real token closes us.
        if (_done || token.isEmpty) return;
        _done = true;
        if (mounted) Navigator.of(context).pop(token);
      })
      // NOTE: no NavigationDelegate.onNavigationRequest here — on iOS it
      // fires for iframe loads too, and blocking challenges.cloudflare.com
      // would silently break the widget.
      ..setNavigationDelegate(NavigationDelegate(
        onPageFinished: (_) {
          if (mounted) setState(() => _loading = false);
        },
        onWebResourceError: (e) {
          if (e.isForMainFrame == true && mounted) {
            setState(() {
              _error = "Couldn't load the security check — check your connection.";
              _loading = false;
            });
          }
        },
      ))
      ..loadRequest(Uri.parse(_kTurnstileUrl));
  }

  void _retry() {
    setState(() {
      _error = null;
      _loading = true;
    });
    _controller.loadRequest(Uri.parse(_kTurnstileUrl));
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      backgroundColor: Colors.white,
      surfaceTintColor: Colors.transparent,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(22),
        side: const BorderSide(color: ggBorder),
      ),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          Text('Quick security check', style: ggHeading(size: 16, color: ggInk)),
          const SizedBox(height: 4),
          Text('Confirming you’re human — usually instant.',
              style: ggBody(size: 11.5, color: ggMuted), textAlign: TextAlign.center),
          const SizedBox(height: 10),
          SizedBox(
            width: 320,
            height: 190,
            child: _error != null
                ? Center(
                    child: Column(mainAxisSize: MainAxisSize.min, children: [
                      const Icon(Icons.wifi_off_rounded, size: 30, color: Colors.black26),
                      const SizedBox(height: 8),
                      Text(_error!, textAlign: TextAlign.center,
                          style: const TextStyle(fontSize: 12, color: Colors.black54)),
                      const SizedBox(height: 10),
                      FilledButton(
                        style: FilledButton.styleFrom(
                          backgroundColor: ggLime, foregroundColor: Colors.white,
                          shape: const StadiumBorder(),
                        ),
                        onPressed: _retry,
                        child: const Text('Retry'),
                      ),
                    ]),
                  )
                : Stack(children: [
                    WebViewWidget(controller: _controller),
                    if (_loading)
                      const Center(
                        child: SizedBox(
                          width: 24, height: 24,
                          child: CircularProgressIndicator(strokeWidth: 2.5, color: ggLime),
                        ),
                      ),
                  ]),
          ),
          TextButton(
            onPressed: () => Navigator.of(context).pop(null),
            child: const Text('Cancel', style: TextStyle(color: Colors.black54)),
          ),
        ]),
      ),
    );
  }
}
