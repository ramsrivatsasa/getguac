// Inbox — list of messages from the user's GetGuac Mail mailbox.
// Reads from the same /api/email/list endpoint the web /inbox uses.
import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:http/http.dart' as http;
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../services/update_service.dart';
import '../../widgets/guac_mascot.dart';

const _kBrand = Color(0xFF15803d);
const _kBrandLight = Color(0xFFd1fae5);
const _kApiBase = 'https://getguac.app';

class InboxScreen extends StatefulWidget {
  const InboxScreen({super.key});
  @override
  State<InboxScreen> createState() => _InboxScreenState();
}

class _Message {
  final String id;
  final String fromAddr, subject, preview;
  final DateTime? receivedAt;
  final bool isReceiptsHook, processed, read, starred;
  final String? receiptId;
  _Message.fromMap(Map<String, dynamic> m)
    : id = (m['id'] ?? '').toString(),
      fromAddr = (m['from_addr'] ?? '').toString(),
      subject = (m['subject'] ?? '').toString(),
      preview = (m['preview'] ?? '').toString(),
      receivedAt = DateTime.tryParse((m['received_at'] ?? '').toString()),
      isReceiptsHook = m['is_receipts_hook'] == true,
      processed = m['processed'] == true,
      read = m['read_at'] != null,
      starred = m['starred'] == true,
      receiptId = m['receipt_id']?.toString();
}

const _filters = ['', 'unread', 'receipts', 'starred'];
const _filterLabels = {'': 'All', 'unread': 'Unread', 'receipts': 'Receipts', 'starred': 'Starred'};
const _folders = ['inbox', 'sent', 'trash'];
const _folderIcons = {'inbox': Icons.inbox, 'sent': Icons.send_outlined, 'trash': Icons.delete_outline};

