// Mobile Connections screen — companion to web /connections.
// Lists retailers + their email-forwarding setup steps; users
// mark which ones they've configured. State persists to
// public.user_connections (migration 063).

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../data/retailers.dart';
import '../../data/retailer_extractors.dart';
import '../../widgets/store_logo.dart';
import '../../widgets/guac_mascot.dart';
import 'link_retailer_screen.dart' show LinkRetailerScreen;

/// Thin wrapper to keep the import name semantic-stable when this
/// file is read in isolation.
class LinkRetailerScreenRoute extends StatelessWidget {
  final String retailerId;
  const LinkRetailerScreenRoute({super.key, required this.retailerId});
  @override
  Widget build(BuildContext context) => LinkRetailerScreen(retailerId: retailerId);
}

class ConnectionsScreen extends StatefulWidget {
  const ConnectionsScreen({super.key});
  @override
  State<ConnectionsScreen> createState() => _ConnectionsScreenState();
}

class _ConnectionsScreenState extends State<ConnectionsScreen> {
  Map<String, String> _statusById = {}; // retailer_id → status
  String? _aliasEmail;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final sb = Supabase.instance.client;
    final user = sb.auth.currentUser;
    if (user == null) {
      if (mounted) setState(() => _loading = false);
      return;
    }
    try {
      final prof = await sb.from('profiles')
          .select('email_alias').eq('id', user.id).maybeSingle();
      final alias = (prof?['email_alias'] as String?);
      final rows = await sb.from('user_connections')
          .select('retailer_id, status');
      final map = <String, String>{};
      for (final r in (rows as List)) {
        map[r['retailer_id'] as String] = (r['status'] as String?) ?? 'active';
      }
      if (mounted) setState(() {
        _statusById = map;
        // Receipts auto-parse only on the `+g` subaddress — give
        // retailers that variant. The bare `you@getguac.app` keeps
        // signup mail / personal mail separate. See /how-email-works.
        _aliasEmail = alias == null ? null : '$alias+g@getguac.app';
        _loading = false;
      });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _markActive(Retailer r) async {
    final sb = Supabase.instance.client;
    final user = sb.auth.currentUser;
    if (user == null) return;
    try {
      await sb.from('user_connections').upsert({
        'user_id': user.id, 'retailer_id': r.id, 'status': 'active',
      }, onConflict: 'user_id,retailer_id');
      if (mounted) {
        setState(() => _statusById = {..._statusById, r.id: 'active'});
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('${r.name} marked active')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Could not save: $e')),
        );
      }
    }
  }

  Future<void> _dismiss(Retailer r) async {
    final sb = Supabase.instance.client;
    final user = sb.auth.currentUser;
    if (user == null) return;
    await sb.from('user_connections').upsert({
      'user_id': user.id, 'retailer_id': r.id, 'status': 'dismissed',
    }, onConflict: 'user_id,retailer_id');
    if (mounted) setState(() {
      final next = {..._statusById}..remove(r.id);
      _statusById = next;
    });
  }

