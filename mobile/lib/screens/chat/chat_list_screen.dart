// Thread list — entry point for /chat.
//
// Mirrors the web /chat page's left-column thread list and "start by
// handle" affordance. Tapping a thread navigates to /chat/<threadId>
// (the conversation screen). All data flows through DmsService and
// DisplayNamesService — no Supabase calls inline here.

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../services/dms_service.dart';
import '../../services/display_names_service.dart';

const _kBrand = Color(0xFF15803d);

class ChatListScreen extends StatefulWidget {
  const ChatListScreen({super.key});
  @override
  State<ChatListScreen> createState() => _ChatListScreenState();
}

class _ChatListScreenState extends State<ChatListScreen> {
  final _newCtrl = TextEditingController();
  bool _opening = false;
  bool _loading = true;
  List<DmThread> _threads = const [];
  Map<String, DisplayName> _names = const {};

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _newCtrl.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final threads = await DmsService.listMyThreads();
      final names = await DisplayNamesService.getDisplayNames(threads.map((t) => t.peerId));
      if (!mounted) return;
      setState(() {
        _threads = threads;
        _names = names;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _loading = false);
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Could not load chats: $e')));
    }
  }

  Future<void> _startNew() async {
    final input = _newCtrl.text.trim();
    if (input.isEmpty) return;
    setState(() => _opening = true);
    try {
      final tid = await DmsService.openThreadByHandle(input);
      _newCtrl.clear();
      if (!mounted) return;
      context.go('/chat/$tid');
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.toString().replaceFirst('Exception: ', ''))),
      );
    } finally {
      if (mounted) setState(() => _opening = false);
    }
  }

  String _formatDate(DateTime d) {
    final now = DateTime.now();
    if (d.year == now.year && d.month == now.month && d.day == now.day) {
      return '${d.hour.toString().padLeft(2, '0')}:${d.minute.toString().padLeft(2, '0')}';
    }
    return '${d.month}/${d.day}';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Row(children: [
          Icon(Icons.chat_bubble_outline, color: _kBrand, size: 20),
          SizedBox(width: 8),
          Text('Chat', style: TextStyle(fontWeight: FontWeight.w900, color: _kBrand)),
        ]),
        backgroundColor: Colors.white,
        elevation: 0.5,
      ),
      body: RefreshIndicator(
        onRefresh: _load,
        child: ListView(
          padding: const EdgeInsets.all(12),
          children: [
            // Start-by-handle form
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: const Color(0xFFa7f3d0)),
              ),
              child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                const Text('START CHAT',
                  style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, letterSpacing: 1, color: _kBrand)),
                const SizedBox(height: 6),
                Row(children: [
                  Expanded(child: TextField(
                    controller: _newCtrl,
                    autocorrect: false,
                    textCapitalization: TextCapitalization.none,
                    decoration: const InputDecoration(
                      hintText: 'handle  or  alex@getguac.app  or  alex@gmail.com',
                      hintStyle: TextStyle(fontSize: 12),
                      isDense: true,
                      contentPadding: EdgeInsets.symmetric(horizontal: 10, vertical: 10),
                      border: OutlineInputBorder(),
                    ),
                    onSubmitted: (_) => _startNew(),
                  )),
                  const SizedBox(width: 8),
                  FilledButton.icon(
                    style: FilledButton.styleFrom(backgroundColor: _kBrand),
                    onPressed: _opening ? null : _startNew,
                    icon: _opening
                        ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                        : const Icon(Icons.add, size: 16),
                    label: const Text('Open'),
                  ),
                ]),
              ]),
            ),
            const SizedBox(height: 14),

            // Threads
            const Padding(
              padding: EdgeInsets.only(left: 4, bottom: 6),
              child: Text('CONVERSATIONS',
                style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, letterSpacing: 1, color: Colors.black54)),
            ),
            if (_loading)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 24),
                child: Center(child: CircularProgressIndicator(color: _kBrand)),
              )
            else if (_threads.isEmpty)
              Container(
                padding: const EdgeInsets.symmetric(vertical: 24),
                alignment: Alignment.center,
                child: const Text(
                  'No chats yet. Use a handle or email above to start one.',
                  style: TextStyle(color: Colors.black54, fontSize: 12),
                ),
              )
            else
              ..._threads.map((t) {
                final row = _names[t.peerId];
                final name = DisplayNamesService.formatName(row, t.peerId);
                final initial = DisplayNamesService.initialFor(row, t.peerId);
                return Material(
                  color: Colors.white,
                  child: InkWell(
                    onTap: () => context.go('/chat/${t.id}'),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                      decoration: const BoxDecoration(
                        border: Border(bottom: BorderSide(color: Color(0xFFf1f5f9))),
                      ),
                      child: Row(children: [
                        CircleAvatar(
                          radius: 18,
                          backgroundColor: const Color(0xFFd1fae5),
                          child: Text(initial, style: const TextStyle(color: _kBrand, fontWeight: FontWeight.w800)),
                        ),
                        const SizedBox(width: 12),
                        Expanded(child: Text(name,
                          style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14),
                          overflow: TextOverflow.ellipsis,
                        )),
                        const SizedBox(width: 8),
                        Text(_formatDate(t.lastMessageAt),
                          style: const TextStyle(fontSize: 11, color: Colors.black45)),
                        const Icon(Icons.chevron_right, color: Colors.black26),
                      ]),
                    ),
                  ),
                );
              }),
          ],
        ),
      ),
    );
  }
}
