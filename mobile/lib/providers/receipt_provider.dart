import 'dart:async';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../models/receipt_model.dart';
import '../services/receipt_outbox.dart';

const _kReceiptListCols =
    'id, store_name, date, total_amount, tax_paid, reward_no, '
    'receipt_link, extra_page_urls, business_purchase, processed, category, rating, '
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
  // Per-period row caps. Default (1M) opens the receipts screen quickly
  // without truncating real-world months — a household easily has 30-60
  // receipts/month, so 100 is the right ceiling. Bumping past this hurts
  // first-paint without helping the common case; widening past 1M is
  // done by tapping a longer-period chip.
  int get limit => switch (this) {
    ReceiptPeriod.month      => 100,
    ReceiptPeriod.threeMonth => 300,
    ReceiptPeriod.sixMonth   => 600,
    ReceiptPeriod.year       => 1000,
    ReceiptPeriod.all        => 2000,
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
  ///
  /// As of v0.2.66 this routes through POST /api/receipts/save (via the
  /// outbox) so dedup, Tier 2 category inference, store-and-location
  /// resolution, items, store_items catalog, and refund policies all
  /// run on the SERVER, identical to the web flow. The old inline
  /// pipeline lived here for ~6 months; the divergence (mobile dedup
  /// missing TLD strip, mobile not calling Tier 2 RPC, mobile writing
  /// store_id NULL) caused the dashboard mismatches we fixed by hand
  /// over weeks. Now there is one writer.
  ///
  /// Offline: if the network is down or /api/receipts/save times out,
  /// the save is QUEUED in shared_preferences and replayed on next app
  /// launch / online flush. Returns `queued: true` in that case.
  Future<({String? id, String? error, bool merged, bool queued})> addParsedReceipt(
    Map<String, dynamic> parsed,
    File imageFile, {
    List<File> extraPages = const [],
  }) async {
    final uid = _sb.auth.currentUser?.id;
    if (uid == null) {
      return (id: null, error: 'Not signed in', merged: false, queued: false);
    }

    // 1. Upload primary + extra page images. These go to Supabase Storage
    //    directly (faster than tunneling through our API). If THIS fails,
    //    there's nothing to queue yet — surface the error.
    String? link;
    final extraUrls = <String>[];
    try {
      link = await uploadImage(imageFile);
      for (final p in extraPages) {
        try {
          final u = await uploadImage(p);
          extraUrls.add(u);
        } catch (e) {
          if (kDebugMode) debugPrint('extra page upload failed: $e');
        }
      }
    } catch (e) {
      return (id: null, error: 'Image upload failed: $e', merged: false, queued: false);
    }

    // 2. Normalize date — server defaults to today if missing.
    final today = DateTime.now().toIso8601String().substring(0, 10);
    final dateField = (parsed['date'] is String &&
                      RegExp(r'^\d{4}-\d{2}-\d{2}').hasMatch(parsed['date'] as String))
        ? (parsed['date'] as String).substring(0, 10)
        : today;

    // 3. Build the save payload — same shape /api/parse-receipt returns,
    //    with the uploaded image URL bolted on. The server pipeline
    //    handles everything else (dedup, Tier 2, store resolve, items,
    //    refund policies, store_items catalog).
    final payload = <String, dynamic>{
      'parsed': {
        ...parsed,
        'date': dateField,
      },
      'receipt_link': link,
      if (extraUrls.isNotEmpty) 'extra_page_urls': extraUrls,
    };

    // 4. Send via outbox (online → POST + immediate result; offline →
    //    queue + return queued=true). Never throws; never hangs UI past
    //    the 30s timeout.
    final result = await ReceiptOutbox.trySave(payload);

    if (result.error != null) {
      return (id: null, error: result.error, merged: false, queued: false);
    }
    if (result.queued) {
      // Locally cached — UI should show "Queued (X)". Don't force a
      // reload (the row doesn't exist yet).
      return (id: null, error: null, merged: false, queued: true);
    }

    // 5. Online success — refresh the list so the new row appears.
    _lastLoaded = null;
    unawaited(loadReceipts(force: true));
    return (id: result.receiptId, error: null, merged: result.merged, queued: false);
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
