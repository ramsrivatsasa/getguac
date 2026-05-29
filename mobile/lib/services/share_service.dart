// Mints a public share token by calling the web /api/share/create endpoint,
// then hands the resulting URL to the OS share sheet via share_plus.
//
// Why call the web API instead of inserting into shared_items directly?
// The web endpoint enriches the payload with the sharer's GuacMoney total,
// smash-day count, and community rating — work that's wrong to duplicate
// here. By posting to the same endpoint the web client uses, every share
// (web or mobile) renders identically on /share/<token>.

import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:share_plus/share_plus.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class ShareService {
  static const _apiBase = 'https://getguac.app';

  /// Mints a share link for the given payload and pops the OS share sheet.
  /// Returns the share URL on success, null on failure (UI-side toast handled
  /// by the caller).
  static Future<String?> shareItem({
    required BuildContext context,
    required String itemName,
    String? storeName,
    double? lastPrice,
    String channel = 'native',
  }) async {
    final url = await _create(
      kind: 'item',
      payload: {
        'kind': 'item',
        'item_title': itemName,
        'category_emoji': '🛒',
        'best_price_callout':
            storeName != null && storeName.isNotEmpty ? 'Usually at $storeName' : null,
        'tiles': [
          {
            'store': storeName ?? '',
            'location': '',
            'title': itemName,
            'price': lastPrice ?? 0,
            'rating': null,
            'review_count': null,
            'sale': false,
          }
        ],
      },
      channel: channel,
    );
    if (url == null) return null;

    await Share.share(
      'Check out this find on GetGuac 🥑\n$url',
      subject: itemName,
    );
    return url;
  }

  /// Low-level: POSTs to /api/share/create with the user's bearer token.
  /// Returns the share URL, or null on any failure.
  static Future<String?> _create({
    required String kind,
    required Map<String, dynamic> payload,
    required String channel,
  }) async {
    final session = Supabase.instance.client.auth.currentSession;
    final token = session?.accessToken;
    if (token == null) return null;

    try {
      final res = await http.post(
        Uri.parse('$_apiBase/api/share/create'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode({
          'kind': kind,
          'payload': payload,
          'channel': channel,
        }),
      );
      if (res.statusCode != 200) return null;
      final body = jsonDecode(res.body) as Map<String, dynamic>;
      return body['url']?.toString();
    } catch (_) {
      return null;
    }
  }
}
