// "Report a problem" screen. Free-form subject + description from the user,
// auto-bundled with the recent debug log and uploaded to audit_log via
// ErrorReportService. Linked from Profile -> Report a problem and also
// pre-fillable from any failure dialog elsewhere in the app.

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../services/error_report_service.dart';

class ReportProblemScreen extends StatefulWidget {
  /// Optional pre-fill from a caller (e.g., the batch-capture failure
  /// dialog passes the failure list as the description).
  final String? prefillSubject;
  final String? prefillDescription;
  final Map<String, dynamic>? context;

  const ReportProblemScreen({
    super.key,
    this.prefillSubject,
    this.prefillDescription,
    this.context,
  });

  @override
  State<ReportProblemScreen> createState() => _ReportProblemScreenState();
}

class _ReportProblemScreenState extends State<ReportProblemScreen> {
  late final TextEditingController _subject;
  late final TextEditingController _description;
  bool _sending = false;
  String? _result;
  bool _ok = false;

  @override
  void initState() {
    super.initState();
    _subject = TextEditingController(text: widget.prefillSubject ?? '');
    _description = TextEditingController(text: widget.prefillDescription ?? '');
  }

  @override
  void dispose() {
    _subject.dispose();
    _description.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    if (_subject.text.trim().isEmpty && _description.text.trim().isEmpty) {
      setState(() {
        _result = 'Add a short subject and description so we know what to look at.';
        _ok = false;
      });
      return;
    }
    setState(() { _sending = true; _result = null; });
    final res = await ErrorReportService.send(
      subject: _subject.text.trim().isEmpty ? '(no subject)' : _subject.text.trim(),
      description: _description.text.trim(),
      context: widget.context,
    );
    if (!mounted) return;
    if (res.ok) {
      // Success: surface a confirmation as a snackbar on the destination
      // route, then pop back to whatever the user was doing. Pop wins over
      // a forced go('/dashboard') so the back stack stays sensible when
      // the screen was opened from the batch-failure dialog vs Profile.
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        backgroundColor: const Color(0xFF15803d),
        content: const Row(children: [
          Icon(Icons.check_circle_outline, color: Colors.white),
          SizedBox(width: 10),
          Expanded(child: Text(
            'Report sent — thanks. We have the recent log and will dig in.',
            style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700),
          )),
        ]),
        duration: const Duration(seconds: 4),
      ));
      if (context.canPop()) {
        context.pop();
      } else {
        context.go('/dashboard');
      }
      return;
    }
    setState(() {
      _sending = false;
      _ok = false;
      _result = 'Send failed: ${res.error}';
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Report a problem'),
        leading: IconButton(
          icon: const Icon(Icons.close),
          onPressed: () => context.canPop() ? context.pop() : context.go('/profile'),
        ),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Text(
                'Tell us what went wrong. We include the recent in-app debug log '
                'automatically so the team can see exactly what happened.',
                style: TextStyle(fontSize: 13, color: Color(0xFF4b5563), height: 1.4),
              ),
              const SizedBox(height: 16),
              TextField(
                controller: _subject,
                decoration: const InputDecoration(
                  labelText: 'Subject',
                  hintText: 'e.g. Camera capture saves blank receipts',
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _description,
                minLines: 5,
                maxLines: 12,
                decoration: const InputDecoration(
                  labelText: 'What happened?',
                  hintText: 'Steps you took, what you expected, what you saw instead.',
                  alignLabelWithHint: true,
                ),
              ),
              const SizedBox(height: 16),
              if (_result != null) ...[
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: _ok ? const Color(0xFFdcfce7) : const Color(0xFFfee2e2),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    _result!,
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                      color: _ok ? const Color(0xFF065f46) : const Color(0xFF991b1b),
                    ),
                  ),
                ),
                const SizedBox(height: 12),
              ],
              FilledButton.icon(
                onPressed: _sending ? null : _send,
                icon: _sending
                    ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : const Icon(Icons.send_rounded),
                label: Text(_sending ? 'Sending…' : 'Send report',
                  style: const TextStyle(fontWeight: FontWeight.w800)),
                style: FilledButton.styleFrom(
                  backgroundColor: const Color(0xFF15803d),
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
              ),
              const SizedBox(height: 8),
              const Text(
                'No personal info is sent — only your account ID, the app version, '
                'and the recent in-app log events.',
                style: TextStyle(fontSize: 11, color: Color(0xFF6b7280)),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
