import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../models/reward_model.dart';

class RewardProvider extends ChangeNotifier {
  final _sb = Supabase.instance.client;
  List<Reward> rewards = [];
  bool loading = false;

  Future<void> loadRewards() async {
    loading = true;
    notifyListeners();
    final data = await _sb.from('rewards').select().order('expiry_date', ascending: true);
    rewards = data.map((d) => Reward.fromMap(d['id'], d)).toList();
    loading = false;
    notifyListeners();
  }

  Future<void> addReward(Reward reward) async {
    await _sb.from('rewards').insert({
      ...reward.toMap(),
      'user_id': _sb.auth.currentUser!.id,
    });
    await loadRewards();
  }

  Future<void> updateReward(String id, Map<String, dynamic> data) async {
    await _sb.from('rewards').update(data).eq('id', id);
    await loadRewards();
  }

  Future<void> deleteReward(String id) async {
    await _sb.from('rewards').delete().eq('id', id);
    rewards.removeWhere((r) => r.id == id);
    notifyListeners();
  }
}
