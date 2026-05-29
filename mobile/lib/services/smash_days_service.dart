// Smash days — consecutive-day count of receipt activity. Mirrors the
// web `lib/smashDays.js` logic character-for-character so the two
// dashboards never disagree on the same data.
//
// Anchoring rule: today OR yesterday counts as the latest "smash day"
// so the counter doesn't reset to 0 the moment a user opens the app
// before scanning. The count starts at the most recent activity day
// and walks backward until it hits a gap.

import '../models/receipt_model.dart';

class SmashDaysResult {
  final int smashDays;
  final String? lastActiveIso;
  SmashDaysResult({required this.smashDays, this.lastActiveIso});
}

SmashDaysResult computeSmashDays(List<Receipt> receipts) {
  if (receipts.isEmpty) {
    return SmashDaysResult(smashDays: 0, lastActiveIso: null);
  }

  // Collect every distinct YYYY-MM-DD the user has at least one
  // receipt for. Receipt.date is already a YYYY-MM-DD string on
  // mobile (mirrors the web shape) so no parsing needed.
  final days = <String>{};
  for (final r in receipts) {
    final iso = r.date.toString();
    if (iso.length >= 10) {
      days.add(iso.substring(0, 10));
    }
  }
  if (days.isEmpty) return SmashDaysResult(smashDays: 0, lastActiveIso: null);

  // Use LOCAL today/yesterday — matches how the web side derives them
  // from Date objects + slice(0, 10). receipts.date itself is also a
  // local calendar date (the parser stores YYYY-MM-DD as printed on
  // the receipt, no UTC normalization). Comparing local-local is the
  // only stable answer; mixing with UTC produces the off-by-one bug
  // we already had on web.
  final now = DateTime.now();
  String iso(DateTime d) =>
      '${d.year.toString().padLeft(4, '0')}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';
  final todayIso = iso(now);
  final yestIso  = iso(now.subtract(const Duration(days: 1)));

  DateTime? cursor;
  if (days.contains(todayIso)) {
    cursor = DateTime(now.year, now.month, now.day);
  } else if (days.contains(yestIso)) {
    cursor = DateTime(now.year, now.month, now.day).subtract(const Duration(days: 1));
  } else {
    final sortedDays = days.toList()..sort();
    return SmashDaysResult(smashDays: 0, lastActiveIso: sortedDays.last);
  }

  var smashDays = 0;
  while (true) {
    final cursorIso = iso(cursor!);
    if (!days.contains(cursorIso)) break;
    smashDays++;
    cursor = cursor.subtract(const Duration(days: 1));
  }
  final sortedDays = days.toList()..sort();
  return SmashDaysResult(smashDays: smashDays, lastActiveIso: sortedDays.last);
}
