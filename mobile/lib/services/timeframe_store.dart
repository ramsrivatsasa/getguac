// Shared time-frame store — mobile equivalent of the web Zustand
// store's `spendingPeriod` + `spendingPeriodCount` slots. Persists
// to SharedPreferences so a refresh / cold-start keeps the same
// window the user last selected on the dashboard, and every screen
// that filters by date can read the same tuple.
//
// Pattern: dashboard owns the picker UI; downstream screens
// (GuacWizard, Reports, etc.) call `TimeframeStore.load()` to read
// the current (period, count) tuple at mount time.

import 'package:shared_preferences/shared_preferences.dart';

class Timeframe {
  final String period;   // 'daily' | 'weekly' | 'monthly' | 'yearly'
  final int count;       // unit count
  const Timeframe(this.period, this.count);

  static const Timeframe defaultValue = Timeframe('monthly', 3);
}

class TimeframeStore {
  static const _kPeriod = 'spendingPeriod';
  static const _kCount  = 'spendingPeriodCount';

  /// Read the persisted time-frame. Falls back to the default when
  /// SharedPreferences is empty or the stored values are invalid.
  static Future<Timeframe> load() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final p = prefs.getString(_kPeriod) ?? Timeframe.defaultValue.period;
      final c = prefs.getInt(_kCount) ?? Timeframe.defaultValue.count;
      if (!_validPeriod(p) || c < 1) return Timeframe.defaultValue;
      return Timeframe(p, c);
    } catch (_) {
      return Timeframe.defaultValue;
    }
  }

  /// Best-effort write — never throws so the UI control isn't
  /// blocked by storage issues.
  static Future<void> save(Timeframe tf) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_kPeriod, tf.period);
      await prefs.setInt(_kCount, tf.count);
    } catch (_) {}
  }

  static bool _validPeriod(String p) =>
      p == 'daily' || p == 'weekly' || p == 'monthly' || p == 'yearly';
}
