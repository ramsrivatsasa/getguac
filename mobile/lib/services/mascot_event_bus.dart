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

  void bounce() => _ctrl.add(const MascotEvent(MascotAnimation.bounce));
  void wiggle() => _ctrl.add(const MascotEvent(MascotAnimation.wiggle));
  void pulse() => _ctrl.add(const MascotEvent(MascotAnimation.pulse));
  void celebrate([String? message]) =>
      _ctrl.add(MascotEvent(MascotAnimation.celebrate, message: message));

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
