import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../providers/auth_provider.dart';

// Minimal Supabase-backed profile screen. The richer version (alias picker,
// privacy panel, etc.) lives on the web and will come to mobile next.
class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final user = context.read<AppAuthProvider>().currentUser;
    final email = user?.email ?? '—';
    final uid = user?.id ?? '—';

    return Scaffold(
      appBar: AppBar(
        title: const Text('Profile'),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            tooltip: 'Sign out',
            onPressed: () async {
              await Supabase.instance.client.auth.signOut();
              if (context.mounted) context.go('/login');
            },
          ),
        ],
      ),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Center(
              child: CircleAvatar(
                radius: 48,
                backgroundColor: Colors.green.shade100,
                child: const Text('🥑', style: TextStyle(fontSize: 56)),
              ),
            ),
            const SizedBox(height: 24),
            _Row(label: 'Email', value: email),
            const Divider(),
            _Row(label: 'User ID', value: uid.length > 12 ? '${uid.substring(0, 8)}…' : uid),
            const Divider(),
            const SizedBox(height: 24),
            Card(
              child: ListTile(
                leading: const Icon(Icons.alternate_email, color: Colors.green),
                title: const Text('Pick your @getguac.app email'),
                subtitle: const Text('Tap to open the web picker'),
                trailing: const Icon(Icons.chevron_right),
                onTap: () {
                  // Could deep-link to the web; placeholder for now.
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Open getguac.app/profile to claim your address.')),
                  );
                },
              ),
            ),
            const SizedBox(height: 8),
            Card(
              child: ListTile(
                leading: const Icon(Icons.privacy_tip, color: Colors.blueGrey),
                title: const Text('Privacy & data'),
                subtitle: const Text('Manage on getguac.app/profile'),
                trailing: const Icon(Icons.open_in_new),
              ),
            ),
            const Spacer(),
            FilledButton.tonalIcon(
              onPressed: () async {
                await Supabase.instance.client.auth.signOut();
                if (context.mounted) context.go('/login');
              },
              icon: const Icon(Icons.logout),
              label: const Text('Sign out'),
            ),
          ],
        ),
      ),
    );
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
