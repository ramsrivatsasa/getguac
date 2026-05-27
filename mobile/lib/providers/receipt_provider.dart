import 'dart:async';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../models/receipt_model.dart';

const _kReceiptListCols =
    'id, store_name, date, total_amount, tax_paid, reward_no, '
    'receipt_link, business_purchase, processed, category, rating, '
    'from_statement, statement_source, reconciled, is_return, '
    'receipt_items(count)';

/// Period filter applied at the DB level so we only pull the receipts the
/// user actually needs. Smaller payload = faster screen.
enum ReceiptPeriod {
  month,      // last 30 days  — default; covers ~90% of routine browsing
  threeMonth, // last 90 days
  sixMonth,   // last 180 days
  year,       // last 365 days
  all,        // no cutoff (still capped at 1000)
}

extension ReceiptPeriodX on ReceiptPeriod {
  String get label => switch (this) {
    ReceiptPeriod.month       => '1M',
    ReceiptPeriod.threeMonth  => '3M',
    ReceiptPeriod.sixMonth    => '6M',
    ReceiptPeriod.year        => '1Y',
    ReceiptPeriod.all         => 'All',
  };
  Duration? get duration => switch (this) {
    ReceiptPeriod.month      => const Duration(days: 30),
    ReceiptPeriod.threeMonth => const Duration(days: 90),
    ReceiptPeriod.sixMonth   => const Duration(days: 180),
    ReceiptPeriod.year       => const Duration(days: 365),
    ReceiptPeriod.all        => null,
  };
  // Per-period row caps. Default (1M) is intentionally tiny so the
  // receipts screen opens INSTANTLY on first paint — most users scroll
  // recent activity, not full history. Tapping 3M / 6M / 1Y / All loads
  // progressively more.
  int get limit => switch (this) {
    ReceiptPeriod.month      => 10,
    ReceiptPeriod.threeMonth => 200,
    ReceiptPeriod.sixMonth   => 400,
    ReceiptPeriod.year       => 800,
    ReceiptPeriod.all        => 1500,
  };
}

class ReceiptProvider extends ChangeNotifier {
  final _sb = Supabase.instance.client;
  List<Receipt> receipts = [];
  bool loading = false;
  DateTime? _lastLoaded;
  ReceiptPeriod _lastPeriod = ReceiptPeriod.month;
  ReceiptPeriod get currentPeriod => _lastPeriod;

  /// Loads receipts scoped to [period]. Cached if the same period was loaded
  /// in the last [maxAge]. Pass `force: true` to refetch.
  Future<void> loadReceipts({
    ReceiptPeriod period = ReceiptPeriod.month,
    bool force = false,
    Duration maxAge = const Duration(seconds: 60),
  }) async {
    if (loading) return;
    // Cache hit: same period AND fresh
    if (!force
        && _lastPeriod == period
        && _lastLoaded != null
        && DateTime.now().difference(_lastLoaded!) < maxAge
        && receipts.isNotEmpty) {
      return;
    }

    loading = true;
    notifyListeners();
    try {
      var query = _sb.from('receipts').select(_kReceiptListCols);
      if (period.duration != null) {
        final cutoff = DateTime.now().subtract(period.duration!);
        query = query.gte('date', cutoff.toIso8601String().substring(0, 10));
      }
      final data = await query.order('date', ascending: false).limit(period.limit);
      receipts = (data as List)
          .map((d) => Receipt.fromMap(d['id'] as String, d as Map<String, dynamic>))
          .toList();
      _lastLoaded = DateTime.now();
      _lastPeriod = period;
    } catch (e) {
      if (kDebugMode) debugPrint('loadReceipts error: $e');
      rethrow;
    } finally {
      loading = false;
      notifyListeners();
    }
  }

  Future<String> uploadImage(File file) async {
    final uid = _sb.auth.currentUser!.id;
    final path = '$uid/${DateTime.now().millisecondsSinceEpoch}_${file.path.split('/').last}';
    await _sb.storage.from('receipts').upload(path, file);
    return _sb.storage.from('receipts').getPublicUrl(path);
  }

