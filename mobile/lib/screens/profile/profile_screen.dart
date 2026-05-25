import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import '../../providers/auth_provider.dart';
import '../../widgets/guac_mascot.dart';

// Minimal Supabase-backed profile screen. The richer version (alias picker,
// privacy panel, etc.) lives on the web and will come to mobile next.
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
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Center(child: GuacMascot(size: 110)),
            const SizedBox(height: 12),
            if (firstName.toString().isNotEmpty)
              Center(child: Text('$firstName $lastName'.trim(),
                style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800))),
            const SizedBox(height: 16),
            _Row(label: 'Email', value: email),
            if (alias != null && alias.toString().isNotEmpty) ...[
              const Divider(),
              _Row(label: '@getguac alias', value: '$alias@getguac.app'),
            ],
            const Divider(),
            _Row(label: 'User ID', value: uid.length > 12 ? '${uid.substring(0, 8)}…' : uid),
            const Divider(),
            const SizedBox(height: 24),
            if (alias == null || alias.toString().isEmpty)
              Card(
                child: ListTile(
                  leading: const Icon(Icons.alternate_email, color: Colors.green),
                  title: const Text('Pick your @getguac.app email'),
                  subtitle: const Text('Tap to open the web picker'),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Open getguac.app/profile to claim your address.')),
                    );
                  },
                ),
              ),
            const SizedBox(height: 8),
            Card(
              child: ListTile(
                leading: const Icon(Icons.directions_car, color: Color(0xFF0891b2)),
                title: const Text('Car Miles'),
                subtitle: const Text('Log trips, track mileage'),
                trailing: const Icon(Icons.chevron_right),
                onTap: () => context.go('/car-miles'),
              ),
            ),
            const SizedBox(height: 4),
            const Card(
              child: ListTile(
                leading: Icon(Icons.privacy_tip, color: Colors.blueGrey),
                title: Text('Privacy & data'),
                subtitle: Text('Manage on getguac.app/profile'),
                trailing: Icon(Icons.open_in_new),
              ),
            ),
            const Spacer(),
            FilledButton.tonalIcon(
              onPressed: () => _signOut(context),
              icon: const Icon(Icons.logout),
              label: const Text('Sign out'),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _signOut(BuildContext context) async {
    await context.read<AppAuthProvider>().logout();
    if (context.mounted) context.go('/login');
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