class _InboxScreenState extends State<InboxScreen> {
  String _folder = 'inbox';
  String _filter = '';
  String _query = '';
  bool _loading = true;
  List<_Message> _messages = [];
  Timer? _searchDebounce;
  final _queryCtrl = TextEditingController();

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _searchDebounce?.cancel();
    _queryCtrl.dispose();
    super.dispose();
  }

  Future<String?> _authHeader() async {
    final session = Supabase.instance.client.auth.currentSession;
    return session?.accessToken;
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    final token = await _authHeader();
    if (token == null) { if (mounted) setState(() => _loading = false); return; }
    final uri = Uri.parse('$_kApiBase/api/email/list?'
      'folder=${Uri.encodeQueryComponent(_folder)}&'
      'filter=${Uri.encodeQueryComponent(_filter)}&'
      'q=${Uri.encodeQueryComponent(_query)}');
    try {
      final res = await http.get(uri, headers: {'Authorization': 'Bearer $token'});
      if (res.statusCode == 200) {
        final body = json.decode(res.body) as Map<String, dynamic>;
        final list = (body['messages'] as List? ?? []).cast<Map<String, dynamic>>();
        if (mounted) setState(() {
          _messages = list.map(_Message.fromMap).toList();
          _loading = false;
        });
      } else {
        throw Exception('HTTP ${res.statusCode}');
      }
    } catch (e) {
      if (mounted) {
        setState(() { _loading = false; _messages = []; });
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Load failed: $e')));
      }
    }
  }

  Future<void> _refresh() async {
    final token = await _authHeader();
    if (token == null) return;
    // Trigger a real IMAP poll first so brand-new mail is fetched.
    try {
      final session = Supabase.instance.client.auth.currentSession;
      if (session != null) {
        // The /api/email/poll endpoint requires the CRON_SECRET, not user auth,
        // so we can't call it from the client. We just re-fetch the list — the
        // background cron will have populated it within 10 min.
      }
    } catch (_) {}
    await _load();
  }

  /// Force re-pull EVERY message from the mailbox starting at UID 1.
  /// Server enforces a 5-min cooldown and a 200-message-per-call cap.
  Future<void> _backfillAll() async {
    final session = Supabase.instance.client.auth.currentSession;
    if (session == null) return;
    if (!mounted) return;
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Backfill all mail?'),
        content: const Text(
          'GetGuac will re-download every message in your mailbox from the start. '
          '+g messages will also be auto-filed as receipts. This may take a few '
          'rounds for large inboxes (200 messages per call, 5-min cooldown).',
        ),
        actions: [
          TextButton(onPressed: () => Navigator.of(ctx).pop(false), child: const Text('Cancel')),
          FilledButton(onPressed: () => Navigator.of(ctx).pop(true), child: const Text('Backfill')),
        ],
      ),
    );
    if (confirm != true) return;
    setState(() => _loading = true);
    try {
      final res = await http.post(
        Uri.parse('$_kApiBase/api/email/backfill'),
        headers: {'Authorization': 'Bearer ${session.accessToken}'},
      );
      if (res.statusCode == 429) {
        if (mounted) ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('On cooldown — try again in 5 min.')),
        );
      } else if (res.statusCode == 200) {
        final body = json.decode(res.body) as Map<String, dynamic>;
        if (mounted) ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Fetched ${body['fetched']} · filed ${body['drafted']} receipts. ${body['note']}')),
        );
      } else {
        final err = json.decode(res.body)['error'] ?? 'Backfill failed';
        throw Exception(err);
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
    } finally {
      await _load();  // also refreshes _loading
    }
  }

  void _onSearchChanged(String v) {
    _searchDebounce?.cancel();
    _searchDebounce = Timer(const Duration(milliseconds: 300), () {
      _query = v.trim();
      _load();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Row(mainAxisSize: MainAxisSize.min, children: [
          GuacMascot(mood: MascotMood.happy, size: 32),
          SizedBox(width: 8),
          Text('Inbox'),
        ]),
        actions: [
          IconButton(icon: const Icon(Icons.edit_outlined), onPressed: () {
            _openComposer(context, prefill: null);
          }, tooltip: 'Compose'),
          IconButton(icon: const Icon(Icons.refresh), onPressed: _refresh, tooltip: 'Refresh'),
          // Direct webmail link — reassures the user that nothing is being
          // hidden by GetGuac. Processed mail lives in the "Guacked" folder
          // on the mail server and is readable here any time.
          IconButton(
            icon: const Icon(Icons.open_in_new),
            tooltip: 'Open in webmail',
            onPressed: () => UpdateService.openDownload('https://webmail.getguac.app'),
          ),
          PopupMenuButton<String>(
            icon: const Icon(Icons.more_vert),
            onSelected: (v) {
              if (v == 'backfill') _backfillAll();
              if (v == 'webmail') UpdateService.openDownload('https://webmail.getguac.app');
            },
            itemBuilder: (_) => const [
              PopupMenuItem(value: 'backfill', child: ListTile(
                leading: Icon(Icons.cloud_download_outlined, size: 18),
                title: Text('Backfill all mail', style: TextStyle(fontSize: 13)),
                subtitle: Text('Download every message from the start', style: TextStyle(fontSize: 11)),
                visualDensity: VisualDensity.compact,
              )),
              PopupMenuItem(value: 'webmail', child: ListTile(
                leading: Icon(Icons.open_in_new, size: 18),
                title: Text('Open in webmail', style: TextStyle(fontSize: 13)),
                subtitle: Text('Read your full mailbox at webmail.getguac.app', style: TextStyle(fontSize: 11)),
                visualDensity: VisualDensity.compact,
              )),
            ],
          ),
        ],
      ),
      body: Column(children: [
        // Folder + filter chips row
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          color: Colors.white,
          child: SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(children: [
              for (final f in _folders)
                Padding(
                  padding: const EdgeInsets.only(right: 6),
                  child: ChoiceChip(
                    avatar: Icon(_folderIcons[f], size: 14, color: _folder == f ? Colors.white : _kBrand),
                    label: Text(f[0].toUpperCase() + f.substring(1)),
                    selected: _folder == f,
                    onSelected: (_) { _folder = f; _load(); },
                    selectedColor: _kBrand,
                    labelStyle: TextStyle(
                      fontSize: 12, fontWeight: FontWeight.w700,
                      color: _folder == f ? Colors.white : Colors.black87,
                    ),
                  ),
                ),
              const VerticalDivider(width: 12, indent: 4, endIndent: 4),
              for (final f in _filters)
                Padding(
                  padding: const EdgeInsets.only(right: 6),
                  child: ChoiceChip(
                    label: Text(_filterLabels[f] ?? f),
                    selected: _filter == f,
                    onSelected: (_) { _filter = f; _load(); },
                    selectedColor: const Color(0xFFfef3c7),
                    labelStyle: TextStyle(
                      fontSize: 11, fontWeight: FontWeight.w700,
                      color: _filter == f ? const Color(0xFFb45309) : Colors.black54,
                    ),
                  ),
                ),
            ]),
          ),
        ),
        // Search
        Padding(
          padding: const EdgeInsets.fromLTRB(12, 4, 12, 4),
          child: TextField(
            controller: _queryCtrl,
            onChanged: _onSearchChanged,
            decoration: const InputDecoration(
              hintText: 'Search sender, subject, preview…',
              prefixIcon: Icon(Icons.search, size: 18),
              isDense: true,
              contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            ),
            style: const TextStyle(fontSize: 13),
          ),
        ),
        Expanded(
          child: _loading
            ? const Center(child: CircularProgressIndicator())
            : _messages.isEmpty
              ? _emptyState()
              : RefreshIndicator(
                  onRefresh: _refresh,
                  child: ListView.separated(
                    itemCount: _messages.length,
                    separatorBuilder: (_, __) => const Divider(height: 1, indent: 12, endIndent: 12),
                    itemBuilder: (_, i) => _MessageTile(
                      m: _messages[i],
                      onTap: () async {
                        await context.push('/inbox/${_messages[i].id}');
                        _load();  // refresh state after returning
                      },
                    ),
                  ),
                ),
        ),
      ]),
    );
  }

  Widget _emptyState() {
    return ListView(children: [
      const SizedBox(height: 80),
      const Center(child: GuacMascot(mood: MascotMood.relaxing, size: 130)),
      const SizedBox(height: 16),
      Center(child: Text(
        _filter == 'unread' ? 'All caught up.'
        : _filter == 'receipts' ? 'No receipts forwarded yet.'
        : _filter == 'starred' ? 'No starred messages.'
        : _folder == 'trash' ? 'Trash is empty.'
        : _folder == 'sent' ? "You haven't sent anything yet."
        : 'Your inbox is empty.',
        style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16))),
      const SizedBox(height: 8),
      const Padding(
        padding: EdgeInsets.symmetric(horizontal: 40),
        child: Text(
          "Mail forwarded to your +g address will arrive within 10 min and get auto-filed as receipts.",
          textAlign: TextAlign.center,
          style: TextStyle(color: Colors.black54, fontSize: 12),
        ),
      ),
    ]);
  }
}

