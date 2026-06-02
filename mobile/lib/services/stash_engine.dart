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

Map<String?, int> categoryCounts(List<StashItem> items) {
  final m = <String?, int>{};
  for (final it in items) {
    m[it.category] = (m[it.category] ?? 0) + 1;
  }
  return m;
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
