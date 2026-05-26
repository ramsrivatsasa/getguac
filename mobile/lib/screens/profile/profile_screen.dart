import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../providers/auth_provider.dart';
import '../../services/biometric_service.dart';
import '../../services/update_service.dart';
import '../../services/debug_log.dart';
import '../../widgets/guac_mascot.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});
  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  bool _bioCapable = false;
  bool _bioEnabled = false;

  @override
  void initState() {
    super.initState();
    _checkBiometric();
  }

  Future<void> _checkBiometric() async {
    final capable = await BiometricService.isDeviceCapable();
    final enabled = await BiometricService.isEnabled();
    if (mounted) setState(() { _bioCapable = capable; _bioEnabled = enabled; });
  }

  Future<void> _toggleBiometric() async {
    final auth = context.read<AppAuthProvider>();
    final email = auth.currentUser?.email;
    if (email == null) return;

    if (_bioEnabled) {
      // Disable — just wipe the stored creds
      await BiometricService.disable();
      if (mounted) {
        setState(() => _bioEnabled = false);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Biometric unlock disabled.')),
        );
      }
      return;
    }

    // Enable — need the password to stash. Ask the user.
    final pwCtrl = TextEditingController();
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Enable biometric unlock'),
        content: Column(mainAxisSize: MainAxisSize.min, children: [
          Text('Enter your current password to enable fingerprint/face unlock for $email.',
            style: const TextStyle(fontSize: 12, color: Colors.black54)),
          const SizedBox(height: 12),
          TextField(
            controller: pwCtrl,
            obscureText: true,
            autofocus: true,
            decoration: const InputDecoration(labelText: 'Password'),
          ),
        ]),
        actions: [
          TextButton(onPressed: () => Navigator.of(ctx).pop(false), child: const Text('Cancel')),
          FilledButton(onPressed: () => Navigator.of(ctx).pop(true), child: const Text('Enable')),
        ],
      ),
    );
    final password = pwCtrl.text;
    pwCtrl.dispose();
    if (ok != true || password.isEmpty || !mounted) return;

    // Verify the password works (try sign in) — never store invalid creds
    try {
      await auth.login(email, password);
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Password check failed: $e')),
      );
      return;
    }

    // Now prompt biometric — confirms the user has a finger/face enrolled
    final creds = await BiometricService.authenticate();
    if (creds != null) {
      // Bio test passed but creds were null (none stored yet) — store them now anyway
    }
    final err = await BiometricService.enable(email, password);
    if (mounted) {
      if (err == null) {
        setState(() => _bioEnabled = true);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Biometric unlock enabled. Sign out + back in to test.')),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Could not store credentials: $err')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AppAuthProvider>();
    final user = auth.currentUser;
    final email = user?.email ?? '—';
    final uid = user?.id ?? '—';
    final firstName = auth.userProfile?['first_name'] ?? '';
    final lastName = auth.userProfile?['last_name'] ?? '';
    final alias = auth.userProfile?['email_alias'];
    final hasAlias = alias != null && alias.toString().isNotEmpty;
    final aliasStr = hasAlias ? alias.toString() : '';
    final personal = hasAlias ? '$aliasStr@getguac.app' : '';
    final receipts = hasAlias ? '$aliasStr+g@getguac.app' : '';

    return Scaffold(
      appBar: AppBar(
        title: const Text('Profile'),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            tooltip: 'Sign out',
            onPressed: () => _signOut(context),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          const Center(child: GuacMascot(size: 110)),
          const SizedBox(height: 12),
          if (firstName.toString().isNotEmpty)
            Center(child: Text('$firstName $lastName'.trim(),
              style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800))),
          const SizedBox(height: 16),
          _Row(label: 'Email', value: email),
          const Divider(),
          _Row(label: 'User ID', value: uid.length > 12 ? '${uid.substring(0, 8)}…' : uid),
          const SizedBox(height: 24),

          if (hasAlias) ...[
            // Personal mailbox card
            _MailCard(
              icon: Icons.alternate_email,
              iconColor: const Color(0xFF15803d),
              iconBg: const Color(0xFFd1fae5),
              header: 'PERSONAL MAILBOX',
              address: personal,
              hint: 'Your private inbox. GetGuac never reads it.',
            ),
            const SizedBox(height: 10),
            // Receipts hook card
            _MailCard(
              icon: Icons.markunread_mailbox,
              iconColor: const Color(0xFFca8a04),
              iconBg: const Color(0xFFfef3c7),
              header: '🥑 RECEIPTS HOOK',
              address: receipts,
              hint: 'Forward order confirmations here — Guac-AI auto-creates the receipt within 10 minutes.',
            ),
            const SizedBox(height: 10),
          ] else
            Card(
              child: ListTile(
                leading: const Icon(Icons.alternate_email, color: Color(0xFF15803d)),
                title: const Text('Pick your @getguac.app email', style: TextStyle(fontWeight: FontWeight.w700)),
                subtitle: const Text('Open the picker on getguac.app'),
                trailing: const Icon(Icons.open_in_new),
                onTap: () => UpdateService.openDownload('https://getguac.app/profile'),
              ),
            ),

          const SizedBox(height: 20),
          _SectionHeader(label: 'Your Guac-AI'),
          const SizedBox(height: 6),

          // Colorful pill grid — matches the dashboard
          Row(children: [
            Expanded(child: _Pill(
              gradient: const [Color(0xFFfbbf24), Color(0xFFf59e0b), Color(0xFFe11d48)],
              emoji: '🥑', title: 'Worth It?', subtitle: 'Rate every purchase',
              onTap: () => context.go('/receipts'),
            )),
            const SizedBox(width: 10),
            Expanded(child: _Pill(
              gradient: const [Color(0xFF22c55e), Color(0xFF15803d)],
              icon: Icons.auto_awesome, title: 'GuacScore', subtitle: 'Spending grade',
              onTap: () => context.go('/guacscore'),
            )),
          ]),
          const SizedBox(height: 10),
          Row(children: [
            Expanded(child: _Pill(
              gradient: const [Color(0xFFfcd34d), Color(0xFFca8a04)],
              icon: Icons.mark_email_unread_rounded, title: 'Inbox', subtitle: 'Mail + auto-receipts',
              onTap: () => context.go('/inbox'),
            )),
            const SizedBox(width: 10),
            Expanded(child: _Pill(
              gradient: const [Color(0xFFa78bfa), Color(0xFF7c3aed)],
              icon: Icons.auto_fix_high, title: 'GuacWizard', subtitle: 'Bank Bite + insights',
              onTap: () => context.go('/guacwizard'),
            )),
          ]),
          const SizedBox(height: 10),
          Row(children: [
            Expanded(child: _Pill(
              gradient: const [Color(0xFFf472b6), Color(0xFFdb2777)],
              icon: Icons.card_giftcard_rounded, title: 'Rewards', subtitle: 'Loyalty + expiring',
              onTap: () => context.go('/rewards'),
            )),
            const SizedBox(width: 10),
            Expanded(child: _Pill(
              gradient: const [Color(0xFFfde047), Color(0xFFca8a04)],
              icon: Icons.inventory_2, title: 'Stash', subtitle: 'Everything you own',
              onTap: () => context.go('/stash'),
            )),
          ]),
          const SizedBox(height: 10),
          Row(children: [
            Expanded(child: _Pill(
              gradient: const [Color(0xFFf9a8d4), Color(0xFFdb2777)],
              icon: Icons.local_offer, title: 'Steals', subtitle: 'AI price hunt',
              onTap: () => context.go('/steals'),
            )),
            const SizedBox(width: 10),
            Expanded(child: _Pill(
              gradient: const [Color(0xFF67e8f9), Color(0xFF0891b2)],
              icon: Icons.directions_car_filled_rounded, title: 'Car Miles', subtitle: 'Trip log',
              onTap: () => context.go('/car-miles'),
            )),
          ]),

          const SizedBox(height: 18),
          _SectionHeader(label: 'More'),
          const SizedBox(height: 6),

          // Biometric toggle — only shows on devices that support it
          if (_bioCapable)
            Container(
              margin: const EdgeInsets.only(bottom: 10),
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: _bioEnabled ? const Color(0xFFa7f3d0) : const Color(0xFFe5e7eb)),
              ),
              child: Row(children: [
                Container(
                  width: 40, height: 40,
                  decoration: BoxDecoration(
                    color: _bioEnabled ? const Color(0xFFd1fae5) : const Color(0xFFf3f4f6),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Icon(Icons.fingerprint, color: _bioEnabled ? const Color(0xFF15803d) : Colors.black45, size: 22),
                ),
                const SizedBox(width: 12),
                Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  const Text('Biometric unlock', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 14)),
                  Text(
                    _bioEnabled ? 'Active — sign in with fingerprint / face' : 'Tap to enable fingerprint / face login',
                    style: const TextStyle(fontSize: 11, color: Colors.black54),
                  ),
                ])),
                Switch.adaptive(
                  value: _bioEnabled,
                  onChanged: (_) => _toggleBiometric(),
                  activeColor: const Color(0xFF15803d),
                ),
              ]),
            ),

          // Diagnose button — shows the state PLUS a side-by-side of the
          // currently signed-in email vs the email biometric has stored, so
          // the user can confirm the right account is saved.
          TextButton.icon(
            onPressed: () async {
              final current = context.read<AppAuthProvider>().currentUser?.email;
              final result = await BiometricService.diagnose();
              final stored = await BiometricService.storedEmail();
              if (!context.mounted) return;
              final matches = stored != null && current != null
                  && stored.toLowerCase() == current.toLowerCase();
              showDialog(
                context: context,
                builder: (ctx) => AlertDialog(
                  title: const Text('Biometric diagnostic'),
                  content: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(result, style: const TextStyle(fontSize: 13, height: 1.4)),
                      const SizedBox(height: 14),
                      const Divider(height: 1),
                      const SizedBox(height: 10),
                      const Text('Account match',
                        style: TextStyle(fontWeight: FontWeight.w800, fontSize: 13, color: Color(0xFF065f46))),
                      const SizedBox(height: 6),
                      _kv('Signed in as', current ?? '(no session)'),
                      _kv('Biometric stored for', stored ?? '(none stored)'),
                      const SizedBox(height: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                        decoration: BoxDecoration(
                          color: matches ? const Color(0xFFdcfce7) : const Color(0xFFfee2e2),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          matches
                            ? '✓ Same account — biometric will sign you in as the right user.'
                            : (stored == null
                                ? 'No biometric credentials stored. Sign out + sign back in with "Remember me" checked.'
                                : '✗ Stored credentials are for a DIFFERENT account. Tap "Clear stored credentials" below, then sign in again to re-save.'),
                          style: TextStyle(
                            fontSize: 11,
                            color: matches ? const Color(0xFF065f46) : const Color(0xFF991b1b),
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                    ],
                  ),
                  actions: [
                    if (stored != null)
                      TextButton(
                        onPressed: () async {
                          await BiometricService.disable();
                          if (!ctx.mounted) return;
                          Navigator.of(ctx).pop();
                          if (mounted) {
                            setState(() => _bioEnabled = false);
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(content: Text('Stored biometric credentials cleared.')),
                            );
                          }
                        },
                        child: const Text('Clear stored credentials',
                          style: TextStyle(color: Color(0xFF991b1b))),
                      ),
                    TextButton(onPressed: () => Navigator.of(ctx).pop(), child: const Text('OK')),
                  ],
                ),
              );
            },
            icon: const Icon(Icons.health_and_safety_outlined, size: 16),
            label: const Text('Diagnose biometric'),
          ),

          // Debug log — surfaces the in-app event log AND uploads it to the
          // server so we can triage failures without the user having to read
          // anything out loud.
          TextButton.icon(
            onPressed: () => _showDebugLog(),
            icon: const Icon(Icons.bug_report_outlined, size: 16),
            label: const Text('View / upload debug log'),
          ),

          Row(children: [
            Expanded(child: _Pill(
              gradient: const [Color(0xFFa7f3d0), Color(0xFF15803d)],
              icon: Icons.shield_outlined, title: 'Security', subtitle: 'Encryption + privacy',
              onTap: () => UpdateService.openDownload('https://getguac.app/security'),
            )),
            const SizedBox(width: 10),
            Expanded(child: _Pill(
              gradient: const [Color(0xFFcbd5e1), Color(0xFF64748b)],
              icon: Icons.privacy_tip, title: 'Privacy', subtitle: 'Manage on web',
              onTap: () => UpdateService.openDownload('https://getguac.app/profile'),
            )),
          ]),

          const SizedBox(height: 24),
          FilledButton.tonalIcon(
            onPressed: () => _signOut(context),
            icon: const Icon(Icons.logout),
            label: const Text('Sign out'),
          ),
        ],
      ),
    );
  }

  Future<void> _signOut(BuildContext context) async {
    await context.read<AppAuthProvider>().logout();
    if (context.mounted) context.go('/login');
    // (We don't bounce to getguac.app/ on mobile — staying in the app feels
    //  more natural. The login screen is already the in-app welcome surface.)
  }

  Future<void> _showDebugLog() async {
    // Snapshot the live state into the log so there's always something useful
    // to inspect even on a fresh install where no flow has fired yet.
    final email = context.read<AppAuthProvider>().currentUser?.email;
    final storedBio = await BiometricService.storedEmail();
    DebugLog.event('diagnose', 'snapshot', meta: {
      'signed_in_email_domain': email == null ? null : email.replaceAll(RegExp(r'^[^@]+'), '*'),
      'stored_bio_email_domain': storedBio == null ? null : storedBio.replaceAll(RegExp(r'^[^@]+'), '*'),
      'has_session': Supabase.instance.client.auth.currentSession != null,
    });
    // Upload first so the displayed count reflects reality. Fire-and-forget
    // is fine; we always show the local buffer text either way.
    final upload = await DebugLog.uploadPending();
    if (!mounted) return;
    final text = DebugLog.formatText(lastN: 200);
    showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Debug log'),
        content: SizedBox(
          width: double.maxFinite,
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              decoration: BoxDecoration(
                color: upload.ok ? const Color(0xFFdcfce7) : const Color(0xFFfee2e2),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                upload.ok
                  ? 'Uploaded ${upload.uploaded} new event${upload.uploaded == 1 ? "" : "s"} to server. Total in buffer: ${DebugLog.events().length}.'
                  : 'Upload failed (${upload.error}). ${DebugLog.events().length} events buffered locally.',
                style: TextStyle(
                  fontSize: 11,
                  color: upload.ok ? const Color(0xFF065f46) : const Color(0xFF991b1b),
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
            const SizedBox(height: 10),
            Flexible(
              child: Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: const Color(0xFFf3f4f6),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: SingleChildScrollView(
                  child: SelectableText(
                    text.isEmpty ? '(no events recorded yet)' : text,
                    style: const TextStyle(fontFamily: 'monospace', fontSize: 10, height: 1.35),
                  ),
                ),
              ),
            ),
          ]),
        ),
        actions: [
          TextButton(
            onPressed: () async {
              await Clipboard.setData(ClipboardData(text: text));
              if (ctx.mounted) ScaffoldMessenger.of(ctx).showSnackBar(
                const SnackBar(content: Text('Log copied to clipboard.')),
              );
            },
            child: const Text('Copy'),
          ),
          TextButton(
            onPressed: () async {
              final r = await DebugLog.uploadPending();
              if (!ctx.mounted) return;
              ScaffoldMessenger.of(ctx).showSnackBar(
                SnackBar(content: Text(r.ok
                  ? 'Uploaded ${r.uploaded} more event${r.uploaded == 1 ? "" : "s"}.'
                  : 'Upload failed: ${r.error}')),
              );
            },
            child: const Text('Upload again'),
          ),
          TextButton(onPressed: () => Navigator.of(ctx).pop(), child: const Text('Close')),
        ],
      ),
    );
  }

  Widget _kv(String label, String value) => Padding(
    padding: const EdgeInsets.only(bottom: 4),
    child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
      SizedBox(
        width: 110,
        child: Text(label,
          style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Colors.black54)),
      ),
      Expanded(
        child: Text(value,
          style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFF064e3b))),
      ),
    ]),
  );
}

