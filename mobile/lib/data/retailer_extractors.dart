// Per-retailer DOM extractors for the credential-linking flow.
//
// Each entry knows:
//   - the login URL the WebView should open
//   - how to recognize that the user has landed on the orders page
//   - a JavaScript blob that, when executed in the rendered orders
//     page, returns a JSON string of { orders: [{ order_id, ... }] }
//
// We never run code that reads form fields, intercepts keystrokes,
// or touches cookies directly. The extractor walks the DOM that's
// already visible to the signed-in user — same data a screen-reader
// would surface.
//
// The current mobile experience is explicitly preview-only. Do not claim an
// import occurred until a reviewed backend ingestion contract is implemented.

class RetailerExtractor {
  /// Where the WebView should land first.
  final String loginUrl;
  final Set<String> allowedHosts;

  /// Predicate that recognizes the user has reached an orders page.
  final bool Function(String url) isOrdersPage;

  /// JavaScript executed against the rendered orders page. Should
  /// `return JSON.stringify({orders:[...]})`.
  final String extractScript;
  const RetailerExtractor({
    required this.loginUrl,
    required this.allowedHosts,
    required this.isOrdersPage,
    required this.extractScript,
  });
}

final Map<String, RetailerExtractor> retailerExtractors = {
  // Amazon — start here because the orders page is the most consistently
  // structured of the big retailers (Walmart + Costco are heavily JS-
  // rendered and behind aggressive bot detection).
  //
  // Selectors below target the .order-card structure on
  // amazon.com/gp/your-account/order-history. The retailer changes
  // this HTML occasionally; when it breaks, update these selectors.
  'amazon': RetailerExtractor(
    loginUrl: 'https://www.amazon.com/gp/your-account/order-history',
    allowedHosts: const {'amazon.com', 'www.amazon.com'},
    isOrdersPage: (url) =>
        url.contains('order-history') || url.contains('your-orders'),
    extractScript: r'''
      (() => {
        const orders = [];
        // Cards on /gp/your-account/order-history. Each .order-card
        // is one order; .a-box-group inside contains the items.
        document.querySelectorAll('.order-card, .order').forEach(card => {
          const order = {
            order_id: '',
            date: '',
            total: '',
            items: [],
          };
          // Order ID is in a "Order # XXX-XXXXXXX-XXXXXXX" string.
          const idMatch = card.textContent.match(/[A-Z0-9]{3}-\d{7}-\d{7}/);
          if (idMatch) order.order_id = idMatch[0];
          // Date — first "Order placed" / "Ordered on" string.
          const dateRow = card.querySelector('.order-info, .a-fixed-right-grid-col');
          if (dateRow) {
            const dateMatch = dateRow.textContent.match(/[A-Z][a-z]+ \d{1,2},? \d{4}/);
            if (dateMatch) order.date = dateMatch[0];
          }
          // Total — any "$XX.XX" inside the header row.
          const totMatch = (dateRow?.textContent || '').match(/\$([\d,]+\.\d{2})/);
          if (totMatch) order.total = totMatch[1].replace(/,/g, '');
          // Item titles
          card.querySelectorAll('.yohtmlc-product-title, .a-link-normal').forEach(a => {
            const name = a.textContent?.trim();
            if (name && name.length > 4) order.items.push({ name });
          });
          if (order.order_id) orders.push(order);
        });
        return JSON.stringify({ orders });
      })();
    ''',
  ),
};
