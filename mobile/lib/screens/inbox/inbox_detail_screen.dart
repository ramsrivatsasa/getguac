// Single-message detail screen — full body, star/trash/reply actions.
// Mirrors the right-hand pane on the web /inbox UI.
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:http/http.dart' as http;
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:url_launcher/url_launcher.dart';
import 'inbox_screen.dart' show openInboxComposer;

const _kBrand = Color(0xFF15803d);
const _kApiBase = 'https://getguac.app';

class InboxDetailScreen extends StatefulWidget {
  final String id;
  const InboxDetailScreen({super.key, required this.id});
  @override
  State<InboxDetailScreen> createState() => _InboxDetailScreenState();
}

class _InboxDetailScreenState extends State<InboxDetailScreen> {
  bool _loading = true;
  Map<String, dynamic>? _msg;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    final session = Supabase.instance.client.auth.currentSession;
    if (session == null) { setState(() => _loading = false); return; }
    try {
      final res = await http.get(
        Uri.parse('$_kApiBase/api/email/${widget.id}'),
        headers: {'Authorization': 'Bearer ${session.accessToken}'},
      );
      if (res.statusCode == 200) {
        final body = json.decode(res.body) as Map<String, dynamic>;
        if (mounted) setState(() {
          _msg = body['message'] as Map<String, dynamic>;
          _loading = false;
        });
      } else {
        throw Exception('HTTP ${res.statusCode}');
      }
    } catch (e) {
      if (mounted) {
        setState(() => _loading = false);
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Load failed: $e')));
      }
    }
  }

  Future<void> _patch(Map<String, dynamic> patch) async {
    final session = Supabase.instance.client.auth.currentSession;
    if (session == null) return;
    try {
      await http.patch(
        Uri.parse('$_kApiBase/api/email/${widget.id}'),
        headers: {'Authorization': 'Bearer ${session.accessToken}', 'Content-Type': 'application/json'},
        body: json.encode(patch),
      );
      await _load();
    } catch (_) {}
  }

  Future<void> _trash() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Move to Trash?'),
        content: const Text('This message will be moved to Trash. You can delete it permanently from there.'),
        actions: [
          TextButton(onPressed: () => Navigator.of(ctx).pop(false), child: const Text('Cancel')),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: const Color(0xFFdc2626)),
            onPressed: () => Navigator.of(ctx).pop(true),
            child: const Text('Move to Trash'),
          ),
        ],
      ),
    );
    if (confirm != true) return;
    final session = Supabase.instance.client.auth.currentSession;
    if (session == null) return;
    try {
      await http.delete(
        Uri.parse('$_kApiBase/api/email/${widget.id}'),
        headers: {'Authorization': 'Bearer ${session.accessToken}'},
      );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Moved to Trash')));
        context.go('/inbox');
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
    }
  }

  void _reply() {
    if (_msg == null) return;
    final from = _msg!['from_addr']?.toString() ?? '';
    final subject = _msg!['subject']?.toString() ?? '';
    final prevBody = _msg!['body_text']?.toString() ?? _msg!['preview']?.toString() ?? '';
    final receivedAt = _msg!['received_at']?.toString() ?? '';
    final quote = prevBody.split('\n').take(40).map((l) => '> $l').join('\n');
    openInboxComposer(context, prefill: {
      'to': from,
      'subject': subject.startsWith('Re:') ? subject : 'Re: $subject',
      'body': '\n\n———\nOn $receivedAt, $from wrote:\n$quote',
    });
  }

  void _goBack() => context.go('/inbox');

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return Scaffold(
        appBar: AppBar(leading: BackButton(onPressed: _goBack)),
        body: const Center(child: CircularProgressIndicator()),
      );
    }
    if (_msg == null) {
      return Scaffold(
        appBar: AppBar(leading: BackButton(onPressed: _goBack)),
        body: const Center(child: Text('Message not found')),
      );
    }
    final m = _msg!;
    final starred = m['starred'] == true;
    final processed = m['processed'] == true;
    final receiptId = m['receipt_id']?.toString();
    final bodyText = (m['body_text'] ?? m['preview'] ?? '').toString();
    final bodyHtml = (m['body_html'] ?? '').toString();
    final hasHtml = bodyHtml.trim().isNotEmpty;

    return Scaffold(
      appBar: AppBar(
        leading: BackButton(onPressed: _goBack),
        title: Text(
          (m['subject']?.toString() ?? '').isEmpty ? '(no subject)' : m['subject'].toString(),
          overflow: TextOverflow.ellipsis, maxLines: 1,
          style: const TextStyle(fontSize: 15),
        ),
        actions: [
          IconButton(
            icon: Icon(starred ? Icons.star : Icons.star_border,
              color: starred ? const Color(0xFFf59e0b) : null),
            tooltip: starred ? 'Unstar' : 'Star',
            onPressed: () => _patch({'starred': !starred}),
          ),
          IconButton(icon: const Icon(Icons.reply), tooltip: 'Reply', onPressed: _reply),
          IconButton(icon: const Icon(Icons.delete_outline), tooltip: 'Trash', onPressed: _trash),
        ],
      ),
      body: PopScope(
        canPop: false,
        onPopInvoked: (didPop) { if (!didPop) _goBack(); },
        child: GestureDetector(
          behavior: HitTestBehavior.translucent,
          onHorizontalDragEnd: (details) {
            final v = details.primaryVelocity ?? 0;
            if (v > 600) _goBack();   // swipe right to go back
          },
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              // Receipt-filed callout (top of detail when applicable, so the user
              // immediately sees the green status without scrolling)
              if (processed && receiptId != null) ...[
                _ReceiptFiledBanner(receiptId: receiptId, onTap: () => context.go('/receipts/$receiptId')),
                const SizedBox(height: 12),
              ] else if (m['is_receipts_hook'] == true) ...[
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: const Color(0xFFfff7ed),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: const Color(0xFFfed7aa)),
                  ),
                  child: const Row(children: [
                    Icon(Icons.hourglass_top, color: Color(0xFFc2410c), size: 18),
                    SizedBox(width: 8),
                    Expanded(child: Text(
                      'Sent to +g — Guac-AI is processing this. Receipt will appear in /receipts shortly.',
                      style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFF9a3412)),
                    )),
                  ]),
                ),
                const SizedBox(height: 12),
              ],

              // Sender / date — primary headers
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: const Color(0xFFf9fafb),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  _HeaderRow(label: 'From',  value: m['from_addr']?.toString() ?? '—', bold: true),
                  _HeaderRow(label: 'To',    value: m['to_addr']?.toString() ?? '—'),
                  if ((m['delivered_to']?.toString() ?? '').isNotEmpty)
                    _HeaderRow(label: 'Delivered-To', value: m['delivered_to'].toString()),
                  _HeaderRow(label: 'Date',  value: _formatReceived(m['received_at']?.toString())),
                ]),
              ),

              // Expandable "show more headers" section
              ExpansionTile(
                tilePadding: const EdgeInsets.symmetric(horizontal: 8, vertical: 0),
                title: const Text('Email headers', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFF6b7280))),
                childrenPadding: const EdgeInsets.fromLTRB(8, 0, 8, 8),
                children: [
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: const Color(0xFFf3f4f6),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: SelectableText(
                      _formatAllHeaders(m),
                      style: const TextStyle(fontFamily: 'monospace', fontSize: 11, height: 1.5),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              // For now we render plain text. Rich HTML email rendering needs
              // a WebView wrapper which had startup issues — coming back as
              // a follow-up. The plain text version still has all the
              // info, just none of the styling/logos.
              if (bodyText.isNotEmpty)
                SelectableText(
                  bodyText,
                  style: const TextStyle(fontSize: 13.5, height: 1.5),
                )
              else if (hasHtml)
                SelectableText(
                  _htmlToText(bodyHtml),
                  style: const TextStyle(fontSize: 13.5, height: 1.5),
                )
              else
                const Text('(Empty body)', style: TextStyle(color: Colors.black38)),
              if (hasHtml) ...[
                const SizedBox(height: 12),
                OutlinedButton.icon(
                  onPressed: () {
                    // Open the rich HTML version on the web app's /inbox/:id
                    // (which renders inside a sandboxed iframe).
                    launchUrl(
                      Uri.parse('https://getguac.app/inbox?msg=${widget.id}'),
                      mode: LaunchMode.externalApplication,
                    ).catchError((_) => false);
                  },
                  icon: const Icon(Icons.open_in_browser, size: 16),
                  label: const Text('Open rich version (logos, tables) in browser'),
                  style: OutlinedButton.styleFrom(
                    side: const BorderSide(color: _kBrand),
                    foregroundColor: _kBrand,
                  ),
                ),
              ],
              const SizedBox(height: 24),
              Row(children: [
                Expanded(child: OutlinedButton.icon(
                  onPressed: _reply,
                  icon: const Icon(Icons.reply, size: 18, color: _kBrand),
                  label: const Text('Reply', style: TextStyle(color: _kBrand, fontWeight: FontWeight.w700)),
                  style: OutlinedButton.styleFrom(
                    side: const BorderSide(color: _kBrand, width: 1.5),
                    padding: const EdgeInsets.symmetric(vertical: 12),
                  ),
                )),
                const SizedBox(width: 10),
                Expanded(child: OutlinedButton.icon(
                  onPressed: _trash,
                  icon: const Icon(Icons.delete_outline, size: 18, color: Color(0xFFdc2626)),
                  label: const Text('Trash', style: TextStyle(color: Color(0xFFdc2626), fontWeight: FontWeight.w700)),
                  style: OutlinedButton.styleFrom(
                    side: const BorderSide(color: Color(0xFFdc2626), width: 1.5),
                    padding: const EdgeInsets.symmetric(vertical: 12),
                  ),
                )),
              ]),
            ],
          ),
        ),
      ),
    );
  }

  String _formatReceived(String? iso) {
    if (iso == null) return '';
    final d = DateTime.tryParse(iso);
    if (d == null) return iso;
    final local = d.toLocal();
    return '${local.toIso8601String().substring(0, 16).replaceFirst('T', ' ')}';
  }
}

