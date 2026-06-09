import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/gestures.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:url_launcher/url_launcher.dart';

const _kWebBase = 'https://getguac.app';

/// Renders a getguac.app page inside the native shell, already signed in.
///
/// The web app is the single source of truth for these screens — building
/// them once on web and embedding them here keeps mobile from drifting and
/// means a web deploy reaches mobile instantly (no APK rebuild/re-download).
///
/// Auth handover: we load `/embed` with the user's Supabase tokens in the URL
/// *fragment* (never sent to the server / logs). The web bootstrap calls
/// `supabase.auth.setSession(...)`, drops a `guac_embedded` cookie so the web
/// layout hides its own sidebar/topbar, then redirects to [path]. External
/// links (merchant deal pages, mailto) open in the system browser instead of
/// trapping the user inside the WebView.
class WebAppScreen extends StatefulWidget {
  final String path;   // web route to show, e.g. '/reports'
  final String title;  // app-bar title
  const WebAppScreen({super.key, required this.path, required this.title});

  @override
  State<WebAppScreen> createState() => _WebAppScreenState();
}

class _WebAppScreenState extends State<WebAppScreen> {
  WebViewController? _controller;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _init();
  }

  void _init() {
    final session = Supabase.instance.client.auth.currentSession;
    if (session == null) {
      setState(() { _error = 'You need to sign in again.'; _loading = false; });
      return;
    }
    // Tokens ride in the fragment so they never hit the server or any log.
    final frag = Uri(queryParameters: {
      'access_token': session.accessToken,
      'refresh_token': session.refreshToken ?? '',
      'next': widget.path,
    }).query;
    final url = '$_kWebBase/embed#$frag';

    final c = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(const Color(0xFFf9fafb))
      ..setNavigationDelegate(NavigationDelegate(
        onPageFinished: (_) { if (mounted) setState(() => _loading = false); },
        onWebResourceError: (e) {
          if (e.isForMainFrame == true && mounted) {
            setState(() { _error = "Couldn't load — check your connection."; _loading = false; });
          }
        },
        onNavigationRequest: (req) {
          final host = Uri.tryParse(req.url)?.host ?? '';
          // Keep our own pages in the WebView; send everything else out.
          if (host.isEmpty || host.endsWith('getguac.app')) {
            return NavigationDecision.navigate;
          }
          _openExternal(req.url);
          return NavigationDecision.prevent;
        },
      ))
      ..loadRequest(Uri.parse(url));
    setState(() => _controller = c);
  }

  Future<void> _openExternal(String url) async {
    final uri = Uri.tryParse(url);
    if (uri == null) return;
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  Future<void> _reload() async {
    setState(() { _loading = true; _error = null; });
    await _controller?.reload();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        backgroundColor: const Color(0xFF166534),
        foregroundColor: Colors.white,
        title: Text(widget.title),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            tooltip: 'Reload',
            onPressed: _controller == null ? null : _reload,
          ),
        ],
      ),
      body: Stack(children: [
        if (_controller != null && _error == null)
          WebViewWidget(
            controller: _controller!,
            // Claim ALL touch gestures for the WebView. Without this the
            // shell's swipe-between-tabs GestureDetector wins the gesture
            // arena, so the page can't scroll and taps (e.g. the Search
            // button) never reach it. Eager = the WebView gets every touch.
            gestureRecognizers: {
              Factory<EagerGestureRecognizer>(() => EagerGestureRecognizer()),
            },
          ),
        if (_error != null)
          Center(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(mainAxisSize: MainAxisSize.min, children: [
                const Icon(Icons.wifi_off_rounded, size: 40, color: Colors.black26),
                const SizedBox(height: 12),
                Text(_error!, textAlign: TextAlign.center, style: const TextStyle(color: Colors.black54)),
                const SizedBox(height: 16),
                FilledButton(onPressed: _reload, child: const Text('Retry')),
              ]),
            ),
          ),
        if (_loading && _error == null)
          const Center(child: CircularProgressIndicator()),
      ]),
    );
  }
}
