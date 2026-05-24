import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});
  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _formKey = GlobalKey<FormState>();
  final _ctrls = {
    for (var k in ['firstName', 'lastName', 'email', 'password', 'birthDate', 'age', 'altEmail', 'mobile']) k: TextEditingController()
  };
  bool _loading = false;

  Future<void> _register() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _loading = true);
    try {
      await context.read<AppAuthProvider>().register(
        email: _ctrls['email']!.text.trim(),
        password: _ctrls['password']!.text,
        firstName: _ctrls['firstName']!.text.trim(),
        lastName: _ctrls['lastName']!.text.trim(),
        extra: {
          'birthDate': _ctrls['birthDate']!.text,
          'age': _ctrls['age']!.text,
          'alternativeEmail': _ctrls['altEmail']!.text.trim(),
          'mobileNo': _ctrls['mobile']!.text.trim(),
        },
      );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Welcome to GetGuac! Check your email to verify. 🥑')),
        );
        context.go('/login');
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Widget _field(String key, String label, {TextInputType? type, bool obscure = false, String? hint, IconData? icon}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: TextFormField(
        controller: _ctrls[key],
        keyboardType: type,
        obscureText: obscure,
        decoration: InputDecoration(
          labelText: label,
          hintText: hint,
          prefixIcon: icon != null ? Icon(icon, color: const Color(0xFF15803d)) : null,
        ),
        validator: ['firstName', 'lastName', 'email', 'password'].contains(key)
            ? (v) => v == null || v.isEmpty ? 'Required' : null
            : null,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [Color(0xFF065f46), Color(0xFF15803d), Color(0xFF65a30d)],
          ),
        ),
        child: SafeArea(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(20),
            child: Column(
              children: [
                const SizedBox(height: 16),
                // Mascot pill
                Container(
                  width: 88,
                  height: 88,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: const LinearGradient(
                      colors: [Color(0xFFa3e635), Color(0xFF22c55e), Color(0xFF15803d)],
                    ),
                    border: Border.all(color: Colors.white, width: 3),
                    boxShadow: [
                      BoxShadow(color: Colors.black.withOpacity(0.2), blurRadius: 14, offset: const Offset(0, 6)),
                    ],
                  ),
                  child: const Center(child: Text('🥑', style: TextStyle(fontSize: 52))),
                ),
                const SizedBox(height: 12),
                const Text(
                  'Join GetGuac',
                  style: TextStyle(color: Colors.white, fontSize: 28, fontWeight: FontWeight.w900),
                ),
                const SizedBox(height: 2),
                const Text(
                  'Smash your spend — keep what counts.',
                  style: TextStyle(color: Colors.white70, fontSize: 13),
                ),
                const SizedBox(height: 24),
                Card(
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                  elevation: 12,
                  shadowColor: Colors.black54,
                  child: Padding(
                    padding: const EdgeInsets.all(20),
                    child: Form(
                      key: _formKey,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          const Text(
                            'Create Account',
                            style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Color(0xFF064e3b)),
                          ),
                          const SizedBox(height: 16),
                          Row(children: [
                            Expanded(child: _field('firstName', 'First Name', icon: Icons.person_outline)),
                            const SizedBox(width: 10),
                            Expanded(child: _field('lastName', 'Last Name')),
                          ]),
                          _field('email', 'Email', type: TextInputType.emailAddress, icon: Icons.email_outlined),
                          _field('password', 'Password', obscure: true, hint: 'Min 6 chars', icon: Icons.lock_outline),
                          _field('birthDate', 'Birth Date', hint: 'YYYY-MM-DD', icon: Icons.calendar_today_outlined),
                          _field('age', 'Age', type: TextInputType.number, icon: Icons.cake_outlined),
                          _field('altEmail', 'Alternative Email (optional)', type: TextInputType.emailAddress, icon: Icons.alternate_email),
                          _field('mobile', 'Mobile (optional)', type: TextInputType.phone, icon: Icons.phone_outlined),
                          const SizedBox(height: 8),
                          FilledButton(
                            onPressed: _loading ? null : _register,
                            style: FilledButton.styleFrom(
                              backgroundColor: const Color(0xFF15803d),
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(vertical: 14),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                            ),
                            child: _loading
                                ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5))
                                : const Text('Create Account', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
                          ),
                          TextButton(
                            onPressed: () => context.go('/login'),
                            child: const Text(
                              'Already have an account? Sign in',
                              style: TextStyle(color: Color(0xFF15803d), fontWeight: FontWeight.w600),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
