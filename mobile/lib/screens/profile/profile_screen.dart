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
            Card(
              child: ListTile(
                leading: const Icon(Icons.open_in_browser, color: Color(0xFF15803d)),
                title: const Text('Open webmail', style: TextStyle(fontWeight: FontWeight.w700)),
                subtitle: const Text('Read & send mail in your browser'),
                trailing: const Icon(Icons.chevron_right),
                onTap: () => UpdateService.openDownload('https://webmail.migadu.com'),
              ),
            ),
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
          const SizedBox(height: 16),
          Card(
            child: ListTile(
              leading: const Icon(Icons.shopping_cart, color: Color(0xFFca8a04)),
              title: const Text('Smashlist', style: TextStyle(fontWeight: FontWeight.w700)),
              subtitle: const Text('Pantry, Cravings, Snacks, Grub & Grab'),
              trailing: const Icon(Icons.chevron_right),
              onTap: () => context.go('/shopping'),
            ),
          ),
          const SizedBox(height: 4),
          Card(
            child: ListTile(
              leading: const Icon(Icons.directions_car, color: Color(0xFF0891b2)),
              title: const Text('Car Miles', style: TextStyle(fontWeight: FontWeight.w700)),
              subtitle: const Text('Log trips, track mileage'),
              trailing: const Icon(Icons.chevron_right),
              onTap: () => context.go('/car-miles'),
            ),
          ),
          const SizedBox(height: 4),
          Card(
            child: ListTile(
              leading: const Icon(Icons.privacy_tip, color: Colors.blueGrey),
              title: const Text('Privacy & data', style: TextStyle(fontWeight: FontWeight.w700)),
              subtitle: const Text('Manage on getguac.app/profile'),
              trailing: const Icon(Icons.open_in_new),
              onTap: () => UpdateService.openDownload('https://getguac.app/profile'),
            ),
          ),
          const SizedBox(height: 32),
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
