// Mascot event bus — a singleton Stream that any screen can fire onto
// to make the avocado mascot react. The AnimatedMascot widget(s)
// listen and play a corresponding animation.
//
// Why a bus
// ---------
// Prop-drilling a mascot animation controller through every screen
// would balloon the surface area of dozens of unrelated widgets. The
// alternative — global state in a provider — is overkill for a fire-
// and-forget signal. A broadcast StreamController is the right
// primitive: O(1) lookup, supports N listeners, no state held.
//
// Idempotency for milestone events
// --------------------------------
// `celebrateOnce` is intended for things like "you hit 7 Smash days"
// that should only fire ONCE per milestone. The caller passes a stable
// key (e.g. `smash_days_7`) and we check shared_preferences before
// emitting. The fired set lives under a single JSON-encoded key so we
// don't sprawl the user's prefs file.

import 'dart:async';
import 'dart:convert';

import 'package:flutter/services.dart';
import 'package:shared_preferences/shared_preferences.dart';

enum MascotAnimation { bounce, wiggle, pulse, celebrate }

class MascotEvent {
  final MascotAnimation animation;
  final String? message;
  const MascotEvent(this.animation, {this.message});
}

class MascotEventBus {
  MascotEventBus._();
  static final MascotEventBus instance = MascotEventBus._();

  // Broadcast so multiple AnimatedMascot widgets (e.g. dashboard +
  // sidebar avatar) can each subscribe without one consuming the
  // event for the others.
  final StreamController<MascotEvent> _ctrl =
      StreamController<MascotEvent>.broadcast();

  Stream<MascotEvent> get stream => _ctrl.stream;

  // Haptics are best-effort. On platforms without a vibrator (web,
  // desktop, locked devices) the call is a no-op but historically
  // some embeddings have thrown PlatformException, so we swallow.
  void _safeHaptic(Future<void> Function() fn) {
    try {
      // Don't await — fire-and-forget. Catch async errors too.
      fn().catchError((_) {});
    } catch (_) {
      // Sync throw — also ignore.
    }
  }

  void bounce() {
    _ctrl.add(const MascotEvent(MascotAnimation.bounce));
    _safeHaptic(HapticFeedback.lightImpact);
  }

  void wiggle() {
    _ctrl.add(const MascotEvent(MascotAnimation.wiggle));
    _safeHaptic(HapticFeedback.selectionClick);
  }

  void pulse() {
    _ctrl.add(const MascotEvent(MascotAnimation.pulse));
    _safeHaptic(HapticFeedback.lightImpact);
  }

  void celebrate([String? message]) {
    _ctrl.add(MascotEvent(MascotAnimation.celebrate, message: message));
    // Double-tap success cue: medium thump, then a lighter follow-up
    // 200ms later. The follow-up is scheduled rather than awaited so
    // the call returns immediately and the two haptics don't block
    // each other.
    _safeHaptic(HapticFeedback.mediumImpact);
    Future<void>.delayed(const Duration(milliseconds: 200), () {
      _safeHaptic(HapticFeedback.lightImpact);
    });
  }

  // Idempotent milestone celebrate. Returns true if it actually fired.
  // Tracks already-fired keys in SharedPreferences under a single key
  // so we never re-fire the same milestone (Smash-days 7 etc.).
  static const _kFiredKey = 'getguac.mascot.firedMilestones.v1';
  Future<bool> celebrateOnce(String key, {String? message}) async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_kFiredKey);
    Set<String> fired = <String>{};
    if (raw != null && raw.isNotEmpty) {
      try {
        final decoded = jsonDecode(raw);
        if (decoded is List) {
          fired = decoded.whereType<String>().toSet();
        }
      } catch (_) {
        // Corrupt — wipe and start over rather than fight it.
        fired = <String>{};
      }
    }
    if (fired.contains(key)) return false;
    fired.add(key);
    await prefs.setString(_kFiredKey, jsonEncode(fired.toList()));
    celebrate(message);
    return true;
  }
}

// Tiny top-level alias so call sites read like `mascotBus.bounce()`
// without the extra `.instance` noise.
// ignore: non_constant_identifier_names
final MascotEventBus mascotBus = MascotEventBus.instance;
