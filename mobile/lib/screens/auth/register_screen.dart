import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/gestures.dart';
import 'package:go_router/go_router.dart';
import 'package:http/http.dart' as http;
import 'package:url_launcher/url_launcher.dart';
import '../../widgets/guac_mascot.dart';

const _kBrand = Color(0xFF15803d);
const _kBrandDk = Color(0xFF064e3b);
final _usernameRe = RegExp(r'^[a-z0-9]([a-z0-9._-]{1,30}[a-z0-9])?$');

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});
  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _formKey = GlobalKey<FormState>();
  final _ctrls = {
    for (var k in ['username', 'firstName', 'lastName', 'email', 'password', 'confirmPassword', 'birthDate', 'age', 'mobile']) k: TextEditingController()
  };
  bool _loading = false;
  bool _showPassword = false;
  bool _showConfirmPassword = false;
  bool _acceptTerms = false;

  // When the server returns needs_email_confirmation we show an in-place
  // "Check your email" panel with a Resend button — sticking on this screen
  // is more likely to get the user to actually go look for the email than
  // dumping them at the login screen.
  String? _confirmEmail;
  String? _confirmUsername;
  bool _resending = false;

  // Live username availability check (debounced ~350ms)
  Timer? _debounce;
  String? _usernameStatus;  // available | taken | reserved | invalid | null
  bool _checkingUsername = false;

  @override
  void initState() {
    super.initState();
    _ctrls['username']!.addListener(_onUsernameChange);
    // Auto-derive age from birth date so the two fields can't disagree.
    _ctrls['birthDate']!.addListener(_recomputeAge);
  }

  void _recomputeAge() {
    final s = _ctrls['birthDate']!.text.trim();
    if (s.isEmpty) {
      if (_ctrls['age']!.text.isNotEmpty) _ctrls['age']!.text = '';
      return;
    }
    // Accept ISO 8601 (YYYY-MM-DD). DateTime.tryParse handles the standard
    // shape; anything malformed leaves age blank rather than guessing.
    final bd = DateTime.tryParse(s);
    if (bd == null) return;
    final today = DateTime.now();
    int age = today.year - bd.year;
    if (today.month < bd.month || (today.month == bd.month && today.day < bd.day)) {
      age--;
    }
    if (age < 0 || age > 150) return;
    final next = age.toString();
    if (_ctrls['age']!.text != next) _ctrls['age']!.text = next;
  }

  Future<void> _openUrl(String url) async {
    try {
      await launchUrl(Uri.parse(url), mode: LaunchMode.externalApplication);
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Could not open link: $e')),
      );
    }
  }

  @override
  void dispose() {
    _debounce?.cancel();
    for (final c in _ctrls.values) { c.dispose(); }
    super.dispose();
  }

  void _onUsernameChange() {
    final u = _ctrls['username']!.text.toLowerCase().trim();
    _debounce?.cancel();
    if (u.isEmpty) { setState(() { _usernameStatus = null; _checkingUsername = false; }); return; }
    if (!_usernameRe.hasMatch(u)) { setState(() => _usernameStatus = 'invalid'); return; }
    setState(() => _checkingUsername = true);
    _debounce = Timer(const Duration(milliseconds: 350), () => _checkUsername(u));
  }

  Future<void> _checkUsername(String u) async {
    try {
      final res = await http.get(Uri.parse('https://getguac.app/api/auth/check-username?username=${Uri.encodeComponent(u)}'));
      final body = json.decode(res.body) as Map<String, dynamic>;
      if (mounted) setState(() {
        _usernameStatus = body['status'] as String?;
        _checkingUsername = false;
      });
    } catch (_) {
      if (mounted) setState(() { _usernameStatus = null; _checkingUsername = false; });
    }
  }

  Future<void> _register() async {
    if (!_formKey.currentState!.validate()) return;
    if (_ctrls['password']!.text != _ctrls['confirmPassword']!.text) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Passwords do not match.')),
      );
      return;
    }
    if (_usernameStatus != 'available') {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Pick an available @getguac.app handle first.')),
      );
      return;
    }
    if (!_acceptTerms) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please accept the Terms & Privacy Policy.')),
      );
      return;
    }
    setState(() => _loading = true);
    try {
      // Route through the web API so the username is claimed atomically and
      // the Migadu mailbox is provisioned in the same request.
      final res = await http.post(
        Uri.parse('https://getguac.app/api/auth/sign-up'),
        headers: {'Content-Type': 'application/json'},
        body: json.encode({
          'username': _ctrls['username']!.text.toLowerCase().trim(),
          'email': _ctrls['email']!.text.trim(),
          'password': _ctrls['password']!.text,
          'first_name': _ctrls['firstName']!.text.trim(),
          'last_name': _ctrls['lastName']!.text.trim(),
          'birth_date': _ctrls['birthDate']!.text,
          'age': _ctrls['age']!.text,
          'mobile_no': _ctrls['mobile']!.text.trim(),
        }),
      );
      final body = json.decode(res.body) as Map<String, dynamic>;
      if (res.statusCode >= 400) {
        throw Exception(body['error'] ?? 'Sign-up failed');
      }
      if (!mounted) return;
      if (body['needs_email_confirmation'] == true) {
        setState(() {
          _confirmEmail = (body['email'] ?? _ctrls['email']!.text.trim()).toString();
          _confirmUsername = (body['pending_username'] ?? _ctrls['username']!.text.toLowerCase().trim()).toString();
        });
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Welcome to GetGuac, @${body['username'] ?? _ctrls['username']!.text}! Sign in to continue. 🥑')),
        );
        context.go('/login');
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _resendConfirmation() async {
    final email = _confirmEmail;
    if (email == null || _resending) return;
    setState(() => _resending = true);
    try {
      final res = await http.post(
        Uri.parse('https://getguac.app/api/auth/resend-confirmation'),
        headers: {'Content-Type': 'application/json'},
        body: json.encode({'email': email}),
      );
      final body = json.decode(res.body) as Map<String, dynamic>;
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(body['message'] ?? 'Sent — check $email')),
      );
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Resend failed: $e')));
    } finally {
      if (mounted) setState(() => _resending = false);
    }
  }

  Widget _confirmEmailPanel() {
    final email = _confirmEmail ?? '';
    final username = _confirmUsername ?? '';
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Card(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
          elevation: 10,
          shadowColor: Colors.black54,
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(children: [
                  const Text('📬', style: TextStyle(fontSize: 28)),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: const [
                        Text('Check your email', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: _kBrandDk)),
                        Text("Verify it's really you before we activate the account.", style: TextStyle(fontSize: 11, color: Colors.black54)),
                      ],
                    ),
                  ),
                ]),
                const SizedBox(height: 12),
                Text.rich(TextSpan(
                  style: const TextStyle(fontSize: 13.5, height: 1.45, color: Colors.black87),
                  children: [
                    const TextSpan(text: 'We sent a confirmation link to '),
                    TextSpan(text: email, style: const TextStyle(fontWeight: FontWeight.w800, color: _kBrand)),
                    const TextSpan(text: '. Tap it on this device and your handle '),
                    TextSpan(text: '@$username', style: const TextStyle(fontFamily: 'monospace', fontWeight: FontWeight.w800, color: _kBrand)),
                    const TextSpan(text: ' will be reserved.'),
                  ],
                )),
                const SizedBox(height: 8),
                const Text("Not in your inbox in a minute? Check spam, or hit Resend below.",
                  style: TextStyle(fontSize: 11, color: Colors.black54)),
                const SizedBox(height: 14),
                Row(children: [
                  Expanded(
                    child: FilledButton.icon(
                      style: FilledButton.styleFrom(
                        backgroundColor: _kBrand,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 10),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      onPressed: _resending ? null : _resendConfirmation,
                      icon: _resending
                          ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                          : const Icon(Icons.send_outlined, size: 16),
                      label: const Text('Resend email'),
                    ),
                  ),
                  const SizedBox(width: 8),
                  OutlinedButton(
                    style: OutlinedButton.styleFrom(
                      side: const BorderSide(color: _kBrand, width: 1.2),
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    onPressed: () => context.go('/login'),
                    child: const Text('Sign in', style: TextStyle(color: _kBrand, fontWeight: FontWeight.w700)),
                  ),
                ]),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _passwordField(String key, String label, bool show, VoidCallback onToggle, {String? hint}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: TextFormField(
        controller: _ctrls[key],
        obscureText: !show,
        decoration: InputDecoration(
          labelText: label,
          hintText: hint,
          prefixIcon: const Icon(Icons.lock_outline, color: _kBrand),
          suffixIcon: IconButton(
            icon: Icon(show ? Icons.visibility_off_outlined : Icons.visibility_outlined, size: 20, color: Colors.black54),
            tooltip: show ? 'Hide password' : 'Show password',
            onPressed: onToggle,
          ),
        ),
        validator: (v) {
          if (v == null || v.isEmpty) return 'Required';
          if (key == 'password' && v.length < 10) return 'Min 10 characters';
          if (key == 'confirmPassword' && v != _ctrls['password']!.text) return 'Passwords do not match';
          return null;
        },
      ),
    );
  }

  Widget _birthDateField() {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: TextFormField(
        controller: _ctrls['birthDate'],
        readOnly: true,
        onTap: () async {
          final now = DateTime.now();
          final initial = DateTime.tryParse(_ctrls['birthDate']!.text) ?? DateTime(now.year - 25, now.month, now.day);
          final picked = await showDatePicker(
            context: context,
            initialDate: initial,
            firstDate: DateTime(1900),
            lastDate: now,
          );
          if (picked != null) {
            _ctrls['birthDate']!.text = '${picked.year.toString().padLeft(4, '0')}-${picked.month.toString().padLeft(2, '0')}-${picked.day.toString().padLeft(2, '0')}';
          }
        },
        decoration: const InputDecoration(
          labelText: 'Birth Date',
          hintText: 'Tap to pick',
          prefixIcon: Icon(Icons.calendar_today_outlined, color: _kBrand),
        ),
      ),
    );
  }

  Widget _ageField() {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: TextFormField(
        controller: _ctrls['age'],
        readOnly: true,
        decoration: const InputDecoration(
          labelText: 'Age (auto)',
          hintText: '—',
          prefixIcon: Icon(Icons.cake_outlined, color: _kBrand),
          filled: true,
          fillColor: Color(0xFFf9fafb),
        ),
        style: const TextStyle(color: Colors.black54),
      ),
    );
  }

  Widget _termsCheckbox() {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Checkbox(
          value: _acceptTerms,
          activeColor: _kBrand,
          onChanged: (v) => setState(() => _acceptTerms = v ?? false),
          materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
          visualDensity: VisualDensity.compact,
        ),
        Expanded(
          child: GestureDetector(
            onTap: () => setState(() => _acceptTerms = !_acceptTerms),
            child: Padding(
              padding: const EdgeInsets.only(top: 12),
              child: Text.rich(TextSpan(
                style: const TextStyle(fontSize: 12, color: Colors.black87, height: 1.4),
                children: [
                  const TextSpan(text: 'I agree to the '),
                  TextSpan(
                    text: 'Terms of Service',
                    style: const TextStyle(color: _kBrand, fontWeight: FontWeight.w700, decoration: TextDecoration.underline),
                    recognizer: (TapGestureRecognizer()..onTap = () => _openUrl('https://getguac.app/terms')),
                  ),
                  const TextSpan(text: ' and '),
                  TextSpan(
                    text: 'Privacy Policy',
                    style: const TextStyle(color: _kBrand, fontWeight: FontWeight.w700, decoration: TextDecoration.underline),
                    recognizer: (TapGestureRecognizer()..onTap = () => _openUrl('https://getguac.app/privacy')),
                  ),
                  const TextSpan(text: '.'),
                ],
              )),
            ),
          ),
        ),
      ]),
    );
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
          prefixIcon: icon != null ? Icon(icon, color: _kBrand) : null,
        ),
        validator: ['firstName', 'lastName', 'email', 'password'].contains(key)
            ? (v) => v == null || v.isEmpty ? 'Required' : null
            : null,
      ),
    );
  }

  Widget _usernameField() {
    final u = _ctrls['username']!.text.toLowerCase().trim();
    String? hint;
    Color hintColor = Colors.black54;
    IconData? hintIcon;
    if (u.isEmpty) {
      hint = '3–32 chars · a-z 0-9 . _ -';
    } else if (_checkingUsername) {
      hint = 'Checking…'; hintColor = Colors.black54;
    } else if (_usernameStatus == 'available') {
      hint = '$u@getguac.app is available';
      hintColor = _kBrand; hintIcon = Icons.check_circle;
    } else if (_usernameStatus == 'taken') {
      hint = 'Already taken'; hintColor = const Color(0xFFdc2626); hintIcon = Icons.cancel;
    } else if (_usernameStatus == 'reserved') {
      hint = 'Reserved word — try something else'; hintColor = const Color(0xFFb45309); hintIcon = Icons.info;
    } else if (_usernameStatus == 'invalid') {
      hint = 'Must start and end with a letter or number';
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      padding: const EdgeInsets.fromLTRB(12, 10, 12, 10),
      decoration: BoxDecoration(
        color: const Color(0xFFf0fdf4),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFa7f3d0), width: 1.5),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: const [
          Icon(Icons.alternate_email, size: 14, color: _kBrandDk),
          SizedBox(width: 6),
          Text('PICK YOUR GETGUAC HANDLE',
            style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: _kBrandDk, letterSpacing: 1)),
        ]),
        const SizedBox(height: 2),
        const Text(
          "This is your sign-in name AND your free @getguac.app email — yours forever.",
          style: TextStyle(fontSize: 11, color: Color(0xFF065f46), height: 1.3),
        ),
        const SizedBox(height: 8),
        Row(children: [
          Expanded(child: TextFormField(
            controller: _ctrls['username'],
            autocorrect: false,
            inputFormatters: const [],
            textCapitalization: TextCapitalization.none,
            decoration: InputDecoration(
              hintText: 'e.g. alex',
              filled: true,
              fillColor: Colors.white,
              isDense: true,
              contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            ),
            validator: (v) {
              if (v == null || v.trim().isEmpty) return 'Required';
              if (_usernameStatus != 'available') return 'Pick an available handle';
              return null;
            },
          )),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 11),
            decoration: const BoxDecoration(
              color: Color(0xFFf3f4f6),
              borderRadius: BorderRadius.only(topRight: Radius.circular(8), bottomRight: Radius.circular(8)),
            ),
            child: const Text('@getguac.app', style: TextStyle(fontFamily: 'monospace', fontSize: 12, color: Colors.black54)),
          ),
        ]),
        if (hint != null) ...[
          const SizedBox(height: 4),
          Row(children: [
            if (hintIcon != null) Icon(hintIcon, size: 12, color: hintColor),
            if (hintIcon != null) const SizedBox(width: 4),
            Expanded(child: Text(hint, style: TextStyle(fontSize: 11, color: hintColor, fontWeight: FontWeight.w600))),
          ]),
        ],
      ]),
    );
  }

  Widget _privacyNote() {
    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFFf0fdf4),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFa7f3d0)),
      ),
      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const Icon(Icons.shield, size: 18, color: _kBrand),
        const SizedBox(width: 10),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: const [
          Text('Your guac. Your rules.', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 12, color: _kBrandDk)),
          SizedBox(height: 4),
          Text('• Row-level security on every table — only you can see your data.',
            style: TextStyle(fontSize: 10.5, color: Color(0xFF065f46), height: 1.4)),
          Text('• No selling, no ads, no third-party sharing.',
            style: TextStyle(fontSize: 10.5, color: Color(0xFF065f46), height: 1.4)),
          Text('• Receipts inbox is OPT-IN — your personal mailbox is never read.',
            style: TextStyle(fontSize: 10.5, color: Color(0xFF065f46), height: 1.4)),
          Text('• One-tap account + data deletion from your Profile.',
            style: TextStyle(fontSize: 10.5, color: Color(0xFF065f46), height: 1.4, fontWeight: FontWeight.w700)),
        ])),
      ]),
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
          child: _confirmEmail != null
            ? _confirmEmailPanel()
            : SingleChildScrollView(
            padding: const EdgeInsets.all(20),
            child: Column(
              children: [
                const SizedBox(height: 16),
                const GuacMascot(size: 100),
                const SizedBox(height: 12),
                const Text(
                  'Join GetGuac',
                  style: TextStyle(color: Colors.white, fontSize: 28, fontWeight: FontWeight.w900),
                ),
                const SizedBox(height: 2),
                const Text(
                  'Your Guac-AI personal finance sidekick.',
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
                            style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: _kBrandDk),
                          ),
                          const SizedBox(height: 12),
                          _privacyNote(),
                          _usernameField(),
                          Row(children: [
                            Expanded(child: _field('firstName', 'First Name', icon: Icons.person_outline)),
                            const SizedBox(width: 10),
                            Expanded(child: _field('lastName', 'Last Name')),
                          ]),
                          _field('email', 'Email', type: TextInputType.emailAddress, icon: Icons.email_outlined),
                          _passwordField('password', 'Password', _showPassword, () => setState(() => _showPassword = !_showPassword), hint: 'Min 10 chars'),
                          _passwordField('confirmPassword', 'Confirm Password', _showConfirmPassword, () => setState(() => _showConfirmPassword = !_showConfirmPassword)),
                          _birthDateField(),
                          _ageField(),
                          _field('mobile', 'Mobile (optional)', type: TextInputType.phone, icon: Icons.phone_outlined),
                          _termsCheckbox(),
                          const SizedBox(height: 4),
                          FilledButton(
                            onPressed: _loading || _usernameStatus != 'available' || !_acceptTerms ? null : _register,
                            style: FilledButton.styleFrom(
                              backgroundColor: _kBrand,
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
                              style: TextStyle(color: _kBrand, fontWeight: FontWeight.w600),
                            ),
                          ),
                          const SizedBox(height: 4),
                          const Padding(
                            padding: EdgeInsets.symmetric(horizontal: 8),
                            child: Text(
                              "You stay in control. Delete your account + all data anytime from Profile.",
                              textAlign: TextAlign.center,
                              style: TextStyle(fontSize: 10.5, color: Colors.black54, height: 1.4),
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
