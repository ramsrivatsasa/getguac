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
  // ── Grocery ──────────────────────────────────────────────────────
  Retailer(id: 'aldi', name: 'Aldi', color: '#00549f', domain: 'aldi.us', receiptDomain: 'aldi.us', category: 'grocery',
    setupSteps: [
      "Aldi US doesn't email per-receipt by default",
      'Sign in to aldi.us → "My account" → communication preferences',
      'Where available, enable emailed receipts to your GetGuac alias',
      'Falls back to camera capture for stores that print only',
    ]),
  Retailer(id: 'publix', name: 'Publix', color: '#007a33', domain: 'publix.com', receiptDomain: 'publix.com', category: 'grocery',
    setupSteps: [
      'Sign in to publix.com → My Account → Communication preferences',
      'Enable "Email digital receipts"',
      'Set destination to your GetGuac alias',
      'Use your Club Publix phone/loyalty number at checkout',
    ]),
  Retailer(id: 'heb', name: 'H-E-B', color: '#e2231a', domain: 'heb.com', receiptDomain: 'heb.com', category: 'grocery',
    setupSteps: [
      'Sign in to heb.com or the H-E-B app → Account → Settings',
      'Open "Communication preferences"',
      'Enable emailed receipts → use your GetGuac alias',
      'Use the H-E-B app at checkout to associate in-store buys',
    ]),
  Retailer(id: 'wegmans', name: 'Wegmans', color: '#c8102e', domain: 'wegmans.com', receiptDomain: 'wegmans.com', category: 'grocery',
    setupSteps: [
      'Sign in to wegmans.com or the Wegmans app',
      'Account → Email preferences',
      'Enable "Receipt emails" and set the alias as destination',
    ]),
  Retailer(id: 'stop_shop', name: 'Stop & Shop', color: '#e3000f', domain: 'stopandshop.com', receiptDomain: 'stopandshop.com', category: 'grocery',
    setupSteps: [
      'Sign in to stopandshop.com → Account',
      'Open "Communication preferences" → enable digital receipts',
      'Set destination to your GetGuac alias',
      'Scan your Stop & Shop card at every checkout',
    ]),
  Retailer(id: 'giant', name: 'Giant', color: '#ed1b2e', domain: 'giantfood.com', receiptDomain: 'giantfood.com', category: 'grocery',
    setupSteps: [
      'Sign in to giantfood.com (or Giant Eagle / Giant of Maryland depending on region)',
      'Account → Communication preferences → enable digital receipts',
      'Use the alias as destination',
    ]),
  Retailer(id: 'sprouts', name: 'Sprouts', color: '#5fa430', domain: 'sprouts.com', receiptDomain: 'sprouts.com', category: 'grocery',
    setupSteps: [
      'Sign in to sprouts.com or the Sprouts app',
      'Account → My Sprouts → emailed-receipt preference',
      'Set destination to your GetGuac alias',
    ]),
  Retailer(id: 'bjs', name: "BJ's Wholesale", color: '#003876', domain: 'bjs.com', receiptDomain: 'bjs.com', category: 'wholesale',
    setupSteps: [
      'Sign in to bjs.com → My Account → Preferences',
      'Enable digital receipts → use your GetGuac alias',
      "Use the BJ's app or membership card at checkout",
    ]),
  // ── Drugstore ────────────────────────────────────────────────────
  Retailer(id: 'cvs', name: 'CVS', color: '#cc0000', domain: 'cvs.com', receiptDomain: 'cvs.com', category: 'drugstore',
    setupSteps: [
      'Sign in to cvs.com → Account → ExtraCare',
      'Open "Communication preferences"',
      'Enable "Email me digital receipts"',
      'Set destination to your GetGuac alias',
      'Scan your ExtraCare card at every checkout',
    ]),
  Retailer(id: 'walgreens', name: 'Walgreens', color: '#e21a23', domain: 'walgreens.com', receiptDomain: 'walgreens.com', category: 'drugstore',
    setupSteps: [
      'Sign in to walgreens.com → Account → My Account',
      'Open Communication preferences',
      'Enable digital receipts → use your GetGuac alias',
    ]),
  Retailer(id: 'rite_aid', name: 'Rite Aid', color: '#00529c', domain: 'riteaid.com', receiptDomain: 'riteaid.com', category: 'drugstore',
    setupSteps: [
      'Sign in to riteaid.com → Account → Preferences',
      'Enable emailed receipts → use your GetGuac alias',
    ]),
  // ── Department / Apparel ─────────────────────────────────────────
  Retailer(id: 'macys', name: "Macy's", color: '#e21a2c', domain: 'macys.com', receiptDomain: 'macys.com', category: 'department',
    setupSteps: [
      "Sign in to macys.com → My Account → \"Receipt preferences\"",
      'Enable "Email me my receipts"',
      'Use your GetGuac alias as the destination',
    ]),
  Retailer(id: 'kohls', name: "Kohl's", color: '#5c2d91', domain: 'kohls.com', receiptDomain: 'kohls.com', category: 'department',
    setupSteps: [
      'Sign in to kohls.com → Account → Communication preferences',
      'Enable digital receipts → use your GetGuac alias',
      "Provide the email at checkout for Kohl's Cash tracking",
    ]),
  Retailer(id: 'nordstrom', name: 'Nordstrom', color: '#000000', domain: 'nordstrom.com', receiptDomain: 'nordstrom.com', category: 'department',
    setupSteps: [
      'Sign in to nordstrom.com → Account → Email preferences',
      'Enable digital receipts → use your GetGuac alias',
    ]),
  Retailer(id: 'tj_maxx', name: 'TJ Maxx', color: '#e4002b', domain: 'tjmaxx.tjx.com', receiptDomain: 'tjx.com', category: 'department',
    captureOnly: true,
    setupSteps: [
      "TJ Maxx (and Marshalls / HomeGoods / Sierra) don't currently email per-receipt",
      'Snap each receipt with the camera in GetGuac — Guac-AI handles the per-line parse',
    ]),
  Retailer(id: 'marshalls', name: 'Marshalls', color: '#0046ad', domain: 'marshalls.tjx.com', receiptDomain: null, category: 'department',
    captureOnly: true,
    setupSteps: [
      "Marshalls doesn't email receipts (TJX corporate policy)",
      'Camera-only — snap each receipt for AI parsing',
    ]),
  Retailer(id: 'ross', name: 'Ross', color: '#003594', domain: 'rossstores.com', receiptDomain: null, category: 'department',
    captureOnly: true,
    setupSteps: [
      "Ross doesn't email receipts — camera-only",
      'Snap each receipt; the per-line parse still works',
    ]),
  // ── Home ─────────────────────────────────────────────────────────
  Retailer(id: 'lowes', name: "Lowe's", color: '#004990', domain: 'lowes.com', receiptDomain: 'lowes.com', category: 'home-improvement',
    setupSteps: [
      'Sign in to lowes.com → My Account → MyLowes Rewards',
      'Open "Communication preferences"',
      'Enable digital receipts → use your GetGuac alias',
      'Provide the email or phone at checkout to link in-store buys',
    ]),
  Retailer(id: 'wayfair', name: 'Wayfair', color: '#7b189f', domain: 'wayfair.com', receiptDomain: 'wayfair.com', category: 'home',
    setupSteps: [
      'Wayfair order confirmations always go to your account email by default',
      'Set up a forwarding rule in your inbox:',
      '  → Filter: from "noreply@wayfair.com"',
      '  → Action: Forward to your GetGuac alias',
    ]),
  Retailer(id: 'ikea', name: 'IKEA', color: '#0058a3', domain: 'ikea.com', receiptDomain: 'ikea.com', category: 'home',
    setupSteps: [
      'Sign in to ikea.com → IKEA Family account',
      'Open Email preferences → enable digital receipts',
      'Set destination to your GetGuac alias',
      'Scan your IKEA Family card or app at checkout',
    ]),
  // ── Electronics / Office ─────────────────────────────────────────
  Retailer(id: 'apple', name: 'Apple', color: '#000000', domain: 'apple.com', receiptDomain: 'apple.com', category: 'electronics',
    setupSteps: [
      'Apple emails purchase receipts to your Apple ID email by default',
      'Set up forwarding from that inbox to your GetGuac alias:',
      '  → Filter: from "no_reply@email.apple.com" OR "do_not_reply@apple.com"',
      '  → Action: forward to your GetGuac alias',
    ]),
  Retailer(id: 'staples', name: 'Staples', color: '#cc0000', domain: 'staples.com', receiptDomain: 'staples.com', category: 'office',
    setupSteps: [
      'Sign in to staples.com → Account → Communication preferences',
      'Enable digital receipts → use your GetGuac alias',
      'Provide the email at in-store checkout for Easy Rewards tracking',
    ]),
  Retailer(id: 'office_depot', name: 'Office Depot', color: '#cc0000', domain: 'officedepot.com', receiptDomain: 'officedepot.com', category: 'office',
    setupSteps: [
      'Sign in to officedepot.com → My Account → Communication preferences',
      'Enable emailed receipts → use your GetGuac alias',
    ]),
  // ── Dollar stores ────────────────────────────────────────────────
  Retailer(id: 'dollar_tree', name: 'Dollar Tree', color: '#367e38', domain: 'dollartree.com', receiptDomain: null, category: 'discount',
    captureOnly: true,
    setupSteps: [
      "Dollar Tree doesn't email receipts — camera-only",
      'Snap each receipt; per-line parsing still works',
    ]),
  Retailer(id: 'dollar_general', name: 'Dollar General', color: '#fcc81c', domain: 'dollargeneral.com', receiptDomain: 'dollargeneral.com', category: 'discount',
    setupSteps: [
      'Sign in to dollargeneral.com or the DG app',
      'Account → My Account → Email preferences',
      'Enable digital receipts → use your GetGuac alias',
      'Use the DG app or DG Rewards card at checkout',
    ]),
  // ── Online marketplaces ──────────────────────────────────────────
  Retailer(id: 'ebay', name: 'eBay', color: '#e53238', domain: 'ebay.com', receiptDomain: 'ebay.com', category: 'ecommerce',
    setupSteps: [
      'eBay sends order confirmations to your account email by default',
      'Set up a forwarding rule:',
      '  → Filter: from "ebay@ebay.com" OR "ebay@reply.ebay.com"',
      '  → Action: Forward to your GetGuac alias',
    ]),
  Retailer(id: 'etsy', name: 'Etsy', color: '#f16521', domain: 'etsy.com', receiptDomain: 'etsy.com', category: 'ecommerce',
    setupSteps: [
      'Etsy sends order receipts to your account email',
      'Set up a forwarding rule:',
      '  → Filter: from "transaction@etsy.com"',
      '  → Action: Forward to your GetGuac alias',
    ]),
  // ── Restaurants / food delivery ──────────────────────────────────
  Retailer(id: 'doordash', name: 'DoorDash', color: '#ff3008', domain: 'doordash.com', receiptDomain: 'doordash.com', category: 'food-delivery',
    setupSteps: [
      'DoorDash emails delivery receipts to your account email',
      'Set up a forwarding rule:',
      '  → Filter: from "no-reply@doordash.com"',
      '  → Action: Forward to your GetGuac alias',
    ]),
  Retailer(id: 'uber_eats', name: 'Uber Eats', color: '#06c167', domain: 'ubereats.com', receiptDomain: 'uber.com', category: 'food-delivery',
    setupSteps: [
      'Uber + Uber Eats both email receipts from "uber.us@uber.com"',
      'Set up a forwarding rule with that as the filter',
      'Forward to your GetGuac alias',
    ]),
  Retailer(id: 'grubhub', name: 'Grubhub', color: '#f63440', domain: 'grubhub.com', receiptDomain: 'grubhub.com', category: 'food-delivery',
    setupSteps: [
      'Grubhub emails order receipts to your account email',
      'Set up a forwarding rule from "noreply@grubhub.com" → GetGuac alias',
    ]),
  Retailer(id: 'starbucks', name: 'Starbucks', color: '#006241', domain: 'starbucks.com', receiptDomain: 'starbucks.com', category: 'restaurant',
    setupSteps: [
      'Sign in to starbucks.com or the Starbucks app',
      'Account → Settings → Communication preferences',
      'Enable digital receipts → use your GetGuac alias',
      'Pay with the Starbucks app to associate every purchase',
    ]),
  // ── Gas ──────────────────────────────────────────────────────────
  Retailer(id: 'shell', name: 'Shell', color: '#fbce07', domain: 'shell.us', receiptDomain: 'shell.com', category: 'gas',
    setupSteps: [
      'Sign in to shellfuelrewards.com or the Shell app',
      'Open Account → Email preferences',
      'Enable digital receipts → use your GetGuac alias',
      'Use Fuel Rewards at the pump or in-store to associate buys',
    ]),
  Retailer(id: 'chevron', name: 'Chevron', color: '#005ba6', domain: 'chevron.com', receiptDomain: 'chevrontexacorewards.com', category: 'gas',
    setupSteps: [
      'Sign in to chevrontexacorewards.com',
      'Account → Communication preferences → enable emailed receipts',
      'Use your GetGuac alias as the destination',
    ]),
];
