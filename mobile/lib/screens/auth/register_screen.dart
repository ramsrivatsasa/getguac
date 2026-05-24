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
  final _ctrls = {for (var k in ['firstName','lastName','email','password','birthDate','age','altEmail','mobile']) k: TextEditingController()};
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
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Account created! Please verify your email.')));
        context.go('/login');
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Widget _field(String key, String label, {TextInputType? type, bool obscure = false, String? hint}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: TextFormField(
        controller: _ctrls[key],
        keyboardType: type,
        obscureText: obscure,
        decoration: InputDecoration(labelText: label, hintText: hint),
        validator: ['firstName','lastName','email','password'].contains(key)
            ? (v) => v!.isEmpty ? 'Required' : null
            : null,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Create Account')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(children: [
                Expanded(child: _field('firstName', 'First Name')),
                const SizedBox(width: 12),
                Expanded(child: _field('lastName', 'Last Name')),
              ]),
              _field('email', 'Email', type: TextInputType.emailAddress),
              _field('password', 'Password', obscure: true, hint: 'Min 6 characters'),
              _field('birthDate', 'Birth Date', hint: 'YYYY-MM-DD'),
              _field('age', 'Age', type: TextInputType.number),
              _field('altEmail', 'Alternative Email (Optional)', type: TextInputType.emailAddress),
              _field('mobile', 'Mobile No (Optional)', type: TextInputType.phone),
              const SizedBox(height: 8),
              ElevatedButton(
                onPressed: _loading ? null : _register,
                child: _loading ? const CircularProgressIndicator(color: Colors.white) : const Text('Create Account'),
              ),
              TextButton(
                onPressed: () => context.go('/login'),
                child: const Text('Already have an account? Sign In'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
