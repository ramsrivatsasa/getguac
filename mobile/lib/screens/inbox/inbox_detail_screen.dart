// Single-message detail screen — full body, star/trash/reply actions.
// Mirrors the right-hand pane on the web /inbox UI.
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_html/flutter_html.dart';
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
              // Sender / date
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: const Color(0xFFf9fafb),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text('From', style: TextStyle(fontSize: 10, color: Colors.black.withValues(alpha: 0.5), fontWeight: FontWeight.w700, letterSpacing: 1)),
                  const SizedBox(height: 2),
                  Text(m['from_addr']?.toString() ?? '—',
                    style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
                  const SizedBox(height: 8),
                  Text(_formatReceived(m['received_at']?.toString()),
                    style: const TextStyle(fontSize: 11, color: Colors.black54)),
                ]),
              ),
              if (processed && receiptId != null) ...[
                const SizedBox(height: 12),
                InkWell(
                  onTap: () => context.go('/receipts/$receiptId'),
                  borderRadius: BorderRadius.circular(12),
                  child: Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: const Color(0xFFfef3c7),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0xFFfde68a)),
                    ),
                    child: Row(children: const [
                      Icon(Icons.auto_awesome, color: Color(0xFFb45309), size: 18),
                      SizedBox(width: 8),
                      Expanded(child: Text(
                        'Guac-AI parsed this as a receipt — tap to open',
                        style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: Color(0xFFb45309)),
                      )),
                      Icon(Icons.chevron_right, color: Color(0xFFb45309), size: 18),
                    ]),
                  ),
                ),
              ],
              const SizedBox(height: 16),
              if (hasHtml)
                Html(
                  data: bodyHtml,
                  style: {
                    'body': Style(
                      fontSize: FontSize(13.5),
                      lineHeight: const LineHeight(1.45),
                      margin: Margins.zero,
                      padding: HtmlPaddings.zero,
                    ),
                    'img': Style(width: Width(100, Unit.percent), height: Height.auto()),
                    'table': Style(width: Width(100, Unit.percent)),
                    'a': Style(color: const Color(0xFF15803d)),
                    'p': Style(margin: Margins.only(bottom: 8)),
                  },
                  onLinkTap: (url, _, __) {
                    if (url == null) return;
                    launchUrl(Uri.parse(url), mode: LaunchMode.externalApplication).catchError((_) => false);
                  },
                )
              else if (bodyText.isNotEmpty)
                SelectableText(
                  bodyText,
                  style: const TextStyle(fontSize: 13.5, height: 1.5),
                )
              else
                const Text('(Empty body)', style: TextStyle(color: Colors.black38)),
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