  void _copyAlias() {
    if (_aliasEmail == null) return;
    Clipboard.setData(ClipboardData(text: _aliasEmail!));
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Alias copied')),
    );
  }

  @override
  Widget build(BuildContext context) {
    final activeIds = _statusById.entries
        .where((e) => e.value == 'active' || e.value == 'verified')
        .map((e) => e.key).toSet();
    final active = kRetailers.where((r) => activeIds.contains(r.id)).toList();
    final available = kRetailers.where((r) => !activeIds.contains(r.id)).toList();

    return Scaffold(
      appBar: AppBar(title: const Text('Connections')),
      body: _loading
        ? const Center(child: CircularProgressIndicator())
        : ListView(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
            children: [
              // Intro + alias card
              Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                const GuacMascot(mood: MascotMood.relaxing, size: 56),
                const SizedBox(width: 12),
                Expanded(child: Padding(
                  padding: const EdgeInsets.only(top: 6),
                  child: Text(
                    "Set up retailers to email receipts straight to GetGuac — no more snapping every one.",
                    style: TextStyle(fontSize: 13, color: Colors.black.withValues(alpha: 0.7), height: 1.4),
                  ),
                )),
              ]),
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(colors: [Color(0xFFf0fdf4), Color(0xFFecfccb)]),
                  border: Border.all(color: const Color(0xFFa7f3d0)),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Row(children: [
                  Container(
                    width: 44, height: 44, alignment: Alignment.center,
                    decoration: BoxDecoration(
                      color: const Color(0xFF15803d),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Icon(Icons.mail_outline, color: Colors.white, size: 22),
                  ),
                  const SizedBox(width: 12),
                  Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [
                    const Text('YOUR GETGUAC INBOX',
                      style: TextStyle(fontSize: 10, fontWeight: FontWeight.w900, color: Color(0xFF065f46), letterSpacing: 1.0)),
                    const SizedBox(height: 3),
                    Text(_aliasEmail ?? 'No alias yet — set one in Profile',
                      style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ])),
                  if (_aliasEmail != null)
                    IconButton(
                      icon: const Icon(Icons.copy, size: 18),
                      onPressed: _copyAlias,
                      tooltip: 'Copy alias',
                    ),
                ]),
              ),
              if (active.isNotEmpty) ...[
                const SizedBox(height: 20),
                const Text('ACTIVE',
                  style: TextStyle(fontSize: 11, fontWeight: FontWeight.w900, color: Color(0xFF64748b), letterSpacing: 1.0)),
                const SizedBox(height: 8),
                ...active.map((r) => _retailerRow(r, isActive: true)),
              ],
              const SizedBox(height: 20),
              const Text('AVAILABLE',
                style: TextStyle(fontSize: 11, fontWeight: FontWeight.w900, color: Color(0xFF64748b), letterSpacing: 1.0)),
              const SizedBox(height: 8),
              ...available.map((r) => _retailerRow(r, isActive: false)),
            ],
          ),
    );
  }

  Widget _retailerRow(Retailer r, {required bool isActive}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Material(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        child: InkWell(
          onTap: () => _openSetupSheet(r),
          borderRadius: BorderRadius.circular(16),
          child: Ink(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              border: Border.all(color: const Color(0xFFe5e7eb)),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Row(children: [
              StoreLogo(
                storeName: r.name,
                size: 42,
                fallbackEmoji: '🏪',
                emojiBg: const Color(0xFFe5e7eb),
                emojiFg: const Color(0xFF374151),
              ),
              const SizedBox(width: 12),
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [
                Text(r.name, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800)),
                const SizedBox(height: 2),
                Text(
                  r.captureOnly ? 'Camera-only — no email setup' : r.category.replaceAll('-', ' '),
                  style: const TextStyle(fontSize: 11, color: Colors.black54),
                ),
              ])),
              if (isActive)
                IconButton(
                  icon: const Icon(Icons.close, size: 18, color: Colors.black38),
                  onPressed: () => _dismiss(r),
                  tooltip: 'Dismiss',
                )
              else
                Container(
                  width: 32, height: 32,
                  decoration: const BoxDecoration(
                    color: Color(0xFF15803d), shape: BoxShape.circle,
                  ),
                  alignment: Alignment.center,
                  child: const Icon(Icons.add, color: Colors.white, size: 18),
                ),
            ]),
          ),
        ),
      ),
    );
  }

  void _openSetupSheet(Retailer r) {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (_) => DraggableScrollableSheet(
        expand: false,
        initialChildSize: 0.7,
        maxChildSize: 0.92,
        builder: (_, scrollCtrl) => _RetailerSetupSheet(
          retailer: r,
          alias: _aliasEmail,
          isActive: _statusById[r.id] == 'active' || _statusById[r.id] == 'verified',
          scrollController: scrollCtrl,
          onMarkActive: () { Navigator.of(context).pop(); _markActive(r); },
        ),
      ),
    );
  }
}

class _RetailerSetupSheet extends StatelessWidget {
  final Retailer retailer;
  final String? alias;
  final bool isActive;
  final VoidCallback onMarkActive;
  final ScrollController scrollController;
  const _RetailerSetupSheet({
    required this.retailer, required this.alias, required this.isActive,
    required this.onMarkActive, required this.scrollController,
  });