void _openComposer(BuildContext context, {Map<String, String>? prefill}) {
  showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.white,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
    ),
    builder: (ctx) => _ComposeSheet(prefill: prefill),
  );
}

class _MessageTile extends StatelessWidget {
  final _Message m;
  final VoidCallback onTap;
  const _MessageTile({required this.m, required this.onTap});

  String _trimAddr(String s) {
    final m1 = RegExp(r'^"?([^"<]+?)"?\s*<.+>$').firstMatch(s);
    if (m1 != null) return m1.group(1)!.trim();
    final m2 = RegExp(r'^([^@]+)@').firstMatch(s);
    return (m2 != null ? m2.group(1) : s)?.trim() ?? s;
  }

  String _shortDate(DateTime? d) {
    if (d == null) return '';
    final now = DateTime.now();
    if (d.year == now.year && d.month == now.month && d.day == now.day) {
      return '${d.hour.toString().padLeft(2,'0')}:${d.minute.toString().padLeft(2,'0')}';
    }
    if (d.year == now.year) {
      const m = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      return '${m[d.month-1]} ${d.day}';
    }
    return '${d.month}/${d.day}/${d.year % 100}';
  }

  @override
  Widget build(BuildContext context) {
    final unread = !m.read;
    return InkWell(
      onTap: onTap,
      child: Container(
        color: unread ? Colors.white : const Color(0xFFf9fafb),
        padding: const EdgeInsets.fromLTRB(14, 12, 12, 12),
        child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          if (m.starred) const Padding(
            padding: EdgeInsets.only(top: 2, right: 6),
            child: Icon(Icons.star, size: 14, color: Color(0xFFf59e0b)),
          ),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [
              Expanded(child: Text(
                _trimAddr(m.fromAddr),
                style: TextStyle(fontWeight: unread ? FontWeight.w900 : FontWeight.w600, fontSize: 13),
                overflow: TextOverflow.ellipsis,
              )),
              if (m.isReceiptsHook) Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                margin: const EdgeInsets.only(left: 6),
                decoration: BoxDecoration(color: _kBrandLight, borderRadius: BorderRadius.circular(99)),
                child: const Text('+g', style: TextStyle(fontSize: 9, fontWeight: FontWeight.w800, color: _kBrand)),
              ),
              if (m.processed && m.receiptId != null) Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                margin: const EdgeInsets.only(left: 4),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(colors: [Color(0xFFa3e635), Color(0xFF15803d)]),
                  borderRadius: BorderRadius.circular(99),
                ),
                child: const Row(mainAxisSize: MainAxisSize.min, children: [
                  Icon(Icons.check_circle, color: Colors.white, size: 10),
                  SizedBox(width: 3),
                  Text('Receipt', style: TextStyle(fontSize: 9, fontWeight: FontWeight.w900, color: Colors.white)),
                ]),
              ),
              const SizedBox(width: 6),
              Text(_shortDate(m.receivedAt), style: const TextStyle(fontSize: 10, color: Colors.black45)),
            ]),
            const SizedBox(height: 2),
            Text(
              m.subject.isEmpty ? '(no subject)' : m.subject,
              style: TextStyle(fontSize: 13, fontWeight: unread ? FontWeight.w800 : FontWeight.w500),
              overflow: TextOverflow.ellipsis,
            ),
            const SizedBox(height: 2),
            Text(
              m.preview,
              style: const TextStyle(fontSize: 11, color: Colors.black54),
              overflow: TextOverflow.ellipsis, maxLines: 2,
            ),
          ])),
        ]),
      ),
    );
  }
}

