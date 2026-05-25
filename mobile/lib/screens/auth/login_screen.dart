import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../services/biometric_service.dart';
import '../../services/update_service.dart';
import '../../widgets/guac_mascot.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _identifierCtrl = TextEditingController();
  final _passCtrl = TextEditingController();
  bool _loading = false;
  bool _rememberWithBio = true;
  bool _bioAvailable = false;
  bool _bioEnabled = false;

  @override
  void initState() {
    super.initState();
    _checkBiometric();
    _checkForUpdate();
  }

  Future<void> _checkForUpdate() async {
    // Slight delay so the login screen renders first before a dialog pops.
    await Future.delayed(const Duration(milliseconds: 600));
    final update = await UpdateService.checkForUpdate();
    if (!mounted || update == null) return;
    showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Row(children: [
          const GuacMascot(size: 40),
          const SizedBox(width: 12),
          const Expanded(child: Text('Update available')),
        ]),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              '${update.tag} is out. Sign-in and data fixes are in this release — installing is recommended.',
              style: const TextStyle(height: 1.4),
            ),
            if (update.releaseNotes != null && update.releaseNotes!.isNotEmpty) ...[
              const SizedBox(height: 12),
              Container(
                constraints: const BoxConstraints(maxHeight: 140),
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: const Color(0xFFf0fdf4),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: SingleChildScrollView(
                  child: Text(update.releaseNotes!.length > 280
                      ? '${update.releaseNotes!.substring(0, 280)}…'
                      : update.releaseNotes!,
                    style: const TextStyle(fontSize: 12, color: Color(0xFF065f46)),
                  ),
                ),
              ),
            ],
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Later'),
          ),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: const Color(0xFF15803d)),
            onPressed: () {
              Navigator.pop(ctx);
              UpdateService.openDownload(update.downloadUrl);
            },
            child: const Text('Update now'),
          ),
        ],
      ),
    );
  }

  Future<void> _checkBiometric() async {
    final capable = await BiometricService.isDeviceCapable();
    final enabled = await BiometricService.isEnabled();
    if (!mounted) return;
    setState(() {
      _bioAvailable = capable;
      _bioEnabled = enabled;
    });
    // Auto-prompt biometric on first frame if already enrolled — fast path.
    if (capable && enabled) {
      WidgetsBinding.instance.addPostFrameCallback((_) => _unlockWithBio());
    }
  }

  Future<void> _unlockWithBio() async {
    final creds = await BiometricService.authenticate();
    if (creds == null || !mounted) return;
    setState(() => _loading = true);
    try {
      await context.read<AppAuthProvider>().login(creds.email, creds.password);
      if (mounted) context.go('/dashboard');
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Biometric sign-in failed: $e')),
      );
      // Bad creds = wipe so we don't keep retrying with stale data
      await BiometricService.disable();
      setState(() => _bioEnabled = false);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _login() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _loading = true);
    try {
      final identifier = _identifierCtrl.text.trim();
      final password = _passCtrl.text;
      await context.read<AppAuthProvider>().login(identifier, password);

      // Stash credentials for next-time biometric login (only if the
      // user opted in AND the device supports biometric).
      if (_rememberWithBio && _bioAvailable && identifier.contains('@')) {
        await BiometricService.enable(identifier, password);
      }

      if (mounted) context.go('/dashboard');
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [Color(0xFF065f46), Color(0xFF15803d), Color(0xFF65a30d)], // emerald-800 → green-700 → lime-600
          ),
        ),
        child: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(24),
              child: Column(
                children: [
                  // Avocado mascot — SVG matches the web brand
                  const GuacMascot(size: 140),
                  const SizedBox(height: 16),
                  const Text(
                    'GetGuac',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 36,
                      fontWeight: FontWeight.w900,
                      letterSpacing: -0.5,
                    ),
                  ),
                  const SizedBox(height: 4),
                  const Text(
                    'Your Guac-AI personal finance sidekick.',
                    style: TextStyle(color: Colors.white70, fontSize: 13),
                  ),
                  const SizedBox(height: 32),
                  Card(
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                    elevation: 12,
                    shadowColor: Colors.black54,
                    child: Padding(
                      padding: const EdgeInsets.all(24),
                      child: Form(
                        key: _formKey,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            const Text(
                              'Sign In',
                              style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Color(0xFF064e3b)),
                            ),
                            const SizedBox(height: 20),
                            TextFormField(
                              controller: _identifierCtrl,
                              keyboardType: TextInputType.emailAddress,
                              autocorrect: false,
                              decoration: InputDecoration(
                                labelText: 'Username or email',
                                hintText: 'john   or   john@email.com',
                                prefixIcon: const Icon(Icons.person_outline, color: Color(0xFF15803d)),
                                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                                focusedBorder: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(12),
                                  borderSide: const BorderSide(color: Color(0xFF15803d), width: 2),
                                ),
                              ),
                              validator: (v) => v == null || v.isEmpty ? 'Required' : null,
                            ),
                            const SizedBox(height: 14),
                            TextFormField(
                              controller: _passCtrl,
                              obscureText: true,
                              decoration: InputDecoration(
                                labelText: 'Password',
                                prefixIcon: const Icon(Icons.lock_outline, color: Color(0xFF15803d)),
                                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                                focusedBorder: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(12),
                                  borderSide: const BorderSide(color: Color(0xFF15803d), width: 2),
                                ),
                              ),
                              validator: (v) => v == null || v.isEmpty ? 'Required' : null,
                            ),
                            const SizedBox(height: 20),
                            // Remember-me / biometric opt-in toggle
                            if (_bioAvailable) ...[
                              Row(
                                children: [
                                  Checkbox(
                                    value: _rememberWithBio,
                                    activeColor: const Color(0xFF15803d),
                                    onChanged: (v) => setState(() => _rememberWithBio = v ?? false),
                                  ),
                                  const Expanded(
                                    child: Text(
                                      'Remember me — unlock with fingerprint next time',
                                      style: TextStyle(fontSize: 12, color: Color(0xFF4b5563)),
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 8),
                            ],
                            FilledButton(
                              onPressed: _loading ? null : _login,
                              style: FilledButton.styleFrom(
                                backgroundColor: const Color(0xFF15803d),
                                foregroundColor: Colors.white,
                                padding: const EdgeInsets.symmetric(vertical: 14),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                              ),
                              child: _loading
                                  ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5))
                                  : const Text('Sign In', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
                            ),
                            // Biometric quick-unlock button — only shows when
                            // a previous sign-in saved credentials.
                            if (_bioEnabled) ...[
                              const SizedBox(height: 10),
                              OutlinedButton.icon(
                                onPressed: _loading ? null : _unlockWithBio,
                                icon: const Icon(Icons.fingerprint, color: Color(0xFF15803d)),
                                label: const Text(
                                  'Unlock with fingerprint',
                                  style: TextStyle(color: Color(0xFF15803d), fontWeight: FontWeight.w700),
                                ),
                                style: OutlinedButton.styleFrom(
                                  side: const BorderSide(color: Color(0xFF15803d), width: 1.5),
                                  padding: const EdgeInsets.symmetric(vertical: 12),
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                ),
                              ),
                            ],
                            const SizedBox(height: 12),
                            TextButton(
                              onPressed: () => context.go('/register'),
                              child: const Text(
                                "New here? Create an account 🥑",
                                style: TextStyle(color: Color(0xFF15803d), fontWeight: FontWeight.w600),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  const Text(
                    'getguac.app',
                    style: TextStyle(color: Colors.white54, fontSize: 11, letterSpacing: 0.5),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