class _ReceiptFiledBanner extends StatelessWidget {
  final String receiptId;
  final VoidCallback onTap;
  const _ReceiptFiledBanner({required this.receiptId, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(14),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            begin: Alignment.topLeft, end: Alignment.bottomRight,
            colors: [Color(0xFFa3e635), Color(0xFF15803d)],
          ),
          borderRadius: BorderRadius.circular(14),
          boxShadow: const [BoxShadow(color: Color(0x4015803d), blurRadius: 8, offset: Offset(0, 3))],
        ),
        child: Row(children: const [
          Icon(Icons.check_circle, color: Colors.white, size: 22),
          SizedBox(width: 10),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [
            Text('Receipt filed by Guac-AI 🥑',
              style: TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.w900)),
            SizedBox(height: 2),
            Text('Tap to open the parsed receipt',
              style: TextStyle(color: Colors.white70, fontSize: 11)),
          ])),
          Icon(Icons.arrow_forward, color: Colors.white, size: 18),
        ]),
      ),
    );
  }
}

class _HeaderRow extends StatelessWidget {
  final String label;
  final String value;
  final bool bold;
  const _HeaderRow({required this.label, required this.value, this.bold = false});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        SizedBox(
          width: 90,
          child: Text(label.toUpperCase(),
            style: TextStyle(fontSize: 9, color: Colors.black.withValues(alpha: 0.5),
              fontWeight: FontWeight.w800, letterSpacing: 1)),
        ),
        Expanded(child: SelectableText(value,
          style: TextStyle(fontSize: 12, fontWeight: bold ? FontWeight.w700 : FontWeight.w500))),
      ]),
    );
  }
}

