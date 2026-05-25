import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../models/reward_model.dart';

// Columns the mobile reward list + detail screens actually read.
const _kRewardCols =
    'id, reward_no, expiry_date, reward_type, reward_title, description, store_name';

class RewardProvider extends ChangeNotifier {
  final _sb = Supabase.instance.client;
  List<Reward> rewards = [];
  bool loading = false;
  DateTime? _lastLoaded;

  Future<void> loadRewards({bool force = false, Duration maxAge = const Duration(seconds: 60)}) async {
    if (loading) return;
    if (!force && _lastLoaded != null && DateTime.now().difference(_lastLoaded!) < maxAge && rewards.isNotEmpty) {
      return;
    }
    loading = true;
    notifyListeners();
    try {
      final data = await _sb
          .from('rewards')
          .select(_kRewardCols)
          .order('expiry_date', ascending: true)
          .limit(200);
      rewards = (data as List)
          .map((d) => Reward.fromMap(d['id'] as String, d as Map<String, dynamic>))
          .toList();
      _lastLoaded = DateTime.now();
    } catch (e) {
      if (kDebugMode) debugPrint('loadRewards error: $e');
      rethrow;
    } finally {
      loading = false;
      notifyListeners();
    }
  }

  Future<void> addReward(Reward reward) async {
    await _sb.from('rewards').insert({
      ...reward.toMap(),
      'user_id': _sb.auth.currentUser!.id,
    });
    _lastLoaded = null;
    await loadRewards(force: true);
  }

  Future<void> updateReward(String id, Map<String, dynamic> data) async {
    await _sb.from('rewards').update(data).eq('id', id);
    _lastLoaded = null;
    await loadRewards(force: true);
  }

  Future<void> deleteReward(String id) async {
    await _sb.from('rewards').delete().eq('id', id);
    rewards.removeWhere((r) => r.id == id);
    notifyListeners();
  }
}
