// Dart mirror of web/src/lib/store-name-normalize.js — kept in sync by hand.
// Used by the dashboard's Spending by Store chart so "COSTCO WHOLESALE",
// "Costco", and "Costco #218" all roll into one Costco bar, matching the
// web /dashboard chart and the stores-table dedup behaviour.

const Map<String, String> _aliases = {
  'amazon':                  'Amazon',
  'amazon prime':            'Amazon',
  'amazon marketplace':      'Amazon',
  'amazon mktplace':         'Amazon',
  'amazon mktp':             'Amazon',
  'amazon services':         'Amazon',
  'amzn mktp':               'Amazon',
  'amzn':                    'Amazon',
  'home depot':              'The Home Depot',
  'homedepot':               'The Home Depot',
  'lowes':                   "Lowe's",
  'lowes home improvement':  "Lowe's",
  'walmart':                 'Walmart',
  'wal mart':                'Walmart',
  'wm supercenter':          'Walmart',
  'target':                  'Target',
  'costco':                  'Costco',
  'costco wholesale':        'Costco',
  'bjs':                     "BJ's Wholesale",
  'bjs wholesale':           "BJ's Wholesale",
  'bjs wholesale club':      "BJ's Wholesale",
  'sams club':               "Sam's Club",
  'starbucks':               'Starbucks',
  'starbucks coffee':        'Starbucks',
  'taco bell':               'Taco Bell',
  'mcdonalds':               "McDonald's",
  'chipotle':                'Chipotle',
  'chipotle mexican grill':  'Chipotle',
  'cvs':                     'CVS Pharmacy',
  'cvs pharmacy':            'CVS Pharmacy',
  'walgreens':               'Walgreens',
  'usps':                    'USPS',
  'us postal service':       'USPS',
  'fedex':                   'FedEx',
  'ups':                     'UPS',
  'uber':                    'Uber',
  'uber eats':               'Uber Eats',
  'doordash':                'DoorDash',
  'instacart':               'Instacart',
  'netflix':                 'Netflix',
  'spotify':                 'Spotify',
  'apple':                   'Apple',
  'apple com bill':          'Apple',
  'google':                  'Google',
  'google storage':          'Google',
  'microsoft':               'Microsoft',
  'ionos':                   'IONOS',
  '1and1 ionos':             'IONOS',
  '1 and 1 ionos':           'IONOS',
};

/// Produce a comparison key for a store name. Two names yield the SAME key
/// iff they refer to the same merchant.
String normalizeStoreName(String? raw) {
  if (raw == null) return '';
  String s = raw.trim().toLowerCase();
  if (s.isEmpty) return '';
  // Strip URL TLD suffixes ("amazon.com" → "amazon").
  s = s.replaceAll(RegExp(r'\.(com|net|org|co|io|us|app)\b'), '');
  // Strip business-entity suffixes ("acme llc" → "acme").
  s = s.replaceAll(RegExp(r'[,\s]+(inc|llc|ltd|l\.l\.c|corp|company|corporation|holdings|gmbh|s\.a|ag)\.?\s*$'), '');
  // Drop apostrophes, periods, commas, quotes.
  s = s.replaceAll(RegExp(r'''[.,'`"]'''), '');
  // Hyphens become spaces.
  s = s.replaceAll(RegExp(r'[-/_]+'), ' ');
  // Strip leading "the ".
  s = s.replaceAll(RegExp(r'^the\s+'), '');
  // Collapse whitespace.
  s = s.replaceAll(RegExp(r'\s+'), ' ').trim();
  return s;
}

/// Best display form for a merchant. Falls back to the trimmed original
/// when no alias is known.
String canonicalStoreName(String? raw) {
  if (raw == null) return '';
  final key = normalizeStoreName(raw);
  if (_aliases.containsKey(key)) return _aliases[key]!;
  return raw.trim();
}

/// Two store names refer to the same merchant?
bool isSameStore(String? a, String? b) {
  final na = normalizeStoreName(a);
  final nb = normalizeStoreName(b);
  return na.isNotEmpty && na == nb;
}
