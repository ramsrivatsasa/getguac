// Retailer credential-linking WebView.
//
// === IMPORTANT — TRUST + LEGAL CONSTRAINTS ===
// We never read keystrokes. Users type credentials directly into the
// retailer's own HTML login form, served from the retailer's own
// origin in this WebView. Our JavaScript only runs AFTER the user
// has navigated to the authenticated orders page, and only reads
// the DOM (no form-field interception, no password capture).
//
// Most retailers' Terms of Service prohibit automated access. We
// disclose this risk on the entry screen before opening the WebView.
//
// === FLOW ===
// 1. User taps "Link account" on a retailer in /connections
// 2. Disclosure dialog confirms the trust model
// 3. WebView opens the retailer's login URL with a strict HTTPS host allowlist
// 4. User signs in (their session, their browser within the WebView)
// 5. Once on the orders page, we inject the per-retailer JS extractor
// 6. Extractor previews visible order data; import remains disabled
// 7. WebView closes and retailer cookies are cleared

import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';
import '../../data/retailers.dart';
import '../../data/retailer_extractors.dart';
import '../../widgets/top_app_bar_actions.dart';
import '../../theme/gg_design.dart';

class LinkRetailerScreen extends StatefulWidget {
  final String retailerId;
  const LinkRetailerScreen({super.key, required this.retailerId});

  @override
  State<LinkRetailerScreen> createState() => _LinkRetailerScreenState();
}

class _LinkRetailerScreenState extends State<LinkRetailerScreen> {
  late final WebViewController _controller;
  final WebViewCookieManager _cookieManager = WebViewCookieManager();
  Retailer? _retailer;
  RetailerExtractor? _extractor;
  bool _initialized = false;
  String _status = 'Sign in to start';

  @override
  void initState() {
    super.initState();
    _retailer = kRetailers.where((r) => r.id == widget.retailerId).firstOrNull;
    _extractor = retailerExtractors[widget.retailerId];
    // Only spin up the WebView when both the retailer is known AND
    // we have an extractor for it — the build() method falls back
    // to a "not yet supported" panel otherwise.
    if (_retailer == null || _extractor == null) return;
    _initWebView();
  }

  void _initWebView() {
    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(Colors.white)
      ..setNavigationDelegate(
        NavigationDelegate(
          onPageStarted: (url) {
            setState(() => _status = 'Loading $url');
          },
          onPageFinished: (url) async {
            setState(
              () => _status =
                  'Signed in? Tap "Preview orders" when on your orders page',
            );
            if (_extractor!.isOrdersPage(url)) await _runExtractor();
          },
          onNavigationRequest: (request) {
            if (!request.isMainFrame) return NavigationDecision.navigate;
            final uri = Uri.tryParse(request.url);
            final trusted =
                uri != null &&
                uri.scheme == 'https' &&
                _extractor!.allowedHosts.contains(uri.host.toLowerCase());
            return trusted
                ? NavigationDecision.navigate
                : NavigationDecision.prevent;
          },
        ),
      );
    _controller.loadRequest(Uri.parse(_extractor!.loginUrl));
    setState(() => _initialized = true);
  }

  Future<void> _runExtractor() async {
    if (_extractor == null) return;
    setState(() => _status = 'Reading orders…');
    try {
      // Execute the per-retailer extractor JS. Returns a JSON string
      // of { orders: [...] }. We DO NOT inject any code that reads
      // form fields; the extractor only walks the rendered DOM.
      final raw = await _controller.runJavaScriptReturningResult(
        _extractor!.extractScript,
      );
      final extracted = raw is String ? raw : raw.toString();
      // TODO(phase 2): POST to /api/connections/import here.
      // For now, just show the extracted preview to the user.
      if (!mounted) return;
      setState(
        () => _status =
            'Preview found ${_estimateOrderCount(extracted)} orders. Import is not available yet.',
      );
    } catch (e) {
      if (!mounted) return;
      setState(() => _status = 'Could not read orders: $e');
    }
  }

  int _estimateOrderCount(String raw) {
    final n = RegExp(r'"order_id"').allMatches(raw).length;
    return n;
  }

  @override
  void dispose() {
    _cookieManager.clearCookies();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (_retailer == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Link account')),
        body: const Center(child: Text('Unknown retailer.')),
      );
    }
    if (_extractor == null) {
      return Scaffold(
        appBar: AppBar(title: Text('Link ${_retailer!.name}')),
        body: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const SizedBox(height: 12),
              Text(
                '⚠️ Account linking not yet available for this retailer',
                style: TextStyle(
                  fontWeight: FontWeight.w900,
                  fontVariations: ggWght(FontWeight.w900),
                  fontSize: 16,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                "We don't have a custom order-page extractor for ${_retailer!.name} yet. "
                "Each retailer's order page has a different layout, so we build them one "
                "at a time as we ship. In the meantime, use the email-forwarding setup "
                "steps on the previous screen.",
                style: const TextStyle(
                  fontSize: 13,
                  color: Colors.black54,
                  height: 1.5,
                ),
              ),
              const SizedBox(height: 24),
              FilledButton(
                onPressed: () => Navigator.of(context).pop(),
                child: const Text('Back to setup steps'),
              ),
            ],
          ),
        ),
      );
    }
    return Scaffold(
      appBar: AppBar(
        title: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Flexible(
              child: Text(
                'Link ${_retailer!.name}',
                overflow: TextOverflow.ellipsis,
              ),
            ),
            const SizedBox(width: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
              decoration: BoxDecoration(
                color: const Color(0xFFfef3c7),
                borderRadius: BorderRadius.circular(4),
              ),
              child: Text(
                'BETA',
                style: TextStyle(
                  fontSize: 9,
                  fontWeight: FontWeight.w900,
                  fontVariations: ggWght(FontWeight.w900),
                  color: Color(0xFF92400e),
                ),
              ),
            ),
          ],
        ),
        actions: [
          if (_initialized)
            TextButton(
              onPressed: _runExtractor,
              child: const Text('Preview orders'),
            ),
          signOutAction(context),
        ],
      ),
      body: Column(
        children: [
          Container(
            width: double.infinity,
            color: const Color(0xFFfef3c7),
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            child: Text(
              '⚠️  Preview only — this checks visible orders but does not import receipts yet.',
              style: TextStyle(
                fontSize: 11,
                color: Color(0xFF92400e),
                fontWeight: FontWeight.w700,
                fontVariations: ggWght(FontWeight.w700),
              ),
            ),
          ),
          Container(
            color: const Color(0xFFf0fdf4),
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            child: Row(
              children: [
                const Icon(
                  Icons.lock_outline,
                  size: 14,
                  color: Color(0xFF065f46),
                ),
                const SizedBox(width: 6),
                Expanded(
                  child: Text(
                    _status,
                    style: TextStyle(
                      fontSize: 11,
                      color: Color(0xFF065f46),
                      fontWeight: FontWeight.w700,
                      fontVariations: ggWght(FontWeight.w700),
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
          ),
          Expanded(
            child: _initialized
                ? WebViewWidget(controller: _controller)
                : const Center(child: CircularProgressIndicator()),
          ),
        ],
      ),
    );
  }
}