class _ComposeSheet extends StatefulWidget {
  final Map<String, String>? prefill;
  const _ComposeSheet({this.prefill});
  @override
  State<_ComposeSheet> createState() => _ComposeSheetState();
}

class _ComposeSheetState extends State<_ComposeSheet> {
  late final TextEditingController _to, _subject, _body;
  bool _sending = false;

  @override
  void initState() {
    super.initState();
    _to = TextEditingController(text: widget.prefill?['to'] ?? '');
    _subject = TextEditingController(text: widget.prefill?['subject'] ?? '');
    _body = TextEditingController(text: widget.prefill?['body'] ?? '');
  }

  @override
  void dispose() {
    _to.dispose(); _subject.dispose(); _body.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    final to = _to.text.trim();
    final body = _body.text.trim();
    if (to.isEmpty || body.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('To + message body required')),
      );
      return;
    }
    setState(() => _sending = true);
    try {
      final session = Supabase.instance.client.auth.currentSession;
      final res = await http.post(
        Uri.parse('$_kApiBase/api/email/send'),
        headers: {'Authorization': 'Bearer ${session?.accessToken ?? ''}', 'Content-Type': 'application/json'},
        body: json.encode({'to': to, 'subject': _subject.text.trim(), 'body': _body.text}),
      );
      if (res.statusCode == 200) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Message sent')));
          Navigator.of(context).pop();
        }
      } else {
        final err = json.decode(res.body)['error'] ?? 'Send failed';
        throw Exception(err);
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final viewInsets = MediaQuery.of(context).viewInsets;
    return Padding(
      padding: EdgeInsets.only(bottom: viewInsets.bottom),
      child: Container(
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 20),
        child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          Container(width: 40, height: 4, margin: const EdgeInsets.only(bottom: 12),
            decoration: BoxDecoration(color: Colors.black12, borderRadius: BorderRadius.circular(2))),
          Row(children: [
            Text(widget.prefill != null && (widget.prefill!['to']?.isNotEmpty ?? false) ? 'Reply' : 'New message',
              style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800)),
            const Spacer(),
            IconButton(icon: const Icon(Icons.close), onPressed: () => Navigator.of(context).pop()),
          ]),
          const SizedBox(height: 8),
          TextField(controller: _to, decoration: const InputDecoration(labelText: 'To'), keyboardType: TextInputType.emailAddress, autocorrect: false),
          const SizedBox(height: 8),
          TextField(controller: _subject, decoration: const InputDecoration(labelText: 'Subject')),
          const SizedBox(height: 8),
          TextField(
            controller: _body,
            decoration: const InputDecoration(labelText: 'Message', alignLabelWithHint: true),
            maxLines: 8, minLines: 6,
            keyboardType: TextInputType.multiline,
          ),
          const SizedBox(height: 12),
          FilledButton(
            onPressed: _sending ? null : _send,
            style: FilledButton.styleFrom(backgroundColor: _kBrand, padding: const EdgeInsets.symmetric(vertical: 14)),
            child: _sending
              ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5))
              : const Text('Send', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
          ),
          const SizedBox(height: 8),
          const Text('Sent from your GetGuac Mail · TLS',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 10, color: Colors.black38)),
        ]),
      ),
    );
  }
}

// Public so the detail screen can launch it via callback
void openInboxComposer(BuildContext context, {Map<String, String>? prefill}) => _openComposer(context, prefill: prefill);
