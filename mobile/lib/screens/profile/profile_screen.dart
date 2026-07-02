import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../providers/auth_provider.dart';
import '../../services/biometric_service.dart';
import '../../services/update_service.dart';
import '../../services/debug_log.dart';
import '../../services/premium_service.dart';
import '../../services/purchase_service.dart';
import '../../widgets/animated_mascot.dart';
import '../../widgets/animated_primitives.dart';
import '../../widgets/top_app_bar_actions.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});
  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  bool _bioCapable = false;
  bool _bioEnabled = false;
  // profiles.email_auto_delete_after_import — opt-in toggle controlling
  // whether the poll route hard-deletes the upstream copy after import.
  // Off by default: imports get moved to the "Guacked" archive folder so
  // they stay readable in webmail.
  bool _autoDelete = false;
  bool _autoDeleteLoading = true;

  @override
  void initState() {
    super.initState();
    _checkBiometric();
    _loadAutoDelete();
  }

  Future<void> _loadAutoDelete() async {
    try {
      final sb = Supabase.instance.client;
      final uid = sb.auth.currentUser?.id;
      if (uid == null) return;
      final row = await sb
          .from('profiles')
          .select('email_auto_delete_after_import')
          .eq('id', uid)
          .maybeSingle();
      if (!mounted) return;
      setState(() {
        _autoDelete = row?['email_auto_delete_after_import'] == true;
        _autoDeleteLoading = false;
      });
    } catch (_) {
      if (mounted) setState(() => _autoDeleteLoading = false);
    }
  }

  Future<void> _setAutoDelete(bool next) async {
    final sb = Supabase.instance.client;
    final uid = sb.auth.currentUser?.id;
    if (uid == null) return;
    // First-time enable: show a clear explanation of what changes.
    if (next && !_autoDelete) {
      final ok = await showDialog<bool>(
        context: context,
        builder: (ctx) => AlertDialog(
          title: const Text('Auto-delete from mail server?'),
          content: const Text(
            "Once on, every imported email is permanently removed from your "
            "@getguac.app mailbox after we save it. Webmail won't see them "
            "anymore — only GetGuac will.\n\n"
            "With this off (recommended for most people), imports are moved "
            "to a 'Guacked' archive folder on the mail server so you can "
            "still read them in webmail any time.",
            style: TextStyle(height: 1.4),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.of(ctx).pop(false), child: const Text('Cancel')),
            FilledButton(
              style: FilledButton.styleFrom(backgroundColor: const Color(0xFFb91c1c)),
              onPressed: () => Navigator.of(ctx).pop(true),
              child: const Text('Turn on'),
            ),
          ],
        ),
      );
      if (ok != true) return;
    }
    try {
      await sb.from('profiles').update({'email_auto_delete_after_import': next}).eq('id', uid);
      if (!mounted) return;
      setState(() => _autoDelete = next);
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(next
            ? 'Auto-delete ON. Future imports will be removed from your mailbox.'
            : 'Auto-delete OFF. Future imports will move to the Guacked archive.'),
        duration: const Duration(seconds: 3),
      ));
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Could not save setting: $e')),
      );
    }
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
      appBar: ggAppBar(context, 'Profile'),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          const Center(child: AnimatedMascot(size: 110, idle: true)),
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

          const _PremiumCard(),

          const SizedBox(height: 20),
          _SectionHeader(label: 'My Activity'),
          const SizedBox(height: 8),
          _VRow(
            tint: const Color(0xFFfef3c7),
            icon: '🥑', title: 'Worth It?',
            subtitle: 'Rate every purchase',
            onTap: () => context.push('/receipts'),
          ),
          _VRow(
            tint: const Color(0xFFd1fae5),
            iconWidget: const Icon(Icons.auto_awesome, color: Color(0xFF15803d)),
            title: 'GuacScore',
            subtitle: 'Spending grade',
            onTap: () => context.push('/guacscore'),
          ),
          _VRow(
            tint: const Color(0xFFede9fe),
            iconWidget: const Icon(Icons.auto_fix_high, color: Color(0xFF7c3aed)),
            title: 'GuacWizard',
            subtitle: 'Bank Bite + insights',
            onTap: () => context.push('/guacwizard'),
          ),

          const SizedBox(height: 20),
          _SectionHeader(label: 'Money'),
          const SizedBox(height: 8),
          _VRow(
            tint: const Color(0xFFd1fae5),
            iconWidget: const Icon(Icons.bar_chart_rounded, color: Color(0xFF15803d)),
            title: 'Reports',
            subtitle: 'Monthly totals + lifetime spend',
            onTap: () => context.push('/reports'),
          ),
          _VRow(
            tint: const Color(0xFFfee2e2),
            iconWidget: const Icon(Icons.undo_rounded, color: Color(0xFFb91c1c)),
            title: 'Returns',
            subtitle: 'Open refund windows',
            onTap: () => context.push('/returns'),
          ),
          _VRow(
            tint: const Color(0xFFfce7f3),
            iconWidget: const Icon(Icons.card_giftcard_rounded, color: Color(0xFFdb2777)),
            title: 'Rewards',
            subtitle: 'Loyalty + expiring',
            onTap: () => context.push('/rewards'),
          ),
          _VRow(
            tint: const Color(0xFFd1fae5),
            iconWidget: const Icon(Icons.person_add_alt_1, color: Color(0xFF15803d)),
            title: 'Invite friends',
            subtitle: '3 Smash days each when they sign up',
            onTap: () => context.push('/invite'),
          ),

          const SizedBox(height: 20),
          _SectionHeader(label: 'Shop'),
          const SizedBox(height: 8),
          _VRow(
            tint: const Color(0xFFdbeafe),
            iconWidget: const Icon(Icons.storefront_rounded, color: Color(0xFF1d4ed8)),
            title: 'Stores',
            subtitle: 'Spend by store',
            onTap: () => context.push('/stores'),
          ),
          _VRow(
            tint: const Color(0xFFfef3c7),
            iconWidget: const Icon(Icons.inventory_2, color: Color(0xFFca8a04)),
            title: 'Stash',
            subtitle: 'Everything you own',
            onTap: () => context.push('/stash'),
          ),
          _VRow(
            tint: const Color(0xFFfce7f3),
            iconWidget: const Icon(Icons.local_offer, color: Color(0xFFdb2777)),
            title: 'Steals',
            subtitle: 'AI price hunt',
            onTap: () => context.push('/steals'),
          ),

          const SizedBox(height: 20),
          _SectionHeader(label: 'Mail & retailers'),
          const SizedBox(height: 8),
          _VRow(
            tint: const Color(0xFFd1fae5),
            iconWidget: const Icon(Icons.link_rounded, color: Color(0xFF15803d)),
            title: 'Connections',
            subtitle: '37 retailers · auto-pull receipts',
            onTap: () => context.push('/connections'),
          ),
          _VRow(
            tint: const Color(0xFFbae6fd),
            iconWidget: const Icon(Icons.mark_email_unread_rounded, color: Color(0xFF0369a1)),
            title: 'Inbox',
            subtitle: 'Mail + auto-receipts',
            onTap: () => context.push('/inbox'),
          ),

          const SizedBox(height: 20),
          _SectionHeader(label: 'Settings'),
          const SizedBox(height: 8),

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

          // Mailbox section — explains the Guacked archive, offers a
          // webmail link so users can verify nothing is hidden, and exposes
          // the auto-delete toggle for users who want a single copy.
          const SizedBox(height: 18),
          Container(
            padding: const EdgeInsets.fromLTRB(14, 12, 14, 14),
            decoration: BoxDecoration(
              color: const Color(0xFFf0fdf4),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: const Color(0xFFa7f3d0)),
            ),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              const Row(children: [
                Icon(Icons.mail_outline, size: 18, color: Color(0xFF065f46)),
                SizedBox(width: 8),
                Text('Mailbox',
                  style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: Color(0xFF064e3b))),
              ]),
              const SizedBox(height: 6),
              const Text(
                'Imports land in a "Guacked" folder on your mail server so your inbox stays clean.',
                style: TextStyle(fontSize: 11, color: Color(0xFF065f46), height: 1.4),
              ),
              const SizedBox(height: 10),
              IgnorePointer(
                ignoring: _autoDeleteLoading,
                child: Opacity(
                  opacity: _autoDeleteLoading ? 0.5 : 1,
                  child: SwitchListTile(
                    contentPadding: EdgeInsets.zero,
                    dense: true,
                    value: _autoDelete,
                    onChanged: _setAutoDelete,
                    activeColor: const Color(0xFFb91c1c),
                    title: const Text('Auto-delete from mail server after import',
                      style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFF064e3b))),
                    subtitle: Text(
                      _autoDelete
                          ? 'Imports are permanently removed from your mailbox after we save them.'
                          : 'Imports are filed under "Guacked" on your mail server.',
                      style: const TextStyle(fontSize: 10, color: Color(0xFF065f46)),
                    ),
                  ),
                ),
              ),
            ]),
          ),

          // Settings rows continued — Security + Privacy as single
          // vertical rows so they line up with the rest of the
          // simplified layout. Debug log + Report a problem removed
          // from this surface (advanced support actions don't belong
          // in everyday Profile chrome).
          _VRow(
            tint: const Color(0xFFd1fae5),
            iconWidget: const Icon(Icons.shield_outlined, color: Color(0xFF15803d)),
            title: 'Security',
            subtitle: 'Encryption + privacy',
            onTap: () => UpdateService.openDownload('https://getguac.app/security'),
          ),
          _VRow(
            tint: const Color(0xFFe2e8f0),
            iconWidget: const Icon(Icons.privacy_tip, color: Color(0xFF475569)),
            title: 'Privacy',
            subtitle: 'Manage on web',
            onTap: () => UpdateService.openDownload('https://getguac.app/profile'),
          ),

          const SizedBox(height: 20),
          // Sign-out + Check-for-update share a pill row so both
          // operations sit at the same visual altitude. Update is
          // first since it's the more common action; sign-out
          // keeps the danger-red treatment.
          Row(children: [
            OutlinedButton.icon(
              onPressed: () => _checkForUpdate(context),
              icon: const Icon(Icons.system_update_alt, size: 12),
              label: const Text('Check for update',
                style: TextStyle(fontWeight: FontWeight.w700, fontSize: 11)),
              style: OutlinedButton.styleFrom(
                foregroundColor: const Color(0xFF15803d),
                side: const BorderSide(color: Color(0xFFA7F3D0), width: 1),
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 2),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                minimumSize: const Size(0, 26),
                tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                visualDensity: VisualDensity.compact,
              ),
            ),
            const SizedBox(width: 8),
            OutlinedButton.icon(
              onPressed: () => _signOut(context),
              icon: const Icon(Icons.logout, size: 12),
              label: const Text('Sign out',
                style: TextStyle(fontWeight: FontWeight.w700, fontSize: 11)),
              style: OutlinedButton.styleFrom(
                foregroundColor: const Color(0xFF991b1b),
                side: const BorderSide(color: Color(0xFFFCA5A5), width: 1),
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 2),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                minimumSize: const Size(0, 26),
                tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                visualDensity: VisualDensity.compact,
              ),
            ),
          ]),
        ],
      ),
    );
  }

  Future<void> _checkForUpdate(BuildContext context) async {
    // Show a quick "Checking…" snackbar so the tap doesn't feel
    // dead while the manifest fetch is in flight.
    final messenger = ScaffoldMessenger.of(context);
    messenger.showSnackBar(const SnackBar(
      duration: Duration(milliseconds: 1500),
      content: Text('Checking for update…'),
    ));
    final upd = await UpdateService.checkForUpdate();
    if (!context.mounted) return;
    if (upd == null) {
      messenger.hideCurrentSnackBar();
      messenger.showSnackBar(const SnackBar(
        backgroundColor: Color(0xFF065f46),
        content: Text("You're on the latest version 🥑"),
      ));
      return;
    }
    // Match the auto-prompt dialog from main_scaffold so the user
    // gets the same experience whether the check fires
    // automatically or via this button.
    final installNow = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('${upd.tag} available'),
        content: Text(upd.releaseNotes?.isNotEmpty == true
          ? upd.releaseNotes!
          : 'A newer version of GetGuac is ready to install.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Later')),
          FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Install now')),
        ],
      ),
    );
    if (installNow != true || !context.mounted) return;
    final ok = await UpdateService.downloadAndInstall(upd.downloadUrl);
    if (!ok && context.mounted) {
      // Fall back to browser download if the in-app install fails.
      await UpdateService.openDownload(upd.downloadUrl);
    }
  }

  Future<void> _signOut(BuildContext context) async {
    await context.read<AppAuthProvider>().logout();
    if (context.mounted) context.go('/login');
    // (We don't bounce to getguac.app/ on mobile — staying in the app feels
    //  more natural. The login screen is already the in-app welcome surface.)
  }

  // Debug log dialog — kept for potential future reuse from a hidden
  // gesture or settings sub-page, but no longer surfaced in the
  // everyday Profile UI. Suppressed unused-element warning.
  // ignore: unused_element
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

