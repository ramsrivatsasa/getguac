// Captures share intents (e.g. Google Maps → Share → GetGuac) and routes
// them to the Car Miles screen with the shared text pre-filled as the
// trip's destination.
//
// Handles both flavors:
//  - Cold share: user shares while GetGuac is closed; app boots into share
//  - Warm share: user shares while GetGuac is already running

import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:go_router/go_router.dart';
import 'package:receive_sharing_intent/receive_sharing_intent.dart';

/// Latest shared payload waiting to be consumed by Car Miles. Cleared once
/// the destination has been read out by the trip-log dialog.
class PendingShare extends ChangeNotifier {
  static final PendingShare instance = PendingShare._();
  PendingShare._();

  String? _destination;
  String? get destination => _destination;

  void set(String? value) {
    _destination = value;
    notifyListeners();
  }

  /// Returns the current value and clears it (single-use semantics so the
  /// dialog doesn't keep re-opening).
  String? consume() {
    final v = _destination;
    _destination = null;
    if (v != null) notifyListeners();
    return v;
  }
}

class ShareIntentService {
  static StreamSubscription? _sub;

  /// Call once at app startup, AFTER the GoRouter is available.
  /// Routes any shared text → /car-miles + sets a PendingShare value.
  static Future<void> init(GoRouter router) async {
    // Cold-share: app launched from a share
    try {
      final initial = await ReceiveSharingIntent.instance.getInitialMedia();
      _handle(initial, router);
    } catch (_) {}

    // Warm-share: app already running
    _sub?.cancel();
    _sub = ReceiveSharingIntent.instance.getMediaStream().listen(
      (list) => _handle(list, router),
      onError: (_) {},
    );
  }

  static void _handle(List<SharedMediaFile> list, GoRouter router) {
    if (list.isEmpty) return;
    // First text/url item — that's what Google Maps shares (URL + place name)
    final shared = list.firstWhere(
      (s) => s.type == SharedMediaType.text || s.type == SharedMediaType.url,
      orElse: () => list.first,
    );
    final text = (shared.path).trim();
    if (text.isEmpty) return;
    PendingShare.instance.set(text);
    // Route to Car Miles where the listener will pop the trip-log dialog.
    try {
      router.go('/car-miles');
    } catch (_) {}
    // Clear the platform-side buffer so we don't replay on next launch.
    ReceiveSharingIntent.instance.reset();
  }

  static Future<void> dispose() async {
    await _sub?.cancel();
    _sub = null;
  }
}
