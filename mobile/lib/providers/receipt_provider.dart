import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'dart:io';
import '../models/receipt_model.dart';

// Columns the list views actually use. Drops `receipt_items` from the join
// (items are fetched on the detail screen via getItems()) and drops large
// columns like validation_comment / embedding metadata that the list never reads.
// Cuts payload size by ~85% on typical accounts.
const _kReceiptListCols =
    'id, store_name, date, total_amount, tax_paid, reward_no, '
    'receipt_link, business_purchase, processed, category, rating, '
    'from_statement, statement_source, reconciled';

class ReceiptProvider extends ChangeNotifier {
  final _sb = Supabase.instance.client;
  List<Receipt> receipts = [];
  bool loading = false;
  DateTime? _lastLoaded;

  /// Loads receipts. By default, refuses to refetch if the cache is younger
  /// than [maxAge] (60s). Pass `force: true` to bypass.
  Future<void> loadReceipts({bool force = false, Duration maxAge = const Duration(seconds: 60)}) async {
    // Skip if already loading or recently loaded
    if (loading) return;
    if (!force && _lastLoaded != null && DateTime.now().difference(_lastLoaded!) < maxAge && receipts.isNotEmpty) {
      return;
    }

    loading = true;
    notifyListeners();
    try {
      final data = await _sb
          .from('receipts')
          .select(_kReceiptListCols)
          .order('date', ascending: false)
          .limit(200);
      receipts = (data as List).map((d) => Receipt.fromMap(d['id'] as String, d as Map<String, dynamic>)).toList();
      _lastLoaded = DateTime.now();
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
