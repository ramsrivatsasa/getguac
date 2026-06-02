// Stash aggregation engine — Dart port of web/src/lib/stashEngine.js.
//
// Pure functions only — same input rows produce the same output list
// on both platforms. The fixture suite at
// test-fixtures/stash-scenarios.json asserts this.
//
// Input rows are typed loosely (Map<String, dynamic>) because they
// come straight off Supabase as decoded JSON. Mirrors the web side
// where the same rows arrive as plain objects.

class StashItem {
  String key;
  String name;
  String? sku;
  String? category;
  int qty;
  double totalSpent;
  int timesBought;
  String lastDate;
  String lastReceiptId;
  double lastPrice;
  String lastStore;
  List<int> ratings;
  int ratingCount;
  int ratingSum;
  int? ratingMax;
  double? ratingAvg;
  List<String> stores;
  int storeCount;
  StashItem({
    required this.key,
    required this.name,
    this.sku,
    this.category,
    this.qty = 0,
    this.totalSpent = 0,
    this.timesBought = 0,
    this.lastDate = '',
    this.lastReceiptId = '',
    this.lastPrice = 0,
    this.lastStore = '',
    List<int>? ratings,
    this.ratingCount = 0,
    this.ratingSum = 0,
    this.ratingMax,
    this.ratingAvg,
    List<String>? stores,
    this.storeCount = 0,
  })  : ratings = ratings ?? <int>[],
        stores = stores ?? <String>[];
}

String normalizeKey(Object? s) =>
    (s ?? '').toString().toLowerCase().trim();

/// Aggregate raw `receipt_items` rows into Stash items.
///
/// Same filter + grouping rules as web:
///   - returned == true → excluded
///   - receipts.from_statement == true → excluded
///   - empty item_name → excluded
///   - group by (sku || name).toLowerCase().trim()
List<StashItem> aggregateStashItems(List<Map<String, dynamic>> rows) {
  final byKey = <String, StashItem>{};
  for (final r in rows) {
    if (r['returned'] == true) continue;
    final receipts = r['receipts'];
    if (receipts is Map && receipts['from_statement'] == true) continue;
    final rawName = ((r['item_name'] ?? '') as Object?).toString().trim();
    if (rawName.isEmpty) continue;

    final sku = (r['sku'] as String?)?.trim();
    final key = normalizeKey(sku != null && sku.isNotEmpty ? sku : rawName);
    final qty = _toInt(r['qty'], 1);
    final price = _toDouble(r['price'], 0);
    final date = (receipts is Map ? receipts['date'] : '').toString();
    final rid = (r['receipt_id'] ?? '').toString();
    final store = (receipts is Map ? receipts['store_name'] : '').toString();
    final rating = r['rating'] == null ? null : _toInt(r['rating'], null);
    final category = (r['category'] as String?) ??
        (receipts is Map ? receipts['category'] as String? : null);

    var item = byKey[key];
    if (item == null) {
      item = StashItem(
        key: key,
        name: rawName,
        sku: sku,
        category: category,
      );
      byKey[key] = item;
    }
    item.qty += qty;
    item.totalSpent += price * qty;
    item.timesBought += 1;
    if (rating != null) {
      item.ratings.add(rating);
      item.ratingCount += 1;
      item.ratingSum += rating;
      item.ratingMax = item.ratingMax == null
          ? rating
          : (rating > item.ratingMax! ? rating : item.ratingMax);
    }
    if (store.isNotEmpty && !item.stores.contains(store)) {
      item.stores.add(store);
    }
    if (date.isNotEmpty && date.compareTo(item.lastDate) > 0) {
      item.lastDate = date;
      item.lastReceiptId = rid;
      item.lastPrice = price;
      item.lastStore = store;
      if (category != null) item.category = category;
    } else if (item.category == null && category != null) {
      item.category = category;
    }
  }
  for (final item in byKey.values) {
    item.storeCount = item.stores.length;
    if (item.ratingCount > 0) {
      item.ratingAvg = item.ratingSum / item.ratingCount;
    }
  }
  return byKey.values.toList();
}

enum StashSort { recent, alpha, spent, qty }

List<StashItem> sortStash(List<StashItem> items, [StashSort sort = StashSort.recent]) {
  final arr = List<StashItem>.from(items);
  switch (sort) {
    case StashSort.alpha:
      arr.sort((a, b) => a.name.toLowerCase().compareTo(b.name.toLowerCase()));
      break;
    case StashSort.spent:
      arr.sort((a, b) => b.totalSpent.compareTo(a.totalSpent));
      break;
    case StashSort.qty:
      arr.sort((a, b) => b.qty.compareTo(a.qty));
      break;
    case StashSort.recent:
      arr.sort((a, b) => b.lastDate.compareTo(a.lastDate));
      break;
  }
  return arr;
}