  @override
  Widget build(BuildContext context) {
    return Column(children: [
      // Drag handle
      Padding(
        padding: const EdgeInsets.symmetric(vertical: 10),
        child: Container(
          width: 40, height: 4,
          decoration: BoxDecoration(color: Colors.black26, borderRadius: BorderRadius.circular(2)),
        ),
      ),
      Padding(
        padding: const EdgeInsets.fromLTRB(18, 4, 18, 12),
        child: Row(children: [
          StoreLogo(storeName: retailer.name, size: 44, fallbackEmoji: '🏪'),
          const SizedBox(width: 12),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [
            Text(retailer.name, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w900)),
            const SizedBox(height: 2),
            Text(retailer.category.replaceAll('-', ' '),
              style: const TextStyle(fontSize: 11, color: Colors.black54)),
          ])),
        ]),
      ),
      Expanded(child: ListView(
        controller: scrollController,
        padding: const EdgeInsets.fromLTRB(18, 8, 18, 20),
        children: [
          const Text('SETUP STEPS',
            style: TextStyle(fontSize: 10, fontWeight: FontWeight.w900, color: Color(0xFF64748b), letterSpacing: 1.0)),
          const SizedBox(height: 10),
          for (var i = 0; i < retailer.setupSteps.length; i++) Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Container(
                width: 24, height: 24, alignment: Alignment.center,
                decoration: const BoxDecoration(color: Color(0xFFdcfce7), shape: BoxShape.circle),
                child: Text('${i + 1}',
                  style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w900, color: Color(0xFF065f46))),
              ),
              const SizedBox(width: 10),
              Expanded(child: Text(retailer.setupSteps[i],
                style: const TextStyle(fontSize: 13.5, height: 1.45),
              )),
            ]),
          ),
          if (alias != null && !retailer.captureOnly) ...[
            const SizedBox(height: 6),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFFfef3c7),
                border: Border.all(color: const Color(0xFFfde68a)),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                const Text('YOUR ALIAS TO USE',
                  style: TextStyle(fontSize: 10, fontWeight: FontWeight.w900, color: Color(0xFFb45309), letterSpacing: 1.0)),
                const SizedBox(height: 4),
                SelectableText(alias!,
                  style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: Color(0xFF78350f), fontFamily: 'monospace'),
                ),
              ]),
            ),
          ],
        ],
      )),
      // CTA bar pinned to the bottom. When the retailer has a
      // WebView extractor (currently only Amazon, Phase-1 PoC), we
      // surface an extra "Link account (PoC)" button above the
      // standard "I've completed setup" CTA.
      Padding(
        padding: EdgeInsets.fromLTRB(16, 4, 16, MediaQuery.of(context).viewPadding.bottom + 12),
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          if (retailerExtractors.containsKey(retailer.id)) ...[
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: () {
                  Navigator.of(context).pop();
                  // Use a small delay so the sheet animates out
                  // before the WebView screen pushes in.
                  Future.delayed(const Duration(milliseconds: 200), () {
                    if (context.mounted) {
                      Navigator.of(context).push(MaterialPageRoute(
                        builder: (_) => LinkRetailerScreenRoute(retailerId: retailer.id),
                      ));
                    }
                  });
                },
                icon: const Icon(Icons.lock_open, size: 16),
                label: const Text('Link account (PoC)'),
                style: OutlinedButton.styleFrom(
                  foregroundColor: const Color(0xFF1d4ed8),
                  side: const BorderSide(color: Color(0xFF1d4ed8), width: 1.5),
                  minimumSize: const Size.fromHeight(44),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
              ),
            ),
            const SizedBox(height: 8),
          ],
          SizedBox(
            width: double.infinity,
            child: FilledButton.icon(
              onPressed: retailer.captureOnly ? null : onMarkActive,
              icon: const Icon(Icons.check),
              label: Text(retailer.captureOnly
                ? 'Camera-only — no email setup'
                : (isActive ? "I've updated my setup" : "I've completed setup")),
              style: FilledButton.styleFrom(
                backgroundColor: const Color(0xFF15803d),
                minimumSize: const Size.fromHeight(50),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),
          ),
        ]),
      ),
    ]);
  }
}