// GetGuac Premium card — buy/restore the ad-free (Tier-2) subscription, or
// show active status. Tier-1 ads stay free for everyone.
class _PremiumCard extends StatelessWidget {
  const _PremiumCard();

  @override
  Widget build(BuildContext context) {
    final premium = context.watch<PremiumService>();

    if (premium.isPremium) {
      final until = premium.premiumUntil;
      final renew = until == null ? '' : until.toLocal().toString().split(' ').first;
      return Card(
        color: const Color(0xFFecfdf5),
        child: ListTile(
          leading: const Icon(Icons.workspace_premium, color: Color(0xFF15803d)),
          title: const Text('GetGuac Premium — active',
              style: TextStyle(fontWeight: FontWeight.w800)),
          subtitle: Text(renew.isEmpty ? 'Extra ads removed. Thank you!' : 'Extra ads removed · renews $renew'),
        ),
      );
    }

    final price = PurchaseService.instance.premiumPrice;
    return Card(
      color: const Color(0xFFf0fdf4),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(children: [
              const Icon(Icons.workspace_premium, color: Color(0xFFca8a04)),
              const SizedBox(width: 8),
              const Expanded(
                child: Text('GetGuac Premium',
                    style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
              ),
            ]),
            const SizedBox(height: 4),
            const Text('Subscribe and the extra ads come off automatically — no settings to change. Tier-1 ads stay free for everyone.',
                style: TextStyle(color: Colors.black54, fontSize: 13)),
            const SizedBox(height: 12),
            Row(children: [
              Expanded(
                child: FilledButton.icon(
                  icon: const Icon(Icons.lock_open, size: 18),
                  label: Text(price == null ? 'Go ad-free' : 'Go ad-free · $price'),
                  onPressed: () async {
                    final ok = await PurchaseService.instance.buyPremium();
                    if (!ok && context.mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Premium isn\'t available right now.')),
                      );
                    }
                  },
                ),
              ),
              const SizedBox(width: 8),
              TextButton(
                onPressed: () => PurchaseService.instance.restore(),
                child: const Text('Restore'),
              ),
            ]),
            // Live flow status — "Activating…", pending, or a failure nudge to
            // tap Restore. Never leaves a paid purchase silent.
            ValueListenableBuilder<String?>(
              valueListenable: PurchaseService.instance.status,
              builder: (_, msg, __) => (msg == null)
                  ? const SizedBox.shrink()
                  : Padding(
                      padding: const EdgeInsets.only(top: 10),
                      child: Text(
                        msg,
                        style: const TextStyle(fontSize: 12, color: Color(0xFF047857), fontWeight: FontWeight.w600),
                      ),
                    ),
            ),
          ],
        ),
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

