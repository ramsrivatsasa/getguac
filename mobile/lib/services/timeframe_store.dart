// Shared time-frame store — mobile equivalent of the web Zustand
// store's `spendingPeriod` + `spendingPeriodCount` slots.
//
// Reactive via a singleton ValueNotifier so when ANY screen
// (dashboard, /guacwizard, /guacscore, /reports…) saves a new
// time-frame, every screen currently listening rebuilds with the
// new value. The dashboard sees a change made on a sub-page the
// moment the user pops back, with no manual reload.
//
// Persists to SharedPreferences so a cold start (or going back to
// the app after a kill) picks up the last value.

import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

class Timeframe {
  final String period;   // 'daily' | 'weekly' | 'monthly' | 'yearly'
  final int count;       // unit count
  const Timeframe(this.period, this.count);

  static const Timeframe defaultValue = Timeframe('monthly', 3);

  Timeframe copyWith({String? period, int? count}) =>
      Timeframe(period ?? this.period, count ?? this.count);

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is Timeframe && other.period == period && other.count == count;

  @override
  int get hashCode => Object.hash(period, count);
}

class TimeframeStore {
  static const _kPeriod = 'spendingPeriod';
  static const _kCount  = 'spendingPeriodCount';

  /// Single source of truth across the app. Screens listen via
  /// `ValueListenableBuilder<Timeframe>(valueListenable:
  /// TimeframeStore.notifier, builder: …)` or call
  /// `TimeframeStore.notifier.addListener(...)` directly.
  static final ValueNotifier<Timeframe> notifier =
      ValueNotifier<Timeframe>(Timeframe.defaultValue);

  static bool _hydrated = false;

  /// Read the persisted time-frame. Hydrates the notifier on first
  /// call so the initial value is the user's last selection rather
  /// than the global default.
  static Future<Timeframe> load() async {
    if (_hydrated) return notifier.value;
    try {
      final prefs = await SharedPreferences.getInstance();
      final p = prefs.getString(_kPeriod) ?? Timeframe.defaultValue.period;
      final c = prefs.getInt(_kCount) ?? Timeframe.defaultValue.count;
      final tf = (_validPeriod(p) && c >= 1) ? Timeframe(p, c) : Timeframe.defaultValue;
      notifier.value = tf;
      _hydrated = true;
      return tf;
    } catch (_) {
      _hydrated = true;
      return Timeframe.defaultValue;
    }
  }

  /// Best-effort write — never throws so the UI control isn't
  /// blocked by storage issues. Always updates the in-memory
  /// notifier first so listeners react synchronously even if disk
  /// write is slow.
  static Future<void> save(Timeframe tf) async {
    notifier.value = tf;
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_kPeriod, tf.period);
      await prefs.setInt(_kCount, tf.count);
    } catch (_) {}
  }

  static bool _validPeriod(String p) =>
      p == 'daily' || p == 'weekly' || p == 'monthly' || p == 'yearly';
}
