// Prediction feedback + errand-plan grouping — Dart mirror of the
// pure-function parts of web/src/lib/prediction-feedback.js.
//
// The async DB writers (recordPredictionOutcome, getPredictionMetrics)
// aren't needed on mobile yet because mobile /shopping doesn't render
// the prediction surface. We port only the pure errand-plan grouping
// so when that screen lands the lib is already in place.

class PredictionGroup {
  final String? storeId;        // null = "no store known" bucket
  final List<Map<String, dynamic>> items;
  final int itemCount;
  const PredictionGroup({required this.storeId, required this.items, required this.itemCount});
}

/// Group an array of predicted shopping_list rows by `store_id` (and
/// fall back to a "no-store" bucket for rows without one). Used by the
/// future Errand Plan panel to render "1 trip to Costco vs 4 separate
/// trips". Pure function — no DB.
List<PredictionGroup> groupPredictionsByStore(List<Map<String, dynamic>> rows) {
  final map = <String, PredictionGroup>{};
  for (final r in rows) {
    final sid = r['store_id'] as String?;
    final key = sid ?? '__nostore__';
    final existing = map[key];
    if (existing == null) {
      map[key] = PredictionGroup(
        storeId: sid,
        items: [r],
        itemCount: 1,
      );
    } else {
      existing.items.add(r);
      // Mutating itemCount on a const class won't work — rebuild.
      map[key] = PredictionGroup(
        storeId: sid,
        items: existing.items,
        itemCount: existing.itemCount + 1,
      );
    }
  }
  // Largest baskets first — those are the "1 trip saves the most" winners.
  final out = map.values.toList()..sort((a, b) => b.itemCount.compareTo(a.itemCount));
  return out;
}
