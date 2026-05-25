import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import '../../providers/auth_provider.dart';
import '../../services/update_service.dart';
import '../../widgets/guac_mascot.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

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
          _MenuTile(
            icon: Icons.mark_email_unread_rounded,
            iconColor: const Color(0xFFca8a04),
            iconBg: const Color(0xFFfef3c7),
            title: 'Inbox',
            subtitle: 'Read & reply to your @getguac.app mail',
            onTap: () => context.go('/inbox'),
          ),
          _MenuTile(
            icon: Icons.auto_awesome,
            iconColor: const Color(0xFF15803d),
            iconBg: const Color(0xFFd1fae5),
            title: 'GuacScore',
            subtitle: 'Your 0-100 spending grade',
            onTap: () => context.go('/guacscore'),
          ),
          _MenuTile(
            icon: Icons.auto_fix_high,
            iconColor: const Color(0xFF7c3aed),
            iconBg: const Color(0xFFede9fe),
            title: 'GuacWizard',
            subtitle: 'Bank Bite tracker + finance insights',
            onTap: () => context.go('/guacwizard'),
          ),
          _MenuTile(
            icon: Icons.inventory_2,
            iconColor: const Color(0xFFca8a04),
            iconBg: const Color(0xFFfef3c7),
            title: 'Stash',
            subtitle: 'Everything you own, searchable',
            onTap: () => context.go('/stash'),
          ),
          _MenuTile(
            icon: Icons.local_offer,
            iconColor: const Color(0xFFdb2777),
            iconBg: const Color(0xFFfce7f3),
            title: 'Steals',
            subtitle: 'AI price hunt + expiring rewards',
            onTap: () => context.go('/steals'),
          ),

          const SizedBox(height: 16),
          _SectionHeader(label: 'More'),
          _MenuTile(
            icon: Icons.directions_car,
            iconColor: const Color(0xFF0891b2),
            iconBg: const Color(0xFFcffafe),
            title: 'Car Miles',
            subtitle: 'Log trips, track mileage',
            onTap: () => context.go('/car-miles'),
          ),
          _MenuTile(
            icon: Icons.shield_outlined,
            iconColor: const Color(0xFF15803d),
            iconBg: const Color(0xFFd1fae5),
            title: 'Security & Privacy',
            subtitle: 'What we encrypt + what you control',
            onTap: () => UpdateService.openDownload('https://getguac.app/security'),
          ),
          _MenuTile(
            icon: Icons.privacy_tip,
            iconColor: Colors.blueGrey,
            iconBg: const Color(0xFFf1f5f9),
            title: 'Privacy & data',
            subtitle: 'Manage on getguac.app/profile',
            trailing: const Icon(Icons.open_in_new, size: 16, color: Colors.black45),
            onTap: () => UpdateService.openDownload('https://getguac.app/profile'),
          ),

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
    if (context.mounted) {
      context.go('/login');
      // Send users to the marketing home page after sign-out — matches the web behaviour.
      UpdateService.openDownload('https://getguac.app/');
    }
  }
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
