// Shared date formatter so every screen renders dates the same way.
// Backend stores dates as ISO yyyy-MM-dd; users want dd-MMM-yyyy (25-May-2026).

const List<String> _months = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/// Renders an ISO yyyy-MM-dd date string as dd-MMM-yyyy. Falls back to the
/// raw input on any parse failure so a bad row at least shows _something_
/// instead of "Invalid Date".
///
/// Avoids the Dart `DateTime.parse` round-trip for plain yyyy-MM-dd strings
/// so users in non-UTC timezones don't see a day-off render.
String formatDateShort(String? iso) {
  if (iso == null || iso.isEmpty) return '';
  // Fast path for yyyy-MM-dd or yyyy-MM-dd<...>
  final m = RegExp(r'^(\d{4})-(\d{2})-(\d{2})').firstMatch(iso);
  if (m != null) {
    final y = m.group(1)!;
    final mo = int.parse(m.group(2)!);
    final d = m.group(3)!;
    if (mo >= 1 && mo <= 12) return '$d-${_months[mo - 1]}-$y';
  }
  try {
    final dt = DateTime.parse(iso);
    final d = dt.day.toString().padLeft(2, '0');
    return '$d-${_months[dt.month - 1]}-${dt.year}';
  } catch (_) {
    return iso;
  }
}
