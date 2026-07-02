import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/gestures.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:url_launcher/url_launcher.dart';
import 'guac_mascot.dart';
import 'top_app_bar_actions.dart';
import '../providers/receipt_provider.dart';
import '../theme/gg_design.dart';

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

class _WebAppScreenState extends State<WebAppScreen> with SingleTickerProviderStateMixin {
  WebViewController? _controller;
  bool _loading = true;
  String? _error;
  ReceiptProvider? _receipts;
  late final AnimationController _flip;

  @override
  void initState() {
    super.initState();
    _flip = AnimationController(vsync: this, duration: const Duration(milliseconds: 1400))..repeat();
    _init();
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _receipts = context.read<ReceiptProvider>();
  }

  @override
  void dispose() {
    // Anything changed in the page (e.g. a rating) should reach the native
    // screens, so refresh receipts as we leave. Use the captured ref — the
    // context/provider lookup isn't safe during dispose.
    _receipts?.loadReceipts(period: ReceiptPeriod.all, force: true);
    _flip.dispose();
    super.dispose();
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

  // Refresh = re-run the /embed auth handshake from scratch. A plain
  // controller.reload() can land on a stale/expired session (→ login bounce)
  // or quietly no-op; rebuilding with the current token always returns the
  // page signed in, and the loading mascot makes the action visible.
  void _reload() {
    setState(() { _loading = true; _error = null; _controller = null; });
    _init();
  }

  // Close the WebView screen. Pops the pushed route via go_router, falling
  // back to the dashboard if this is somehow the root. (Receipts refresh in
  // dispose.) NOTE: do NOT gate this behind a canPop:false PopScope — that
  // intercepts the pop and loops back here forever, so the button does nothing.
  void _close() {
    if (context.canPop()) {
      context.pop();
    } else {
      context.go('/dashboard');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        // Clean light bar — matches the native screens' new-design app bar so
        // the embedded (WebView) pages don't jump to a dark header. Inherits
        // surface + hairline divider from the global AppBarTheme.
        backgroundColor: Colors.white,
        surfaceTintColor: Colors.transparent,
        foregroundColor: ggInk,
        iconTheme: const IconThemeData(color: ggInk),
        automaticallyImplyLeading: false,
        titleSpacing: 16,
        title: Row(mainAxisSize: MainAxisSize.min, children: [
          // Logo matches the website + dashboard — the 🥑 emoji, no chip.
          const Padding(
            padding: EdgeInsets.only(right: 8),
            child: Text('🥑', style: TextStyle(fontSize: 22)),
          ),
          Text(widget.title, style: ggHeading(size: 18, color: ggInk)),
        ]),
        actions: [
          signOutAction(context),
          IconButton(
            icon: const Icon(Icons.refresh),
            tooltip: 'Reload',
            onPressed: _reload,
          ),
          IconButton(
            icon: const Icon(Icons.close),
            tooltip: 'Close',
            onPressed: _close,
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
          Center(
            child: Column(mainAxisSize: MainAxisSize.min, children: [
              // Flipping mascot while the page signs in + loads.
              AnimatedBuilder(
                animation: _flip,
                builder: (_, child) => Transform(
                  alignment: Alignment.center,
                  transform: Matrix4.identity()
                    ..setEntry(3, 2, 0.001)
                    ..rotateY(_flip.value * 2 * math.pi),
                  child: child,
                ),
                child: const GuacMascot(size: 96),
              ),
              const SizedBox(height: 16),
              const Text('Loading your guac…',
                style: TextStyle(color: Colors.black54, fontWeight: FontWeight.w700)),
            ]),
          ),
      ]),
    );
  }
}
