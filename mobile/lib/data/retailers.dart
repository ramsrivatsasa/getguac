// Retailer catalog — Dart mirror of web/src/lib/retailers.js.
// Keep the IDs and structure in sync; mobile + web read the same
// canonical list of retailers for the Connections screen.

class Retailer {
  final String id;
  final String name;
  final String color;        // hex, used for the logo tile when no favicon
  final String? domain;
  final String? receiptDomain;
  final String category;
  final List<String> setupSteps;
  final bool captureOnly;
  const Retailer({
    required this.id, required this.name, required this.color,
    this.domain, this.receiptDomain, required this.category,
    required this.setupSteps, this.captureOnly = false,
  });
}

const kRetailers = <Retailer>[
  Retailer(
    id: 'walmart', name: 'Walmart', color: '#0071ce',
    domain: 'walmart.com', receiptDomain: 'walmart.com', category: 'grocery',
    setupSteps: [
      'Open the Walmart app or sign in at walmart.com',
      'Tap your account icon → "Account settings"',
      'Find "Communication preferences" or "Receipt delivery"',
      'Enable "Email me my receipts" and enter your GetGuac alias',
      'Save — future Walmart receipts will land in your Inbox',
    ],
  ),
  Retailer(
    id: 'target', name: 'Target', color: '#cc0000',
    domain: 'target.com', receiptDomain: 'target.com', category: 'grocery',
    setupSteps: [
      'Sign in to target.com (or open the Target app)',
      'Go to Account → Settings',
      'Open "Communication preferences"',
      'Add your GetGuac alias as a receipt-delivery email',
      'Confirm via the verification email Target sends',
    ],
  ),
  Retailer(
    id: 'costco', name: 'Costco', color: '#e23744',
    domain: 'costco.com', receiptDomain: 'costco.com', category: 'wholesale',
    setupSteps: [
      'Sign in to costco.com → "Account"',
      'Open "Email preferences"',
      'Enable "Email me my receipts" (warehouse + online)',
      'Set the receipt destination to your GetGuac alias',
      'Receipts will arrive after every warehouse + online purchase',
    ],
  ),
  Retailer(
    id: 'sams_club', name: "Sam's Club", color: '#0067a0',
    domain: 'samsclub.com', receiptDomain: 'samsclub.com', category: 'wholesale',
    setupSteps: [
      'Sign in to samsclub.com',
      'Open Account → "Email & receipt preferences"',
      'Toggle "Email me my receipts"',
      'Enter your GetGuac alias as the destination',
    ],
  ),
  Retailer(
    id: 'amazon', name: 'Amazon', color: '#ff9900',
    domain: 'amazon.com', receiptDomain: 'amazon.com', category: 'ecommerce',
    setupSteps: [
      'Amazon sends order confirmations to your account email by default',
      'Set up a forwarding rule in your inbox:',
      '  → Filter: From "auto-confirm@amazon.com" OR "no-reply@amazon.com"',
      '  → Action: Forward to your GetGuac alias',
      'New Amazon orders will start parsing into receipts',
    ],
  ),
  Retailer(
    id: 'instacart', name: 'Instacart', color: '#0aad0a',
    domain: 'instacart.com', receiptDomain: 'instacart.com', category: 'grocery-delivery',
    setupSteps: [
      'Open Instacart → Account → Settings',
      'Under "Email preferences", enable "Email me my receipts"',
      'Set the delivery address to your GetGuac alias',
    ],
  ),
  Retailer(
    id: 'safeway', name: 'Safeway', color: '#d40029',
    domain: 'safeway.com', receiptDomain: 'safeway.com', category: 'grocery',
    setupSteps: [
      'Sign in to safeway.com or the Albertsons app',
      'Open Account → "Communication preferences"',
      'Enable "Email receipts"',
      'Use your GetGuac alias as the destination',
      "Make sure your loyalty number is on file — Safeway only emails receipts when you scan it at checkout",
    ],
  ),
  Retailer(
    id: 'trader_joes', name: "Trader Joe's", color: '#b1112a',
    domain: 'traderjoes.com', receiptDomain: null, category: 'grocery',
    captureOnly: true,
    setupSteps: [
      "Trader Joe's doesn't offer emailed receipts as of 2026",
      'Snap each receipt with the camera in GetGuac — it parses item-by-item',
      "We'll surface a 'TJ' badge on captured receipts so you can find them easily",
    ],
  ),
  Retailer(
    id: 'whole_foods', name: 'Whole Foods', color: '#365e1e',
    domain: 'wholefoodsmarket.com', receiptDomain: 'amazon.com', category: 'grocery',
    setupSteps: [
      'Whole Foods receipts arrive via Amazon if you scanned your Amazon account at checkout',
      'Set up the Amazon forwarding rule (see Amazon entry above)',
      'WFM-specific receipts will route through the same path',
    ],
  ),
  Retailer(
    id: 'kroger', name: 'Kroger', color: '#0070c0',
    domain: 'kroger.com', receiptDomain: 'kroger.com', category: 'grocery',
    setupSteps: [
      'Sign in to kroger.com → Account → "Communication preferences"',
      'Enable "Email digital receipts"',
      'Set the destination to your GetGuac alias',
      'Use your loyalty card at checkout — emailed receipts only fire when the card is scanned',
    ],
  ),
  Retailer(
    id: 'best_buy', name: 'Best Buy', color: '#0046be',
    domain: 'bestbuy.com', receiptDomain: 'bestbuy.com', category: 'electronics',
    setupSteps: [
      'Sign in to bestbuy.com → Account → "Communication preferences"',
      'Enable "Email me my receipts"',
      'Use your GetGuac alias',
      'In-store receipts: tell the cashier your My Best Buy email is the GetGuac alias',
    ],
  ),
  Retailer(
    id: 'home_depot', name: 'Home Depot', color: '#f96302',
    domain: 'homedepot.com', receiptDomain: 'homedepot.com', category: 'home-improvement',
    setupSteps: [
      'Sign in to homedepot.com → "Pro Xtra" or main account',
      'Open Account → "Receipts"',
      'Enable digital-receipt delivery to your GetGuac alias',
      'Use the Pro Xtra phone number at checkout to associate in-store buys',
    ],
  ),
];
