// Single DM thread.
//
// WhatsApp-style left/right message bubbles, auto-scroll on new messages,
// optimistic append on send + realtime fan-in via Supabase Realtime.
// All data through DmsService — RLS handles authorization.

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../services/dms_service.dart';
import '../../services/display_names_service.dart';

const _kBrand = Color(0xFF15803d);

class ChatThreadScreen extends StatefulWidget {
  final String threadId;
  const ChatThreadScreen({super.key, required this.threadId});
  @override
  State<ChatThreadScreen> createState() => _ChatThreadScreenState();
}

class _ChatThreadScreenState extends State<ChatThreadScreen> {
  final _draftCtrl = TextEditingController();
  final _scrollCtrl = ScrollController();
  List<DmMessage> _messages = const [];
  bool _loading = true;
  bool _sending = false;
  String? _meId;
  String _peerName = 'Chat';
  RealtimeChannel? _channel;

  @override
  void initState() {
    super.initState();
    _meId = Supabase.instance.client.auth.currentUser?.id;
    _load();
    _subscribe();
  }

  @override
  void dispose() {
    _draftCtrl.dispose();
    _scrollCtrl.dispose();
    if (_channel != null) {
      Supabase.instance.client.removeChannel(_channel!);
    }
    super.dispose();
  }

  Future<void> _load() async {
    try {
      final msgs = await DmsService.listMessages(widget.threadId);
      // Figure out peer id + name from messages or by re-listing threads.
      final me = _meId;
      String? peerId;
      for (final m in msgs) {
        if (m.userId != me) { peerId = m.userId; break; }
      }
      if (peerId == null) {
        // Empty thread — fall back to thread list lookup.
        final threads = await DmsService.listMyThreads();
        peerId = threads.firstWhere(
          (t) => t.id == widget.threadId,
          orElse: () => DmThread(id: widget.threadId, peerId: '', lastMessageAt: DateTime.now(), createdAt: DateTime.now()),
        ).peerId;
      }
      String name = 'Chat';
      if (peerId.isNotEmpty) {
        final names = await DisplayNamesService.getDisplayNames([peerId]);
        name = DisplayNamesService.formatName(names[peerId], peerId);
      }
      if (!mounted) return;
      setState(() {
        _messages = msgs;
        _peerName = name;
        _loading = false;
      });
      _scrollToBottom();
    } catch (e) {
      if (!mounted) return;
      setState(() => _loading = false);
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Load failed: $e')));
    }
  }

  void _subscribe() {
    // One channel per thread; INSERTs to dm_messages with this thread_id
    // get appended live. RLS already filters server-side.
    final ch = Supabase.instance.client.channel('dm-thread:${widget.threadId}')
      ..onPostgresChanges(
        event: PostgresChangeEvent.insert,
        schema: 'public',
        table: 'dm_messages',
        filter: PostgresChangeFilter(
          type: PostgresChangeFilterType.eq,
          column: 'thread_id',
          value: widget.threadId,
        ),
        callback: (payload) {
          final row = payload.newRecord;
          final msg = DmMessage.fromRow(row);
          // Skip if already present (we appended optimistically on send).
          if (_messages.any((m) => m.id == msg.id)) return;
          if (!mounted) return;
          setState(() => _messages = [..._messages, msg]);
          _scrollToBottom();
        },
      )
      ..subscribe();
    _channel = ch;
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!_scrollCtrl.hasClients) return;
      _scrollCtrl.animateTo(
        _scrollCtrl.position.maxScrollExtent,
        duration: const Duration(milliseconds: 200),
        curve: Curves.easeOut,
      );
    });
  }

  Future<void> _send() async {
    final body = _draftCtrl.text.trim();
    if (body.isEmpty) return;
    setState(() => _sending = true);
    _draftCtrl.clear();
    try {
      final msg = await DmsService.postMessage(widget.threadId, body);
      if (!mounted) return;
      setState(() => _messages = [..._messages, msg]);
      _scrollToBottom();
    } catch (e) {
      if (mounted) {
        _draftCtrl.text = body;
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Send failed: $e')));
      }
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  String _formatTime(DateTime d) {
    return '${d.hour.toString().padLeft(2, '0')}:${d.minute.toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.go('/chat'),
        ),
        title: Text(_peerName, style: const TextStyle(fontWeight: FontWeight.w900, color: _kBrand)),
        backgroundColor: Colors.white,
        elevation: 0.5,
      ),
      backgroundColor: const Color(0xFFf8fafc),
      body: Column(children: [
        Expanded(
          child: _loading
              ? const Center(child: CircularProgressIndicator(color: _kBrand))
              : _messages.isEmpty
                  ? const Center(
                      child: Text('No messages yet — say hi.',
                        style: TextStyle(color: Colors.black45, fontSize: 13)),
                    )
                  : ListView.builder(
                      controller: _scrollCtrl,
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 12),
                      itemCount: _messages.length,
                      itemBuilder: (_, i) {
                        final m = _messages[i];
                        final mine = m.userId == _meId;
                        return Align(
                          alignment: mine ? Alignment.centerRight : Alignment.centerLeft,
                          child: Container(
                            constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.75),
                            margin: const EdgeInsets.symmetric(vertical: 2),
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                            decoration: BoxDecoration(
                              color: mine ? _kBrand : Colors.white,
                              borderRadius: BorderRadius.only(
                                topLeft: const Radius.circular(14),
                                topRight: const Radius.circular(14),
                                bottomLeft: Radius.circular(mine ? 14 : 4),
                                bottomRight: Radius.circular(mine ? 4 : 14),
                              ),
                              border: mine ? null : Border.all(color: const Color(0xFFe5e7eb)),
                            ),
                            child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [
                              Text(m.body,
                                style: TextStyle(color: mine ? Colors.white : Colors.black87, fontSize: 14, height: 1.3)),
                              const SizedBox(height: 2),
                              Text(_formatTime(m.createdAt),
                                style: TextStyle(
                                  fontSize: 9,
                                  color: mine ? Colors.white70 : Colors.black38,
                                )),
                            ]),
                          ),
                        );
                      },
                    ),
        ),
        Container(
          decoration: const BoxDecoration(
            color: Colors.white,
            border: Border(top: BorderSide(color: Color(0xFFe5e7eb))),
          ),
          padding: const EdgeInsets.fromLTRB(10, 6, 10, 6),
          child: SafeArea(
            top: false,
            child: Row(children: [
              Expanded(child: TextField(
                controller: _draftCtrl,
                minLines: 1,
                maxLines: 4,
                maxLength: 2000,
                decoration: const InputDecoration(
                  hintText: 'Type a message…',
                  counterText: '',
                  border: OutlineInputBorder(),
                  isDense: true,
                  contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                ),
              )),
              const SizedBox(width: 8),
              FilledButton(
                onPressed: _sending ? null : _send,
                style: FilledButton.styleFrom(
                  backgroundColor: _kBrand,
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                ),
                child: _sending
                    ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                    : const Icon(Icons.send, size: 18),
              ),
            ]),
          ),
        ),
      ]),
    );
  }
}