/// Single vertical-list row matching the Fetch reference Profile
/// layout: a tinted square icon tile on the left, title + subtitle
/// stacked to its right, optional chevron at the end. Used in the
/// simplified Profile sections (My Activity / Money / Shop /
/// Mail & retailers / Settings).
class _VRow extends StatelessWidget {
  final Color tint;
  final String title;
  final String subtitle;
  final String? icon;        // Emoji (e.g. '🥑')
  final Widget? iconWidget;  // Material icon (fallback when emoji isn't right)
  final VoidCallback? onTap;
  const _VRow({
    required this.tint, required this.title, required this.subtitle,
    this.icon, this.iconWidget, this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return FadeUpOnMount(
      child: Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Material(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(14),
          child: Ink(
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: const Color(0xFFe5e7eb)),
            ),
            padding: const EdgeInsets.all(12),
            child: Row(children: [
              Container(
                width: 48, height: 48,
                decoration: BoxDecoration(
                  color: tint, borderRadius: BorderRadius.circular(12),
                ),
                alignment: Alignment.center,
                child: icon != null
                  ? Text(icon!, style: const TextStyle(fontSize: 24))
                  : (iconWidget ?? const SizedBox.shrink()),
              ),
              const SizedBox(width: 12),
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [
                Text(title, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800)),
                const SizedBox(height: 2),
                Text(subtitle,
                  style: const TextStyle(fontSize: 12, color: Colors.black54, height: 1.35),
                  maxLines: 2, overflow: TextOverflow.ellipsis,
                ),
              ])),
              const Icon(Icons.chevron_right, color: Colors.black26),
            ]),
          ),
        ),
      ),
      ),
    );
  }
}

// _Pill + _MenuTile removed from Profile — superseded by _VRow.
// Keep these widgets in git history if you ever need that exact
// shape (`_Pill` was the colorful gradient quick-action; `_MenuTile`
// was the avatar-tile list row). Today the Profile uses _VRow
// uniformly.
// ignore: unused_element
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

// ignore: unused_element
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