  /// Look for an existing receipt that matches the supplied (store, date,
  /// total) tuple — same key the /api/receipts/dedup sweep uses. Returns
  /// the matching receipt row (or null). Lets the camera flow ask the user
  /// "this looks like a duplicate, save anyway?" before inserting.
  ///
  /// Matching tolerance:
  ///   - store name is normalized (lowercased, punctuation/whitespace
  ///     stripped, common suffixes like "Restaurant" / "Inc" / "LLC"
  ///     dropped) before comparing. Catches cases where the AI parsed
  ///     "GLORY DAYS GRILL" on one shot and "Glory Days Grill Restaurant"
  ///     on a retake — both still resolve to the same key.
  ///   - date must match exactly (single day).
  ///   - total must match within 1¢ (rounding wobble).
  Future<Receipt?> findDuplicate({
    required String storeName,
    required String date,        // YYYY-MM-DD
    required double totalAmount,
  }) async {
    final uid = _sb.auth.currentUser?.id;
    if (uid == null || storeName.trim().isEmpty || date.isEmpty) return null;
    try {
      // Pull every receipt for the user on this exact date with a total
      // within 1 cent of the parsed total, then filter on normalized store
      // name client-side. Keeps the SQL simple (no normalization functions
      // in Postgres) and the result set is tiny (usually 0-1 rows).
      final lo = totalAmount - 0.005;
      final hi = totalAmount + 0.005;
      final rows = await _sb
          .from('receipts')
          .select(_kReceiptListCols)
          .eq('user_id', uid)
          .eq('date', date)
          .gte('total_amount', lo)
          .lte('total_amount', hi)
          .limit(10);
      final target = _normalizeStoreName(storeName);
      for (final r in (rows as List)) {
        final m = r as Map<String, dynamic>;
        final candidate = _normalizeStoreName((m['store_name'] as String?) ?? '');
        if (candidate.isEmpty) continue;
        if (candidate == target
            || candidate.contains(target)
            || target.contains(candidate)) {
          return Receipt.fromMap(m['id'] as String, m);
        }
      }
      return null;
    } catch (e) {
      if (kDebugMode) debugPrint('findDuplicate error: $e');
      return null;
    }
  }

  /// Same normalization the dedup sweep should use server-side. Lowercase,
  /// strip punctuation/whitespace, drop common store-name suffixes that the
  /// AI inconsistently includes.
  static String _normalizeStoreName(String raw) {
    var s = raw.toLowerCase().trim();
    s = s.replaceAll(RegExp(r'[^a-z0-9]'), '');
    // Drop common business-type suffixes the AI sometimes appends.
    for (final suffix in const ['restaurant', 'grill', 'cafe', 'inc', 'llc', 'corp', 'co']) {
      if (s.endsWith(suffix) && s.length > suffix.length + 2) {
        s = s.substring(0, s.length - suffix.length);
      }
    }
    return s;
  }

  Future<void> addReceipt(Receipt receipt, {File? imageFile}) async {
    String link = receipt.receiptLink;
    if (imageFile != null) link = await uploadImage(imageFile);
    await _sb.from('receipts').insert({
      ...receipt.toMap(),
      'receipt_link': link,
      'user_id': _sb.auth.currentUser!.id,
    });
    _lastLoaded = null;       // bust cache
    await loadReceipts(force: true);
  }

