import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'dart:io';
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
  int get limit => this == ReceiptPeriod.all ? 1000 : 500;
}

class ReceiptProvider extends ChangeNotifier {
  final _sb = Supabase.instance.client;
  List<Receipt> receipts = [];
  bool loading = false;
  DateTime? _lastLoaded;
  ReceiptPeriod _lastPeriod = ReceiptPeriod.threeMonth;
  ReceiptPeriod get currentPeriod => _lastPeriod;

  /// Loads receipts scoped to [period]. Cached if the same period was loaded
  /// in the last [maxAge]. Pass `force: true` to refetch.
  Future<void> loadReceipts({
    ReceiptPeriod period = ReceiptPeriod.threeMonth,
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

  Future<void> updateReceipt(String id, Map<String, dynamic> data) async {
    await _sb.from('receipts').update(data).eq('id', id);
    _lastLoaded = null;
    await loadReceipts(force: true);
  }

  Future<void> deleteReceipt(String id) async {
    await _sb.from('receipts').delete().eq('id', id);
    receipts.removeWhere((r) => r.id == id);
    notifyListeners();
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