class _Row extends StatelessWidget {
  final String label;
  final String value;
  const _Row({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        children: [
          Text(label, style: const TextStyle(color: Colors.black54)),
          const Spacer(),
          Text(value, style: const TextStyle(fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }
}

class _SectionHeader extends StatelessWidget {
  final String label;
  const _SectionHeader({required this.label});
  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(left: 4, top: 4, bottom: 6),
      child: Text(label,
        style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800,
          color: Color(0xFF15803d), letterSpacing: 1.2)),
    );
  }
}

class _Pill extends StatelessWidget {
  final List<Color> gradient;
  final IconData? icon;
  final String? emoji;
  final String title;
  final String subtitle;
  final VoidCallback onTap;
  const _Pill({
    required this.gradient, this.icon, this.emoji,
    required this.title, required this.subtitle, required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(40),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        decoration: BoxDecoration(
          gradient: LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight, colors: gradient),
          borderRadius: BorderRadius.circular(40),
          boxShadow: [BoxShadow(color: gradient.last.withValues(alpha: 0.35), blurRadius: 8, offset: const Offset(0, 3))],
        ),
        child: Row(mainAxisSize: MainAxisSize.min, children: [
          if (emoji != null) Text(emoji!, style: const TextStyle(fontSize: 22)),
          if (icon != null) Icon(icon, size: 22, color: Colors.white),
          const SizedBox(width: 8),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [
            Text(title, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 14, height: 1.0)),
            const SizedBox(height: 2),
            Text(subtitle, style: TextStyle(color: Colors.white.withValues(alpha: 0.92), fontSize: 10, height: 1.0), overflow: TextOverflow.ellipsis),
          ])),
          const Icon(Icons.arrow_forward, size: 16, color: Colors.white),
        ]),
      ),
    );
  }
}

