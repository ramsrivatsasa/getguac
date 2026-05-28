import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:go_router/go_router.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../providers/auth_provider.dart';
import '../../services/biometric_service.dart';
import '../../services/update_service.dart';
import '../../services/debug_log.dart';
import '../../services/app_lock_service.dart';
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
  bool _keepSignedIn = true;
  bool _bioAvailable = false;
  bool _bioEnabled = false;
  bool _showPassword = false;
  String _versionLabel = '';

  @override
  void initState() {
    super.initState();
    _loadVersion();
    _checkBiometric();
    _checkForUpdate();
    _loadKeepSignedIn();
  }

  Future<void> _loadKeepSignedIn() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      if (mounted) setState(() {
        _keepSignedIn = prefs.getBool('gg_keep_signed_in') ?? true;
      });
    } catch (_) {}
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
        actionsPadding: const EdgeInsets.fromLTRB(8, 0, 8, 8),
        actions: [
          TextButton(
            style: TextButton.styleFrom(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              minimumSize: const Size(0, 32),
            ),
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Later'),
          ),
          FilledButton(
            style: FilledButton.styleFrom(
              backgroundColor: const Color(0xFF15803d),
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
              minimumSize: const Size(0, 32),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
              textStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13),
            ),
            onPressed: () async {
              Navigator.pop(ctx);
              // Show a quick download spinner while the APK pulls in
              // (~20MB — usually under 10 seconds on cell data).
              showDialog<void>(
                context: context,
                barrierDismissible: false,
                builder: (_) => const AlertDialog(
                  content: Row(mainAxisSize: MainAxisSize.min, children: [
                    SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2)),
                    SizedBox(width: 14),
                    Flexible(child: Text('Downloading update…')),
                  ]),
                ),
              );
              final ok = await UpdateService.downloadAndInstall(update.downloadUrl);
              if (!mounted) return;
              Navigator.of(context, rootNavigator: true).pop(); // dismiss spinner
              if (!ok && mounted) {
                // In-app download failed — fall back to the old browser
                // path so the user can still install. Comes with the old
                // Downloads-folder-clutter caveat but at least it works.
                ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
                  content: Text("Couldn't auto-download. Opening browser instead — install via the notification."),
                  duration: Duration(seconds: 4),
                ));
                await UpdateService.openDownload(update.downloadUrl);
              }
            },
            child: const Text('Update now'),
          ),
        ],
      ),
    );
  }

  Future<void> _loadVersion() async {
    try {
      final info = await PackageInfo.fromPlatform();
      if (!mounted) return;
      setState(() => _versionLabel = 'v${info.version} (${info.buildNumber})');
    } catch (_) { /* version is decorative — silent failure is fine */ }
  }

  Future<void> _checkBiometric() async {
    final capable = await BiometricService.isDeviceCapable();
    final enabled = await BiometricService.isEnabled();
    if (!mounted) return;
    setState(() {
      _bioAvailable = capable;
      _bioEnabled = enabled;
    });
    DebugLog.event('login-screen', 'checkBiometric', meta: {
      'capable': capable, 'enabled': enabled,
    });
    // Auto-prompt biometric on first frame if already enrolled — fast path.
    if (capable && enabled) {
      DebugLog.event('login-screen', 'auto-prompt biometric on post-frame');
      WidgetsBinding.instance.addPostFrameCallback((_) => _unlockWithBio());
    }
  }

  Future<void> _unlockWithBio() async {
    DebugLog.event('login-screen', 'unlockWithBio start');
    final creds = await BiometricService.authenticate();
    if (creds == null || !mounted) {
      DebugLog.event('login-screen', 'unlockWithBio: creds null or unmounted',
        meta: {'creds_null': creds == null, 'mounted': mounted});
      return;
    }
    setState(() => _loading = true);
    try {
      await context.read<AppAuthProvider>().login(creds.email, creds.password);
      DebugLog.event('login-screen', 'unlockWithBio: supabase login OK');
      if (mounted) context.go('/dashboard');
    } catch (e) {
      final msg = e.toString();
      // Only wipe credentials when the failure is unambiguously "bad
      // credentials". Network / transient errors must NOT delete stored
      // creds — that was the bug where users kept losing biometric after
      // every cold start. Supabase AuthException for wrong password
      // contains "Invalid login credentials" (or status 400 + invalid_grant).
      final looksLikeBadCreds = msg.toLowerCase().contains('invalid login')
          || msg.toLowerCase().contains('invalid_grant')
          || msg.toLowerCase().contains('invalid credentials');
      DebugLog.event('login-screen', 'unlockWithBio failed',
        level: 'error', meta: {
          'error': msg,
          'wipe_creds': looksLikeBadCreds,
        });
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Biometric sign-in failed: $e')),
      );
      if (looksLikeBadCreds) {
        await BiometricService.disable();
        await AppLockService.refreshEnabled();
        setState(() => _bioEnabled = false);
      }
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
      DebugLog.event('login-screen', 'manual login attempt', meta: {
        'identifier_has_at': identifier.contains('@'),
        'remember_with_bio': _rememberWithBio,
        'keep_signed_in': _keepSignedIn,
        'bio_available': _bioAvailable,
      });
      await context.read<AppAuthProvider>().login(identifier, password);
      DebugLog.event('login-screen', 'manual login supabase OK');

      // Persist the user's "keep me signed in" choice. AppLockService.init()
      // reads this on next cold-start — if true, the lock screen / biometric
      // gate is skipped entirely.
      try {
        final prefs = await SharedPreferences.getInstance();
        await prefs.setBool('gg_keep_signed_in', _keepSignedIn);
      } catch (_) {}

      // Stash credentials for next-time biometric login.
      // Two prior bugs we are guarding against:
      //   1) Old gate `identifier.contains('@')` skipped username sign-ins.
      //   2) Old gate `_bioAvailable` raced the async capability check; if the
      //      user signed in before _checkBiometric returned, _bioAvailable was
      //      still false and the write was skipped.
      // New behaviour: as long as the user kept "Remember me" checked
      // (default), we ALWAYS attempt the write. Capability is re-checked
      // on the next app open anyway. We also surface any secure-storage
      // failure so the bug can't hide silently.
      if (_rememberWithBio) {
        final emailForBio = Supabase.instance.client.auth.currentUser?.email
          ?? (identifier.contains('@') ? identifier : null);
        DebugLog.event('login-screen', 'biometric enable decision', meta: {
          'has_email_for_bio': emailForBio != null && emailForBio.isNotEmpty,
          'source': Supabase.instance.client.auth.currentUser?.email != null
              ? 'supabase_session'
              : (identifier.contains('@') ? 'identifier' : 'none'),
        });
        if (emailForBio != null && emailForBio.isNotEmpty) {
          final err = await BiometricService.enable(emailForBio, password);
          if (err != null && mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text('Saved sign-in for biometric failed: $err'),
                duration: const Duration(seconds: 6),
              ),
            );
          } else {
            // Refresh AppLockService so the next cold-start sees the new
            // credentials and routes through /lock for the biometric gate.
            await AppLockService.refreshEnabled();
          }
        }
      }

      // Best-effort: get any buffered events up to the server now that we
      // definitely have a Supabase session.
      unawaited(DebugLog.uploadPending());

      if (mounted) context.go('/dashboard');
    } catch (e) {
      if (!mounted) return;
      final msg = e.toString().toLowerCase();
      // Supabase raises AuthException with code 'email_not_confirmed' or a
      // message containing 'not confirmed' when the user hasn't clicked the
      // signup link yet. Surface a SnackBar with a Resend action.
      if (msg.contains('email not confirmed') || msg.contains('not confirmed') || msg.contains('email_not_confirmed')) {
        final email = _identifierCtrl.text.trim();
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          duration: const Duration(seconds: 8),
          content: Text(email.contains('@')
              ? 'Please confirm your email ($email) before signing in.'
              : 'Please confirm your email before signing in.'),
          action: !email.contains('@')
              ? null
              : SnackBarAction(
                  label: 'Resend',
                  onPressed: () async {
                    try {
                      final res = await http.post(
                        Uri.parse('https://getguac.app/api/auth/resend-confirmation'),
                        headers: {'Content-Type': 'application/json'},
                        body: json.encode({'email': email}),
                      );
                      final body = json.decode(res.body) as Map<String, dynamic>;
                      if (!mounted) return;
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text(body['message']?.toString() ?? 'Sent to $email')),
                      );
                    } catch (_) {
                      if (!mounted) return;
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Resend failed — try again in a minute.')),
                      );
                    }
                  },
                ),
        ));
      } else {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
      }
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
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
              child: Column(
                children: [
                  // Avocado mascot — SVG matches the web brand
                  const GuacMascot(size: 96),
                  const SizedBox(height: 8),
                  const Text(
                    'GetGuac',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 28,
                      fontWeight: FontWeight.w900,
                      letterSpacing: -0.5,
                    ),
                  ),
                  const SizedBox(height: 2),
                  const Text(
                    'Your Guac-AI personal finance sidekick.',
                    style: TextStyle(color: Colors.white70, fontSize: 12),
                  ),
                  const SizedBox(height: 16),
                  Card(
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
                    elevation: 10,
                    shadowColor: Colors.black54,
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(18, 16, 18, 14),
                      child: Form(
                        key: _formKey,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            const Text(
                              'Sign In',
                              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF064e3b)),
                            ),
                            const SizedBox(height: 12),
                            TextFormField(
                              controller: _identifierCtrl,
                              keyboardType: TextInputType.emailAddress,
                              autocorrect: false,
                              decoration: InputDecoration(
                                labelText: 'Username or email',
                                hintText: 'john   or   john@email.com',
                                prefixIcon: const Icon(Icons.person_outline, color: Color(0xFF15803d), size: 20),
                                isDense: true,
                                contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                                focusedBorder: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(12),
                                  borderSide: const BorderSide(color: Color(0xFF15803d), width: 2),
                                ),
                              ),
                              validator: (v) => v == null || v.isEmpty ? 'Required' : null,
                            ),
                            const SizedBox(height: 10),
                            TextFormField(
                              controller: _passCtrl,
                              obscureText: !_showPassword,
                              decoration: InputDecoration(
                                labelText: 'Password',
                                prefixIcon: const Icon(Icons.lock_outline, color: Color(0xFF15803d), size: 20),
                                suffixIcon: IconButton(
                                  icon: Icon(
                                    _showPassword ? Icons.visibility_off_outlined : Icons.visibility_outlined,
                                    color: Colors.black54, size: 20,
                                  ),
                                  tooltip: _showPassword ? 'Hide password' : 'Show password',
                                  onPressed: () => setState(() => _showPassword = !_showPassword),
                                ),
                                isDense: true,
                                contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                                focusedBorder: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(12),
                                  borderSide: const BorderSide(color: Color(0xFF15803d), width: 2),
                                ),
                              ),
                              validator: (v) => v == null || v.isEmpty ? 'Required' : null,
                            ),
                            const SizedBox(height: 8),
                            // Keep me signed in — stops the app from asking
                            // for password on cold-start.
                            Row(
                              children: [
                                Checkbox(
                                  value: _keepSignedIn,
                                  activeColor: const Color(0xFF15803d),
                                  visualDensity: VisualDensity.compact,
                                  materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                                  onChanged: (v) => setState(() => _keepSignedIn = v ?? false),
                                ),
                                const SizedBox(width: 4),
                                const Expanded(
                                  child: Text(
                                    'Keep me signed in',
                                    style: TextStyle(fontSize: 12, color: Color(0xFF4b5563)),
                                  ),
                                ),
                              ],
                            ),
                            if (_bioAvailable)
                              Row(
                                children: [
                                  Checkbox(
                                    value: _rememberWithBio,
                                    activeColor: const Color(0xFF15803d),
                                    visualDensity: VisualDensity.compact,
                                    materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                                    onChanged: (v) => setState(() => _rememberWithBio = v ?? false),
                                  ),
                                  const SizedBox(width: 4),
                                  const Expanded(
                                    child: Text(
                                      'Use fingerprint / face on next open',
                                      style: TextStyle(fontSize: 12, color: Color(0xFF4b5563)),
                                    ),
                                  ),
                                ],
                              ),
                            const SizedBox(height: 6),
                            FilledButton(
                              onPressed: _loading ? null : _login,
                              style: FilledButton.styleFrom(
                                backgroundColor: const Color(0xFF15803d),
                                foregroundColor: Colors.white,
                                padding: const EdgeInsets.symmetric(vertical: 11),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                              ),
                              child: _loading
                                  ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5))
                                  : const Text('Sign In', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
                            ),
                            if (_bioEnabled) ...[
                              const SizedBox(height: 6),
                              OutlinedButton.icon(
                                onPressed: _loading ? null : _unlockWithBio,
                                icon: const Icon(Icons.fingerprint, color: Color(0xFF15803d), size: 18),
                                label: const Text(
                                  'Unlock with fingerprint',
                                  style: TextStyle(color: Color(0xFF15803d), fontWeight: FontWeight.w700, fontSize: 13),
                                ),
                                style: OutlinedButton.styleFrom(
                                  side: const BorderSide(color: Color(0xFF15803d), width: 1.5),
                                  padding: const EdgeInsets.symmetric(vertical: 8),
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                  minimumSize: const Size(0, 36),
                                ),
                              ),
                            ],
                            const SizedBox(height: 4),
                            TextButton(
                              onPressed: () => context.go('/register'),
                              style: TextButton.styleFrom(
                                padding: const EdgeInsets.symmetric(vertical: 4),
                                minimumSize: const Size(0, 30),
                              ),
                              child: const Text(
                                "New here? Create an account 🥑",
                                style: TextStyle(color: Color(0xFF15803d), fontWeight: FontWeight.w600, fontSize: 13),
                              ),
                            ),
                            const SizedBox(height: 2),
                            Row(children: const [
                              Expanded(child: Divider(color: Color(0xFFe5e7eb))),
                              Padding(
                                padding: EdgeInsets.symmetric(horizontal: 8),
                                child: Text('or',
                                  style: TextStyle(fontSize: 10, color: Color(0xFF9ca3af), fontWeight: FontWeight.w600)),
                              ),
                              Expanded(child: Divider(color: Color(0xFFe5e7eb))),
                            ]),
                            const SizedBox(height: 4),
                            OutlinedButton.icon(
                              onPressed: () => UpdateService.openDownload('https://getguac.app/how-it-works'),
                              icon: const Icon(Icons.play_circle_outline, color: Color(0xFF15803d), size: 16),
                              label: const Text(
                                "See how it works · 7-min tour",
                                style: TextStyle(color: Color(0xFF15803d), fontWeight: FontWeight.w700, fontSize: 12),
                              ),
                              style: OutlinedButton.styleFrom(
                                side: const BorderSide(color: Color(0xFFa7f3d0), width: 1.2),
                                padding: const EdgeInsets.symmetric(vertical: 6),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                minimumSize: const Size(0, 32),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'getguac.app${_versionLabel.isEmpty ? '' : ' · $_versionLabel'}',
                    style: const TextStyle(color: Colors.white54, fontSize: 10, letterSpacing: 0.5),
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
