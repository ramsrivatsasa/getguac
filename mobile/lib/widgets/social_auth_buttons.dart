import 'dart:io' show Platform;
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:sign_in_with_apple/sign_in_with_apple.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../providers/auth_provider.dart';
import '../services/debug_log.dart';
import '../theme/gg_design.dart';

/// Google + Apple sign-in buttons, shared by the login and register screens.
///
/// Apple is shown only on iOS/macOS: App Store Guideline 4.8 requires Sign in
/// with Apple wherever another social login (Google) is offered on iOS, but
/// Android and web don't need it.
///
/// These require OAuth config to actually work — see
/// `mobile/SOCIAL-LOGIN-SETUP.md`. Until Supabase's Google/Apple providers and
/// the native client IDs are wired up, a tap surfaces a friendly SnackBar
/// ("use email for now") rather than crashing.
class SocialAuthButtons extends StatefulWidget {
  const SocialAuthButtons({super.key});

  @override
  State<SocialAuthButtons> createState() => _SocialAuthButtonsState();
}

class _SocialAuthButtonsState extends State<SocialAuthButtons> {
  bool _busy = false;

  bool get _showApple => !kIsWeb && (Platform.isIOS || Platform.isMacOS);

  Future<void> _run(String provider, Future<bool> Function() action) async {
    if (_busy) return;
    setState(() => _busy = true);
    try {
      final ok = await action();
      if (ok && mounted) {
        DebugLog.event('social-auth', '$provider sign-in OK');
        context.go('/dashboard');
      }
    } catch (e) {
      DebugLog.event('social-auth', '$provider sign-in failed',
          level: 'error', meta: {'error': e.toString()});
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(_friendly(e))),
        );
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  String _friendly(Object e) {
    final raw = e is AuthException ? e.message : e.toString();
    final lc = raw.toLowerCase();
    if (lc.contains('cancel') || lc.contains('abort')) {
      return 'Sign-in cancelled.';
    }
    if (lc.contains('network') || lc.contains('socket') ||
        lc.contains('connection') || lc.contains('timeout')) {
      return 'No internet connection. Check your network and try again.';
    }
    if (lc.contains('not enabled') || lc.contains('unsupported') ||
        lc.contains('provider')) {
      return "Social sign-in isn't available yet — please use email for now.";
    }
    return 'Could not sign in. Please try again or use your email.';
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.read<AppAuthProvider>();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        OutlinedButton.icon(
          onPressed:
              _busy ? null : () => _run('google', auth.signInWithGoogle),
          icon: _busy
              ? const SizedBox(
                  width: 16,
                  height: 16,
                  child: CircularProgressIndicator(strokeWidth: 2))
              : const Text('G',
                  style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w800,
                      color: Color(0xFF4285F4))),
          label: Text('Continue with Google',
              style: TextStyle(
                  color: ggInk,
                  fontWeight: FontWeight.w700,
                  fontSize: 14,
                  fontVariations: ggWght(FontWeight.w700))),
          style: OutlinedButton.styleFrom(
            side: const BorderSide(color: ggBorder),
            padding: const EdgeInsets.symmetric(vertical: 11),
            shape: const StadiumBorder(),
            minimumSize: const Size(0, 44),
          ),
        ),
        if (_showApple) ...[
          const SizedBox(height: 8),
          SignInWithAppleButton(
            onPressed: _busy ? () {} : () => _run('apple', auth.signInWithApple),
            style: SignInWithAppleButtonStyle.black,
            borderRadius: const BorderRadius.all(Radius.circular(30)),
            height: 44,
          ),
        ],
      ],
    );
  }
}
