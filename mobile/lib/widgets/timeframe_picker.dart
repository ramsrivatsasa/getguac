import 'package:flutter/material.dart';
import '../services/timeframe_store.dart';

/// Shared time-frame picker — the green Daily/Weekly/Monthly/Yearly
/// pill bar + "Last N <unit>" dropdown + optional trailing label
/// row. Used on every screen that filters by date so the look is
/// consistent and the value is read from the same persisted store.
///
/// State is owned by [TimeframeStore] (SharedPreferences). Each
/// screen passes its current `period` + `count` in; the widget
/// fires `onChange(period, count)` whenever the user touches a
/// control. The hosting screen is responsible for calling
/// `TimeframeStore.save(...)` (or relying on this widget's
/// `persistOnChange` flag which writes for you).
///
/// On navigate-from-dashboard, the new screen calls
/// `TimeframeStore.load()` in initState — automatically reads
/// whatever the dashboard last set.

enum TimeframePeriod { daily, weekly, monthly, yearly }

TimeframePeriod timeframePeriodFromString(String s) {
  switch (s) {
    case 'daily':  return TimeframePeriod.daily;
    case 'weekly': return TimeframePeriod.weekly;
    case 'yearly': return TimeframePeriod.yearly;
    default:       return TimeframePeriod.monthly;
  }
}

String timeframePeriodToString(TimeframePeriod p) {
  switch (p) {
    case TimeframePeriod.daily:   return 'daily';
    case TimeframePeriod.weekly:  return 'weekly';
    case TimeframePeriod.monthly: return 'monthly';
    case TimeframePeriod.yearly:  return 'yearly';
  }
}

const _kCountOptions = {
  TimeframePeriod.daily:   [1, 3, 7, 14, 30, 60, 90],
  TimeframePeriod.weekly:  [1, 2, 4, 8, 12, 26, 52],
  TimeframePeriod.monthly: [1, 3, 6, 12, 24, 36],
  TimeframePeriod.yearly:  [1, 2, 3, 5, 10],
};
const _kDefaultCount = {
  TimeframePeriod.daily: 7,
  TimeframePeriod.weekly: 4,
  TimeframePeriod.monthly: 3,
  TimeframePeriod.yearly: 1,
};
const _kUnitLabel = {
  TimeframePeriod.daily: 'day',
  TimeframePeriod.weekly: 'week',
  TimeframePeriod.monthly: 'month',
  TimeframePeriod.yearly: 'year',
};

class TimeframePicker extends StatelessWidget {
  final TimeframePeriod period;
  final int count;
  final void Function(TimeframePeriod period, int count) onChange;

  /// Optional trailing label (e.g. "40 transactions · Last 3 months")
  /// rendered next to the count dropdown.
  final String? trailing;

  /// When true (default), this widget auto-writes to TimeframeStore
  /// before invoking onChange. Set false if the caller persists
  /// itself (e.g. you also need to fire a refetch alongside).
  final bool persistOnChange;

  const TimeframePicker({
    super.key,
    required this.period,
    required this.count,
    required this.onChange,
    this.trailing,
    this.persistOnChange = true,
  });

  static const _kEmerald50  = Color(0xFFf0fdf4);
  static const _kEmerald100 = Color(0xFFdcfce7);
  static const _kEmerald800 = Color(0xFF166534);

  void _emit(TimeframePeriod p, int c) {
    if (persistOnChange) {
      TimeframeStore.save(Timeframe(timeframePeriodToString(p), c));
    }
    onChange(p, c);
  }

  @override
  Widget build(BuildContext context) {
    final opts = _kCountOptions[period] ?? [1];
    final unit = _kUnitLabel[period] ?? 'period';
    final effectiveCount = opts.contains(count) ? count : opts.first;

    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      // Daily / Weekly / Monthly / Yearly pill bar
      Container(
        padding: const EdgeInsets.all(4),
        decoration: BoxDecoration(
          color: _kEmerald50,
          borderRadius: BorderRadius.circular(40),
          border: Border.all(color: _kEmerald100),
        ),
        child: Row(children: TimeframePeriod.values.map((p) {
          final active = period == p;
          return Expanded(child: GestureDetector(
            onTap: () {
              // Re-anchor count to a sensible default for the new
              // unit so "Last 90 days" doesn't become "Last 90 years"
              // when the user flips to Yearly.
              _emit(p, _kDefaultCount[p] ?? 1);
            },
            child: Container(
              padding: const EdgeInsets.symmetric(vertical: 8),
              decoration: BoxDecoration(
                color: active ? Colors.white : Colors.transparent,
                borderRadius: BorderRadius.circular(40),
                boxShadow: active
                  ? [BoxShadow(color: Colors.black.withValues(alpha: 0.06), blurRadius: 4)]
                  : null,
              ),
              alignment: Alignment.center,
              child: Text(
                p.name[0].toUpperCase() + p.name.substring(1),
                style: TextStyle(
                  color: active ? _kEmerald800 : const Color(0xFF15803d).withValues(alpha: 0.65),
                  fontWeight: FontWeight.w800,
                  fontSize: 13,
                ),
              ),
            ),
          ));
        }).toList()),
      ),
      const SizedBox(height: 8),
      // "Last 3 ▼ months · trailing"
      Row(children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(40),
            border: Border.all(color: _kEmerald100),
            boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.03), blurRadius: 3)],
          ),
          child: Row(mainAxisSize: MainAxisSize.min, children: [
            const Text('Last', style: TextStyle(fontSize: 11, color: Colors.black54, fontWeight: FontWeight.w700)),
            const SizedBox(width: 6),
            DropdownButton<int>(
              value: effectiveCount,
              underline: const SizedBox.shrink(),
              isDense: true,
              style: const TextStyle(fontSize: 13, color: _kEmerald800, fontWeight: FontWeight.w900),
              items: opts.map((n) => DropdownMenuItem(value: n, child: Text('$n'))).toList(),
              onChanged: (n) { if (n != null) _emit(period, n); },
            ),
            Text(' $unit${effectiveCount == 1 ? '' : 's'}',
              style: const TextStyle(fontSize: 11, color: Colors.black54, fontWeight: FontWeight.w700)),
          ]),
        ),
        if (trailing != null) ...[
          const SizedBox(width: 8),
          Expanded(child: Text(trailing!,
            style: const TextStyle(fontSize: 11, color: Colors.black54),
            overflow: TextOverflow.ellipsis,
          )),
        ],
      ]),
    ]);
  }
}
