// Mobile-side receipt parser. Uploads a camera-captured image to the same
// /api/parse-receipt endpoint the web flow uses and returns the AI-extracted
// fields (store, date, total, tax, items). Without this the mobile dialog
// shows blank inputs — user has to type everything by hand.

import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import 'package:supabase_flutter/supabase_flutter.dart';

const _kApiBase = 'https://getguac.app';

class ParsedReceipt {
  final String storeName;
  final String? date;          // YYYY-MM-DD or null when AI couldn't determine
  final double totalAmount;
  final double taxPaid;
  final String paymentMethod;
  final String paymentLast4;
  final bool isReturn;
  final String? category;
  final List<ParsedItem> items;
  final String? provider;      // 'gemini' / 'groq' — diagnostic

  ParsedReceipt({
    required this.storeName,
    required this.date,
    required this.totalAmount,
    required this.taxPaid,
    required this.paymentMethod,
    required this.paymentLast4,
    required this.isReturn,
    required this.category,
    required this.items,
    required this.provider,
  });

  factory ParsedReceipt.fromMap(Map<String, dynamic> m) => ParsedReceipt(
    storeName:     (m['store_name'] ?? '').toString(),
    date:          (m['date'] as String?)?.isNotEmpty == true ? m['date'] as String : null,
    totalAmount:   (m['total_amount'] is num) ? (m['total_amount'] as num).toDouble() : double.tryParse('${m['total_amount']}') ?? 0,
    taxPaid:       (m['tax_paid']     is num) ? (m['tax_paid']     as num).toDouble() : double.tryParse('${m['tax_paid']}')     ?? 0,
    paymentMethod: (m['payment_method'] ?? '').toString(),
    paymentLast4:  (m['payment_last4']  ?? '').toString(),
    isReturn:      m['is_return'] == true,
    category:      (m['category'] as String?)?.isNotEmpty == true ? m['category'] as String : null,
    items:         (m['items'] as List? ?? const []).map((it) => ParsedItem.fromMap(it as Map<String, dynamic>)).toList(),
    provider:      m['_provider'] as String?,
  );
}

class ParsedItem {
  final String sku;
  final String model;
  final String itemName;
  final double qty;
  final double? price;
  final bool returned;
  final String? category;

  ParsedItem({
    required this.sku, required this.model, required this.itemName,
    required this.qty, required this.price, required this.returned, required this.category,
  });

  factory ParsedItem.fromMap(Map<String, dynamic> m) => ParsedItem(
    sku:       (m['sku']       ?? '').toString(),
    model:     (m['model']     ?? '').toString(),
    itemName:  (m['item_name'] ?? '').toString(),
    qty:       (m['qty'] is num) ? (m['qty'] as num).toDouble() : double.tryParse('${m['qty']}') ?? 1,
    price:     m['price'] == null ? null : (m['price'] is num ? (m['price'] as num).toDouble() : double.tryParse('${m['price']}')),
    returned:  m['returned'] == true,
    category:  (m['category'] as String?)?.isNotEmpty == true ? m['category'] as String : null,
  );
}

class ReceiptParseService {
  /// Upload [file] to the web parse-receipt endpoint and return the parsed
  /// receipt. Returns null on auth failure / timeout / AI error — caller
  /// should fall back to a blank manual-entry form.
  static Future<ParsedReceipt?> parseImage(File file) async {
    final session = Supabase.instance.client.auth.currentSession;
    if (session == null) return null;
    try {
      final uri = Uri.parse('$_kApiBase/api/parse-receipt');
      final req = http.MultipartRequest('POST', uri);
      req.headers['Authorization'] = 'Bearer ${session.accessToken}';
      req.files.add(await http.MultipartFile.fromPath('file', file.path));
      // 45-sec timeout — Gemini Flash text-from-image takes 5-15s, give it room.
      final streamed = await req.send().timeout(const Duration(seconds: 45));
      if (streamed.statusCode != 200) return null;
      final body = await streamed.stream.bytesToString();
      final map = jsonDecode(body) as Map<String, dynamic>;
      if (map['error'] != null) return null;
      return ParsedReceipt.fromMap(map);
    } catch (_) {
      return null;
    }
  }
}
