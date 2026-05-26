// AppLock — the biometric gate the user sees every cold-start when biometric
// is enabled. Auto-fires the fingerprint/face prompt on first frame; on
// success the user is bounced back to wherever they were trying to go (or
// /dashboard if no return path is set).
//
// "Use password instead" fallback signs the user out so they hit the regular
// login screen — covers the case where the user changed devices or genuinely
// can't biometric-auth right now.

import 'dart:async';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../providers/auth_provider.dart';
import '../../services/app_lock_service.dart';
import '../../services/biometric_service.dart';
import '../../services/debug_log.dart';
import '../../widgets/guac_mascot.dart';

class AppLockScreen extends StatefulWidget {
  final String? returnTo;
  const AppLockScreen({super.key, this.returnTo});

  @override
  State<AppLockScreen> createState() => _AppLockScreenState();
}

class _AppLockScreenState extends State<AppLockScreen> {
  bool _unlocking = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    DebugLog.event('app-lock-screen', 'initState');
    // Auto-fire the prompt as soon as the screen paints — no extra tap needed.
    WidgetsBinding.instance.addPostFrameCallback((_) => _tryUnlock());
  }

  Future<void> _tryUnlock() async {
    if (_unlocking) return;
    DebugLog.event('app-lock-screen', 'tryUnlock start',
      meta: {'returnTo': widget.returnTo});
    setState(() { _unlocking = true; _error = null; });
    try {
      final creds = await BiometricService.authenticate();
      if (creds == null) {
        DebugLog.event('app-lock-screen', 'tryUnlock: creds null (cancelled or no storage)');
        if (mounted) setState(() { _unlocking = false; _error = 'Biometric cancelled.'; });
        return;
      }
      // Re-issue the Supabase sign-in to refresh the session. Cheap and
      // ensures the user is actually authenticated, not just biometric-OK.
      try {
        await Supabase.instance.client.auth.signInWithPassword(
          email: creds.email,
          password: creds.password,
        );
        DebugLog.event('app-lock-screen', 'supabase re-login OK');
      } catch (e) {
        // Session might already be valid — log but push through.
        DebugLog.event('app-lock-screen', 'supabase re-login failed (push through)',
          level: 'warn', meta: {'error': e.toString()});
      }
      AppLockService.markUnlocked();
      unawaited(DebugLog.uploadPending());
      if (!mounted) return;
      final target = widget.returnTo == null || widget.returnTo!.isEmpty || widget.returnTo == '/lock'
        ? '/dashboard'
        : widget.returnTo!;
      DebugLog.event('app-lock-screen', 'unlocked, navigating', meta: {'target': target});
      context.go(target);
    } catch (e) {
      DebugLog.event('app-lock-screen', 'tryUnlock threw',
        level: 'error', meta: {'error': e.toString()});
      if (mounted) setState(() { _unlocking = false; _error = 'Unlock failed: $e'; });
    }
  }

  Future<void> _useSignIn() async {
    // Fall back to password login. We sign the user out so they reach the
    // login screen cleanly — otherwise the router would just bounce them
    // back to /dashboard since the session is still valid.
    AppLockService.markUnlocked(); // bypass the lock so /login renders
    await context.read<AppAuthProvider>().logout();
    AppLockService.lock();          // re-lock for next time
    if (mounted) context.go('/login');
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFf0fdf4),
      body: SafeArea(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const GuacMascot(size: 96),
                const SizedBox(height: 16),
                const Text('GetGuac is locked',
                  style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: Color(0xFF064e3b))),
                const SizedBox(height: 4),
                const Text('Unlock with fingerprint or face',
                  style: TextStyle(fontSize: 13, color: Color(0xFF4b5563))),
                const SizedBox(height: 32),
                FilledButton.icon(
                  onPressed: _unlocking ? null : _tryUnlock,
                  icon: const Icon(Icons.fingerprint, size: 22),
                  label: Text(_unlocking ? 'Waiting…' : 'Unlock'),
                  style: FilledButton.styleFrom(
                    backgroundColor: const Color(0xFF15803d),
                    foregroundColor: Colors.white,
                    minimumSize: const Size(220, 48),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  ),
                ),
                if (_error != null) ...[
                  const SizedBox(height: 12),
                  Text(_error!,
                    style: const TextStyle(color: Colors.redAccent, fontSize: 12)),
                ],
                const SizedBox(height: 24),
                TextButton(
                  onPressed: _useSignIn,
                  child: const Text('Use password instead',
                    style: TextStyle(color: Color(0xFF15803d))),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
