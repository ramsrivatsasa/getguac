import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'dart:io';
import '../models/receipt_model.dart';

class ReceiptProvider extends ChangeNotifier {
  final _sb = Supabase.instance.client;
  List<Receipt> receipts = [];
  bool loading = false;

  Future<void> loadReceipts() async {
    loading = true;
    notifyListeners();
    final data = await _sb.from('receipts').select('*, receipt_items(*)').order('date', ascending: false);
    receipts = data.map((d) => Receipt.fromMap(d['id'], d)).toList();
    loading = false;
    notifyListeners();
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
    await loadReceipts();
  }

  Future<void> updateReceipt(String id, Map<String, dynamic> data) async {
    await _sb.from('receipts').update(data).eq('id', id);
    await loadReceipts();
  }

  Future<void> deleteReceipt(String id) async {
    await _sb.from('receipts').delete().eq('id', id);
    receipts.removeWhere((r) => r.id == id);
    notifyListeners();
  }

  Future<List<ReceiptItem>> getItems(String receiptId) async {
    final data = await _sb.from('receipt_items').select().eq('receipt_id', receiptId);
    return data.map((d) => ReceiptItem.fromMap(d['id'], d)).toList();
  }

  Future<void> addItem(String receiptId, ReceiptItem item) async {
    await _sb.from('receipt_items').insert({ ...item.toMap(), 'receipt_id': receiptId });
  }

  Future<void> updateItem(String id, Map<String, dynamic> data) async {
    await _sb.from('receipt_items').update(data).eq('id', id);
  }
}