class _MenuTile extends StatelessWidget {
  final IconData icon;
  final Color iconColor;
  final Color iconBg;
  final String title;
  final String? subtitle;
  final Widget? trailing;
  final VoidCallback onTap;
  const _MenuTile({
    required this.icon, required this.iconColor, required this.iconBg,
    required this.title, this.subtitle, this.trailing, required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Material(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(14),
          child: Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(14),
              boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 4)],
            ),
            child: Row(children: [
              Container(
                width: 40, height: 40,
                decoration: BoxDecoration(color: iconBg, borderRadius: BorderRadius.circular(10)),
                child: Icon(icon, color: iconColor, size: 20),
              ),
              const SizedBox(width: 12),
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(title, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800)),
                if (subtitle != null) Text(subtitle!, style: const TextStyle(fontSize: 11, color: Colors.black54)),
              ])),
              trailing ?? const Icon(Icons.chevron_right, color: Colors.black26),
            ]),
          ),
        ),
      ),
    );
  }
}

class _MailCard extends StatelessWidget {
  final IconData icon;
  final Color iconColor;
  final Color iconBg;
  final String header;
  final String address;
  final String hint;
  const _MailCard({required this.icon, required this.iconColor, required this.iconBg, required this.header, required this.address, required this.hint});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 6)],
      ),
      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Container(
          width: 44, height: 44,
          decoration: BoxDecoration(color: iconBg, borderRadius: BorderRadius.circular(12)),
          child: Icon(icon, color: iconColor),
        ),
        const SizedBox(width: 12),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(header, style: TextStyle(fontSize: 10, color: iconColor, fontWeight: FontWeight.w800, letterSpacing: 1)),
          const SizedBox(height: 4),
          Text(address, style: const TextStyle(fontFamily: 'monospace', fontWeight: FontWeight.w800, fontSize: 13)),
          const SizedBox(height: 4),
          Text(hint, style: const TextStyle(fontSize: 11, color: Colors.black54, height: 1.3)),
        ])),
        IconButton(
          icon: const Icon(Icons.copy, size: 18),
          onPressed: () async {
            await Clipboard.setData(ClipboardData(text: address));
            if (context.mounted) {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Copied'), duration: Duration(seconds: 1)),
              );
            }
          },
          tooltip: 'Copy',
        ),
      ]),
    );
  }
}
