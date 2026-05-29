// Resolve a store name to a brand logo URL. Mirrors web's
// `lib/store-logo.js` so the same merchant renders the same
// favicon across both surfaces.
//
// Strategy:
//   1. Curated domain map for the top US grocers + big-box stores
//      (Costco, Walmart, Target, etc.) — receipt-name variants
//      collapse to one entry.
//   2. Best-effort guess for anything else: clean the name down
//      to letters/digits and append ".com". Google's favicon CDN
//      returns a 404-image for unknown domains; the consumer
//      treats a load error as "fall back to emoji/icon".
//   3. null when no domain can be inferred.

const _knownDomains = <String, String>{
  'costco':          'costco.com',
  'costcowholesale': 'costco.com',
  'walmart':         'walmart.com',
  'target':          'target.com',
  'wholefoods':      'wholefoodsmarket.com',
  'kroger':          'kroger.com',
  'traderjoes':      'traderjoes.com',
  'aldi':            'aldi.us',
  'publix':          'publix.com',
  'safeway':         'safeway.com',
  'albertsons':      'albertsons.com',
  'heb':             'heb.com',
  'meijer':          'meijer.com',
  'wegmans':         'wegmans.com',
  'sams':            'samsclub.com',
  'samsclub':        'samsclub.com',
  'bjs':             'bjs.com',
  'cvs':             'cvs.com',
  'walgreens':       'walgreens.com',
  'riteaid':         'riteaid.com',
  'homedepot':       'homedepot.com',
  'lowes':           'lowes.com',
  'bestbuy':         'bestbuy.com',
  'microcenter':     'microcenter.com',
  'amazon':          'amazon.com',
  'ebay':            'ebay.com',
  'doordash':        'doordash.com',
  'ubereats':        'ubereats.com',
  'instacart':       'instacart.com',
  'starbucks':       'starbucks.com',
  'dunkin':          'dunkindonuts.com',
  'mcdonalds':       'mcdonalds.com',
  'chipotle':        'chipotle.com',
  'netflix':         'netflix.com',
  'spotify':         'spotify.com',
};

String _normalizeKey(String name) {
  final lower = name.toLowerCase();
  final buf = StringBuffer();
  for (final ch in lower.codeUnits) {
    if ((ch >= 0x30 && ch <= 0x39) || (ch >= 0x61 && ch <= 0x7A)) {
      buf.writeCharCode(ch);
    }
  }
  return buf.toString();
}

String? _guessDomain(String name) {
  // Strip obvious suffixes + store numbers, collapse to alpha+digits.
  var cleaned = name.toLowerCase();
  for (final suffix in const [
    'wholesale', 'pharmacy', 'supermarket', 'grocery', 'store',
    'inc', 'llc', 'corp', 'co', 'the',
  ]) {
    cleaned = cleaned.replaceAll(RegExp(r'\b' + suffix + r'\b'), '');
  }
  cleaned = cleaned.replaceAll(RegExp(r'#\s*\d+'), '');
  cleaned = cleaned.replaceAll(RegExp(r'[^a-z0-9]+'), '');
  cleaned = cleaned.replaceAll(RegExp(r'\d+$'), '');
  cleaned = cleaned.trim();
  if (cleaned.isEmpty || cleaned.length < 3) return null;
  return '$cleaned.com';
}

/// Return a logo URL for the given store name. Null when we can't
/// guess a domain at all (consumer should render fallback icon).
///
/// Uses Google's favicons endpoint — same provider as web. Free, no
/// rate limit, served from Google's CDN. The 128-pixel size produces
/// a sharp image at typical avatar sizes (40-64px on phone screens).
String? logoUrlForStore(String? storeName) {
  if (storeName == null || storeName.isEmpty) return null;
  final key = _normalizeKey(storeName);
  if (key.isEmpty) return null;
  final domain = _knownDomains[key] ?? _guessDomain(storeName);
  if (domain == null) return null;
  return 'https://www.google.com/s2/favicons?domain=$domain&sz=128';
}