List<StashItem> filterStash(
  List<StashItem> items, {
  String query = '',
  String? category,
}) {
  final q = query.trim().toLowerCase();
  return items.where((it) {
    if (category != null && it.category != category) return false;
    if (q.isEmpty) return true;
    if (it.name.toLowerCase().contains(q)) return true;
    if (it.sku != null && it.sku!.toLowerCase().contains(q)) return true;
    return false;
  }).toList();
}

/// Human-readable purchase-frequency label for the card.
/// Mirrors web/src/lib/stashEngine.js#formatPurchaseFrequency.
String formatPurchaseFrequency(int timesBought, String? firstDate, String? lastDate) {
  if (timesBought <= 0) return '';
  if (timesBought == 1) return 'First buy';
  if (timesBought == 2 || firstDate == null || lastDate == null || firstDate.isEmpty || lastDate.isEmpty || firstDate == lastDate) {
    return 'Bought $timesBought×';
  }
  final t0 = DateTime.tryParse(firstDate);
  final t1 = DateTime.tryParse(lastDate);
  if (t0 == null || t1 == null || !t1.isAfter(t0)) {
    return 'Bought $timesBought×';
  }
  final days = (t1.difference(t0).inSeconds / 86400 / (timesBought - 1)).round();
  if (days < 1)   return 'Almost daily';
  if (days < 7)   return 'Every ~${days}d';
  if (days < 14)  return 'Weekly';
  if (days < 30)  return 'Every ~${days}d';
  if (days < 60)  return 'Monthly';
  if (days < 90)  return 'Every ~${(days / 7).round()}w';
  if (days < 180) return 'Quarterly';
  if (days < 365) return 'Every ~${(days / 30).round()}mo';
  return 'Rare buy';
}

Map<String?, int> categoryCounts(List<StashItem> items) {
  final m = <String?, int>{};
  for (final it in items) {
    m[it.category] = (m[it.category] ?? 0) + 1;
  }
  return m;
}

/// Group items into { category-slug → items[] } buckets, each
/// internally sorted by the same key as the top-level sort.
/// Items without a category go under '__uncategorized__'.
Map<String, List<StashItem>> groupByCategory(
  List<StashItem> items, [
  StashSort sort = StashSort.recent,
]) {
  final groups = <String, List<StashItem>>{};
  for (final it in items) {
    final k = it.category ?? '__uncategorized__';
    groups.putIfAbsent(k, () => []).add(it);
  }
  for (final entry in groups.entries) {
    groups[entry.key] = sortStash(entry.value, sort);
  }
  return groups;
}

enum StashShape { flat, accordion }
enum StashView { grid, list, accordion }

class StashViewResult {
  final StashShape shape;
  final List<StashItem> items;
  final Map<String, List<StashItem>> groups;
  final int totalShown;
  const StashViewResult({
    required this.shape,
    this.items = const [],
    this.groups = const {},
    required this.totalShown,
  });
}

/// === CENTRAL VIEW SELECTOR ===
/// Mirrors web's selectStashView. Rules:
///   - SEARCH IS GLOBAL — when query is set, ignore the category
///     filter so users can find any item without picking the right
///     pill first.
///   - ACCORDION ONLY ON "ALL" — picking a specific category implies
///     a flat list. So accordion view falls back to flat.
///   - SEARCH NEVER ACCORDIONS — results are always flat.
StashViewResult selectStashView(
  List<StashItem> items, {
  StashSort sort = StashSort.recent,
  String search = '',
  String? category,           // null/'all' = no category filter
  StashView view = StashView.grid,
}) {
  final hasSearch = search.trim().isNotEmpty;
  final effectiveCategory = hasSearch
      ? null
      : (category != null && category != 'all' ? category : null);
  final filtered = filterStash(items, query: search, category: effectiveCategory);

  if (view == StashView.accordion && effectiveCategory == null && !hasSearch) {
    return StashViewResult(
      shape: StashShape.accordion,
      groups: groupByCategory(filtered, sort),
      totalShown: filtered.length,
    );
  }
  return StashViewResult(
    shape: StashShape.flat,
    items: sortStash(filtered, sort),
    totalShown: filtered.length,
  );
}

int _toInt(Object? v, int? fallback) {
  if (v == null) return fallback ?? 0;
  if (v is int) return v;
  return int.tryParse(v.toString()) ?? (fallback ?? 0);
}

double _toDouble(Object? v, double fallback) {
  if (v == null) return fallback;
  if (v is num) return v.toDouble();
  return double.tryParse(v.toString()) ?? fallback;
}
