// Mobile-side receipt parser. Uploads a camera-captured image to the same
// /api/parse-receipt endpoint the web flow uses and returns the AI-extracted
// fields (store, date, total, tax, items). Without this the mobile dialog
// shows blank inputs — user has to type everything by hand.

import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'debug_log.dart';

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

/// Result of a parse attempt. Either [data] is set (successful parse) OR
/// [error] is set (failed). When the AI returns 200 but the parsed receipt
/// has no usable fields (no store, no total, no items), we treat that as
/// `error: "AI couldn't read the receipt"` rather than silently succeeding
/// with empty data — the caller can show a meaningful message instead of
/// saving a blank row.
class ParseResult {
  final ParsedReceipt? data;
  final String? error;
  const ParseResult.ok(ParsedReceipt this.data) : error = null;
  const ParseResult.fail(String this.error) : data = null;
  bool get ok => error == null && data != null;
}

/// File extension → MIME mapping. Used to set the multipart Content-Type
/// when image_picker returns a file with no registered type (which makes
/// the upload default to application/octet-stream and the server reject it).
String _mimeFromExtension(String path) {
  final dot = path.lastIndexOf('.');
  if (dot < 0) return 'image/jpeg';
  final ext = path.substring(dot + 1).toLowerCase();
  switch (ext) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':  return 'image/png';
    case 'webp': return 'image/webp';
    case 'heic': return 'image/heic';
    case 'heif': return 'image/heif';
    case 'gif':  return 'image/gif';
    case 'pdf':  return 'application/pdf';
    default:     return 'image/jpeg'; // safe default — receipts are images
  }
}

class ReceiptParseService {
  /// Upload [file] to the web parse-receipt endpoint and return a ParseResult.
  /// Distinguishes network failures, server errors, timeouts, and empty AI
  /// reads so the caller can show the user a real explanation.
  static Future<ParseResult> parseImage(File file) async {
    final session = Supabase.instance.client.auth.currentSession;
    if (session == null) {
      DebugLog.event('parse-receipt', 'no session', level: 'warn');
      return const ParseResult.fail('Not signed in.');
    }
    final detectedMime = _mimeFromExtension(file.path);
    DebugLog.event('parse-receipt', 'POST /api/parse-receipt start',
      meta: {
        'size': await file.length(),
        'path': file.path.split('/').last,
        'mime': detectedMime,
      });
    try {
      final uri = Uri.parse('$_kApiBase/api/parse-receipt');
      final req = http.MultipartRequest('POST', uri);
      req.headers['Authorization'] = 'Bearer ${session.accessToken}';
      // Explicit content-type. image_picker on Android sometimes returns
      // files without a registered MIME, which made the multipart upload
      // default to application/octet-stream — the server then rejected the
      // upload with "Unsupported file type". Detect from the path extension
      // so the server sees a real image/* type.
      final parts = detectedMime.split('/');
      req.files.add(await http.MultipartFile.fromPath(
        'file', file.path,
        contentType: MediaType(parts[0], parts.length > 1 ? parts[1] : 'jpeg'),
      ));
      final streamed = await req.send().timeout(const Duration(seconds: 45));
      final body = await streamed.stream.bytesToString();
      if (streamed.statusCode != 200) {
        String reason = 'Server error (${streamed.statusCode}).';
        try {
          final m = jsonDecode(body) as Map<String, dynamic>;
          if (m['error'] != null) reason = m['error'].toString();
        } catch (_) {}
        DebugLog.event('parse-receipt', 'http $reason', level: 'error',
          meta: {'status': streamed.statusCode});
        return ParseResult.fail(reason);
      }
      late final Map<String, dynamic> map;
      try {
        map = jsonDecode(body) as Map<String, dynamic>;
      } catch (e) {
        DebugLog.event('parse-receipt', 'non-JSON response', level: 'error',
          meta: {'snippet': body.length > 200 ? body.substring(0, 200) : body});
        return const ParseResult.fail('Server returned non-JSON.');
      }
      if (map['error'] != null) {
        DebugLog.event('parse-receipt', 'api error: ${map['error']}', level: 'error');
        return ParseResult.fail(map['error'].toString());
      }

      final parsed = ParsedReceipt.fromMap(map);
      final hasAnything = parsed.storeName.isNotEmpty
          || parsed.totalAmount > 0
          || parsed.items.isNotEmpty;
      if (!hasAnything) {
        DebugLog.event('parse-receipt', 'empty AI parse', level: 'warn',
          meta: {'provider': parsed.provider});
        return const ParseResult.fail(
          "Guac-AI couldn't read anything from this photo. Try a clearer, well-lit shot of the whole receipt."
        );
      }
      DebugLog.event('parse-receipt', 'ok', meta: {
        'store': parsed.storeName,
        'total': parsed.totalAmount,
        'items': parsed.items.length,
        'provider': parsed.provider,
      });
      return ParseResult.ok(parsed);
    } on http.ClientException catch (e) {
      DebugLog.event('parse-receipt', 'ClientException', level: 'error',
        meta: {'message': e.message});
      return ParseResult.fail('Network error: ${e.message}');
    } catch (e) {
      final m = e.toString();
      DebugLog.event('parse-receipt', 'exception', level: 'error',
        meta: {'error': m});
      if (m.contains('TimeoutException')) {
        return const ParseResult.fail('Timed out waiting for Guac-AI (45s). The server or your connection is slow — try again.');
      }
      return ParseResult.fail('Parse failed: $m');
    }
  }
}
