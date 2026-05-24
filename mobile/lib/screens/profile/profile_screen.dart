import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import '../../providers/auth_provider.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});
  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  final _db = FirebaseFirestore.instance;
  late Map<String, TextEditingController> _ctrls;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    final p = context.read<AppAuthProvider>().userProfile ?? {};
    _ctrls = {
      'firstName': TextEditingController(text: p['firstName'] ?? ''),
      'lastName': TextEditingController(text: p['lastName'] ?? ''),
      'mobileNo': TextEditingController(text: p['mobileNo'] ?? ''),
      'alternativeEmail': TextEditingController(text: p['alternativeEmail'] ?? ''),
      'birthDate': TextEditingController(text: p['birthDate'] ?? ''),
      'age': TextEditingController(text: p['age']?.toString() ?? ''),
    };
  }

  Future<void> _save() async {
    setState(() => _saving = true);
    final uid = context.read<AppAuthProvider>().currentUser?.uid ?? '';
    final data = { for (var e in _ctrls.entries) e.key: e.value.text };
    await _db.collection('users').doc(uid).update(data);
    await context.read<AppAuthProvider>().fetchProfile(uid);
    setState(() => _saving = false);
    if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Profile updated')));
  }

  Future<void> _logout() async {
    await context.read<AppAuthProvider>().logout();
    if (mounted) context.go('/login');
  }

  Widget _field(String key, String label, {TextInputType? type}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: TextField(
        controller: _ctrls[key],
        keyboardType: type,
        decoration: InputDecoration(labelText: label),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AppAuthProvider>();
    final email = auth.currentUser?.email ?? '';
    final uid = auth.currentUser?.uid ?? '';

    return Scaffold(
      appBar: AppBar(
        title: const Text('My Profile'),
        actions: [
          TextButton(onPressed: _logout, child: const Text('Sign Out', style: TextStyle(color: Colors.white))),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          Center(
            child: CircleAvatar(
              radius: 40,
              backgroundColor: const Color(0xFF1e3a8a),
              child: Text(
                (auth.userProfile?['firstName'] ?? 'U')[0].toUpperCase(),
                style: const TextStyle(fontSize: 32, color: Colors.white, fontWeight: FontWeight.bold),
              ),
            ),
          ),
          const SizedBox(height: 8),
          Center(child: Text(email, style: const TextStyle(color: Colors.grey, fontSize: 13))),
          const SizedBox(height: 4),
          Center(
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(color: Colors.blue.shade50, borderRadius: BorderRadius.circular(8)),
              child: Text('$uid@ezereceipts.com', style: TextStyle(color: Colors.blue.shade800, fontSize: 11, fontFamily: 'monospace')),
            ),
          ),
          const SizedBox(height: 20),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(children: [
                Row(children: [
                  Expanded(child: _field('firstName', 'First Name')),
                  const SizedBox(width: 12),
                  Expanded(child: _field('lastName', 'Last Name')),
                ]),
                _field('mobileNo', 'Mobile No', type: TextInputType.phone),
                _field('alternativeEmail', 'Alternative Email', type: TextInputType.emailAddress),
                _field('birthDate', 'Birth Date', type: TextInputType.datetime),
                _field('age', 'Age', type: TextInputType.number),
                ElevatedButton(
                  onPressed: _saving ? null : _save,
                  child: _saving ? const CircularProgressIndicator(color: Colors.white, strokeWidth: 2) : const Text('Save Profile'),
                ),
              ]),
            ),
          ),
          const SizedBox(height: 16),
          OutlinedButton.icon(
            onPressed: _logout,
            icon: const Icon(Icons.logout),
            label: const Text('Sign Out'),
            style: OutlinedButton.styleFrom(foregroundColor: Colors.red),
          ),
        ]),
      ),
    );
  }
}