/// Build a full plain-text dump of every header we have stored.
/// Useful for power users wanting to inspect routing or debug spam.
String _formatAllHeaders(Map<String, dynamic> m) {
  String safe(dynamic v) => v?.toString() ?? '';
  final lines = <String>[
    'From:          ${safe(m['from_addr'])}',
    'To:            ${safe(m['to_addr'])}',
    if ((m['delivered_to']?.toString() ?? '').isNotEmpty)
      'Delivered-To:  ${m['delivered_to']}',
    'Subject:       ${safe(m['subject'])}',
    'Date:          ${safe(m['received_at'])}',
    if ((m['message_id']?.toString() ?? '').isNotEmpty)
      'Message-Id:    ${m['message_id']}',
    if ((m['uid'] ?? '').toString().isNotEmpty)
      'IMAP UID:      ${m['uid']}',
    if (m['is_receipts_hook'] == true)
      'Hook:          +g (auto-receipt)',
    if (m['has_attachments'] == true)
      'Attachments:   yes',
    if (m['processed'] == true)
      'Processed:     yes (receipt_id=${m['receipt_id']})',
  ];
  return lines.join('\n');
}

/// Strip HTML tags into newline-friendly plain text. Not a full HTML renderer,
/// but readable enough for receipts when the email only has an HTML body.
String _htmlToText(String html) {
  var s = html;
  // Drop script/style blocks entirely
  s = s.replaceAll(RegExp(r'<(script|style|head)[^>]*>.*?</\1>', dotAll: true, caseSensitive: false), '');
  // Block tags -> newline
  s = s.replaceAll(RegExp(r'</?(p|div|br|tr|li|h[1-6]|table)[^>]*>', caseSensitive: false), '\n');
  // Drop remaining tags
  s = s.replaceAll(RegExp(r'<[^>]+>'), '');
  // Decode the most common entities
  s = s
    .replaceAll('&nbsp;', ' ')
    .replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll(RegExp(r'&[a-z]+;', caseSensitive: false), '');
  // Collapse whitespace
  s = s.replaceAll(RegExp(r'[ \t]+'), ' ');
  s = s.replaceAll(RegExp(r'\n[ \t]+'), '\n');
  s = s.replaceAll(RegExp(r'\n{3,}'), '\n\n');
  return s.trim();
}