  /// Upload + insert a receipt straight from AI-parsed JSON (the shape the
  /// /api/parse-receipt endpoint returns). Saves items in the same call.
  /// Returns a record with either an `id` (success) or an `error` string
  /// explaining what failed. Used by the dashboard camera-FAB so the batch
  /// summary can show the real reason instead of "insert failed".
  Future<({String? id, String? error})> addParsedReceipt(Map<String, dynamic> parsed, File imageFile) async {
    final uid = _sb.auth.currentUser?.id;
    if (uid == null) return (id: null, error: 'Not signed in');
    String? link;
    try {
      link = await uploadImage(imageFile);
    } catch (e) {
      return (id: null, error: 'Image upload failed: $e');
    }
    try {
      final today = DateTime.now().toIso8601String().substring(0, 10);
      final dateField = (parsed['date'] is String &&
                        RegExp(r'^\d{4}-\d{2}-\d{2}').hasMatch(parsed['date'] as String))
          ? (parsed['date'] as String).substring(0, 10)
          : today;
      final row = await _sb.from('receipts').insert({
        'user_id': uid,
        'store_name': (parsed['store_name'] as String?)?.trim().isNotEmpty == true
            ? parsed['store_name']
            : 'Camera receipt',
        'date': dateField,
        'total_amount': (parsed['total_amount'] as num?)?.toDouble() ?? 0,
        'tax_paid':     (parsed['tax_paid']     as num?)?.toDouble() ?? 0,
        'payment_method': parsed['payment_method'],
        'payment_last4':  parsed['payment_last4'],
        'is_return':     parsed['is_return'] == true,
        'category':      parsed['category'],
        'receipt_link': link,
        'processed': true,
      }).select('id').single();
      final id = row['id'] as String;

      // Items, if the AI returned any.
      final items = (parsed['items'] as List?) ?? const [];
      if (items.isNotEmpty) {
        final rows = items.map((it) {
          final m = it as Map<String, dynamic>;
          return {
            'receipt_id': id,
            'sku': m['sku'],
            'model': m['model'],
            'item_name': (m['item_name'] as String?) ?? '',
            'qty': (m['qty'] as num?)?.toDouble() ?? 1,
            'price': m['price'] == null ? null : (m['price'] as num).toDouble(),
            'returned': m['returned'] == true,
            'category': m['category'],
          };
        }).toList();
        await _sb.from('receipt_items').insert(rows);
      }
      _lastLoaded = null;
      await loadReceipts(force: true);
      return (id: id, error: null);
    } on PostgrestException catch (e) {
      if (kDebugMode) debugPrint('addParsedReceipt postgrest: ${e.message} (${e.code})');
      // Surface the database's actual rejection reason. Most useful causes:
      // 23505 = unique constraint, 42501 = RLS denied, 23502 = NOT NULL.
      return (id: null, error: 'DB rejected: ${e.message}${e.code != null ? " (${e.code})" : ""}');
    } catch (e) {
      if (kDebugMode) debugPrint('addParsedReceipt error: $e');
      return (id: null, error: e.toString());
    }
  }

  Future<void> updateReceipt(String id, Map<String, dynamic> data) async {
    await _sb.from('receipts').update(data).eq('id', id);
    _lastLoaded = null;
    await loadReceipts(force: true);
  }

  Future<void> deleteReceipt(String id) async {
    await _sb.from('receipts').delete().eq('id', id);
    receipts.removeWhere((r) => r.id == id);
    // Force a refetch on the next consumer pull so the dashboard's
    // "Spending by Store" / category aggregates can't show stale rows
    // (user report: deleted Glory Days but the bar kept showing). Bumping
    // _lastLoaded to null guarantees the cached-period guard misses on the
    // next loadReceipts() call.
    _lastLoaded = null;
    notifyListeners();
    // Also issue a force-load so the receipts list itself reflects the
    // delete the moment the next screen rebuilds — fire-and-forget to
    // keep deletion fast.
    unawaited(loadReceipts(force: true));
  }

  Future<List<ReceiptItem>> getItems(String receiptId) async {
    final data = await _sb.from('receipt_items').select().eq('receipt_id', receiptId);
    return (data as List).map((d) => ReceiptItem.fromMap(d['id'] as String, d as Map<String, dynamic>)).toList();
  }

  Future<void> addItem(String receiptId, ReceiptItem item) async {
    await _sb.from('receipt_items').insert({...item.toMap(), 'receipt_id': receiptId});
  }

  Future<void> updateItem(String id, Map<String, dynamic> data) async {
    await _sb.from('receipt_items').update(data).eq('id', id);
  }
}
