// Invite-a-friend screen — mobile mirror of web /invite.
//
// Shows the signed-in user's 6-char referral code (lazily allocated
// via the ensure_referral_code RPC), a copy button, a native share
// sheet handoff via share_plus, and the list of past referrals.
//
// The reward concept is Smash days: a successful referral grants
// 3 Smash days to BOTH the inviter and the new user via the
// profiles.smash_days_bonus column (added in migration_064).

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:share_plus/share_plus.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class InviteScreen extends StatefulWidget {
  const InviteScreen({super.key});

  @override
  State<InviteScreen> createState() => _InviteScreenState();
}

class _InviteScreenState extends State<InviteScreen> {
  static const int _rewardDays = 3;

  String? _code;
  String? _error;
  bool _loading = true;
  List<Map<String, dynamic>> _sentRefs = [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final sb = Supabase.instance.client;
    final uid = sb.auth.currentUser?.id;
    if (uid == null) {
      setState(() {
        _loading = false;
        _error = 'Sign in first.';
      });
      return;
    }
    try {
      // Lazy-allocate code via SECURITY DEFINER RPC. Idempotent.
      final codeRes = await sb.rpc('ensure_referral_code');
      final refs = await sb
          .from('referrals')
          .select('id, referee_id, code, created_at, credited_at, reward_smash_days')
          .eq('referrer_id', uid)
          .order('created_at', ascending: false);

      if (!mounted) return;
      setState(() {
        _code = codeRes is String ? codeRes : codeRes?.toString();
        _sentRefs = (refs as List).cast<Map<String, dynamic>>();
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString();
        _loading = false;
      });
    }
  }

  String get _shareUrl =>
      _code == null ? '' : 'https://getguac.app/?ref=$_code';

  Future<void> _copy(String text, String label) async {
    await Clipboard.setData(ClipboardData(text: text));
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('$label copied'), duration: const Duration(seconds: 1)),
      );
    }
  }

  Future<void> _share() async {
    if (_code == null) return;
    await Share.share(
      "I'm tracking my spending with GetGuac. Use my code $_code "
      "and we both get $_rewardDays Smash days. $_shareUrl",
      subject: 'Join me on GetGuac',
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Invite friends')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                if (_error != null)
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: const Color(0xFFfee2e2),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(_error!,
                        style: const TextStyle(color: Color(0xFF991b1b))),
                  ),
                if (_error == null) ...[
                  // Big code card
                  Container(
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                        colors: [Color(0xFF10b981), Color(0xFF047857)],
                      ),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'YOUR INVITE CODE',
                          style: TextStyle(
                            color: Color(0xFFd1fae5),
                            fontSize: 11,
                            fontWeight: FontWeight.w800,
                            letterSpacing: 2,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Row(
                          children: [
                            Expanded(
                              child: SelectableText(
                                _code ?? '——————',
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 34,
                                  fontWeight: FontWeight.w900,
                                  letterSpacing: 8,
                                  fontFeatures: [FontFeature.tabularFigures()],
                                ),
                              ),
                            ),
                            if (_code != null)
                              IconButton(
                                icon: const Icon(Icons.copy, color: Colors.white),
                                tooltip: 'Copy code',
                                onPressed: () => _copy(_code!, 'Code'),
                              ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Share link card
                  Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: const Color(0xFFe5e7eb)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('SHAREABLE LINK',
                            style: TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.w800,
                                color: Colors.black54,
                                letterSpacing: 1.5)),
                        const SizedBox(height: 6),
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 10, vertical: 8),
                          decoration: BoxDecoration(
                            color: const Color(0xFFf3f4f6),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Row(
                            children: [
                              Expanded(
                                child: Text(
                                  _shareUrl,
                                  style: const TextStyle(
                                      fontFamily: 'monospace', fontSize: 12),
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                              IconButton(
                                icon: const Icon(Icons.copy, size: 18),
                                onPressed: () => _copy(_shareUrl, 'Link'),
                                tooltip: 'Copy link',
                                visualDensity: VisualDensity.compact,
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 10),
                        SizedBox(
                          width: double.infinity,
                          child: FilledButton.icon(
                            onPressed: _code == null ? null : _share,
                            icon: const Icon(Icons.ios_share),
                            label: const Text('Share'),
                            style: FilledButton.styleFrom(
                              backgroundColor: const Color(0xFF15803d),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 16),

                  // Reward explanation
                  Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: const Color(0xFFd1fae5),
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: const Color(0xFFa7f3d0)),
                    ),
                    child: const Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('How the reward works',
                            style: TextStyle(
                                fontWeight: FontWeight.w800,
                                fontSize: 14,
                                color: Color(0xFF064e3b))),
                        SizedBox(height: 6),
                        Text(
                          '• Share your code with a friend.\n'
                          '• They sign up at getguac.app and the code goes with them.\n'
                          '• On their first dashboard load, you each get '
                          '$_rewardDays Smash days on your 🔥 streak.\n'
                          '• One bonus per new user. Self-referrals don\'t count.',
                          style: TextStyle(
                              fontSize: 12,
                              height: 1.5,
                              color: Color(0xFF065f46)),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 20),

                  // Past invites
                  const Text('PEOPLE YOU\'VE INVITED',
                      style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w800,
                          color: Colors.black54,
                          letterSpacing: 1.5)),
                  const SizedBox(height: 8),
                  if (_sentRefs.isEmpty)
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: const Color(0xFFe5e7eb)),
                      ),
                      child: const Row(
                        children: [
                          Icon(Icons.person_add_alt_1,
                              color: Colors.black38, size: 20),
                          SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              'No one yet — share your code above to get started.',
                              style: TextStyle(
                                  color: Colors.black54, fontSize: 13),
                            ),
                          ),
                        ],
                      ),
                    )
                  else
                    ..._sentRefs.map(_refRow),
                ],
              ],
            ),
    );
  }

  Widget _refRow(Map<String, dynamic> r) {
    final credited = r['credited_at'] != null;
    final reward = (r['reward_smash_days'] ?? _rewardDays) as int;
    final created = DateTime.tryParse(r['created_at']?.toString() ?? '');
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: const Color(0xFFe5e7eb)),
        ),
        child: Row(
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: credited ? const Color(0xFFd1fae5) : const Color(0xFFfef3c7),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Icon(
                credited ? Icons.check_circle : Icons.hourglass_top,
                color: credited ? const Color(0xFF15803d) : const Color(0xFFca8a04),
                size: 22,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Friend signed up with ${r['code']}',
                    style: const TextStyle(
                        fontWeight: FontWeight.w800, fontSize: 13),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    credited
                        ? 'Credited · +$reward Smash days each'
                        : 'Pending',
                    style: TextStyle(
                      fontSize: 11,
                      color: credited
                          ? const Color(0xFF065f46)
                          : const Color(0xFF92400e),
                    ),
                  ),
                  if (created != null)
                    Text(
                      '${created.year}-${created.month.toString().padLeft(2, '0')}-${created.day.toString().padLeft(2, '0')}',
                      style: const TextStyle(fontSize: 11, color: Colors.black45),
                    ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
