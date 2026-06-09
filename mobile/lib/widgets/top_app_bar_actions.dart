// Shared app-bar actions row — Notifications, Chat, Sign Out.
// Drop into any Scaffold's appBar with:
//   appBar: AppBar(actions: topAppBarActions(context))
//
// Keeping all three buttons here means a single edit propagates to every
// screen — no per-screen drift, no missed-screen frustrations from
// users who expected to find Sign Out from anywhere.

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../providers/auth_provider.dart';

/// Returns the standard top-right action buttons every authenticated
/// screen should carry. Order (left → right): Notifications, Chat, Sign Out.
List<Widget> topAppBarActions(BuildContext context, {bool whiteIcons = true}) {
  final iconColor = whiteIcons ? Colors.white : null;
  return [
    IconButton(
      icon: Icon(Icons.notifications_none_rounded, color: iconColor),
      tooltip: 'Notifications',
      visualDensity: VisualDensity.compact,
      padding: const EdgeInsets.symmetric(horizontal: 5),
      constraints: const BoxConstraints(),
      onPressed: () {
        // Placeholder until the notifications inbox is built. Surface
        // it as a snack so testers know the button is wired but the
        // backend isn't done yet.
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
          content: Text('Notifications — coming soon'),
          duration: Duration(seconds: 2),
        ));
      },
    ),
    // Steals — with a red badge counting unread "fresh steals".
    _StealsAction(iconColor: iconColor),
    IconButton(
      icon: Icon(Icons.chat_bubble_outline, color: iconColor),
      tooltip: 'Chat',
      visualDensity: VisualDensity.compact,
      padding: const EdgeInsets.symmetric(horizontal: 5),
      constraints: const BoxConstraints(),
      onPressed: () => context.go('/chat'),
    ),
    // Slim Sign out pill — compact, low-chrome like the update button.
    Padding(
      padding: const EdgeInsets.only(right: 6, left: 4),
      child: TextButton.icon(
        onPressed: () => _confirmAndSignOut(context),
        icon: Icon(Icons.logout_rounded, size: 15, color: iconColor),
        label: Text('Sign out',
          style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: iconColor)),
        style: TextButton.styleFrom(
          foregroundColor: iconColor,
          backgroundColor: whiteIcons ? Colors.white.withValues(alpha: 0.14) : null,
          visualDensity: VisualDensity.compact,
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
          minimumSize: Size.zero,
          tapTargetSize: MaterialTapTargetSize.shrinkWrap,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        ),
      ),
    ),
  ];
}

// Steals app-bar action with an unread-count badge. Reads the same feed the
// web /steals page does: seen_steals rows newer than steals_state.checked_at.
class _StealsAction extends StatefulWidget {
  final Color? iconColor;
  const _StealsAction({this.iconColor});
  @override
  State<_StealsAction> createState() => _StealsActionState();
}

class _StealsActionState extends State<_StealsAction> {
  int _unread = 0;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final sb = Supabase.instance.client;
      final user = sb.auth.currentUser;
      if (user == null) return;
      final state = await sb.from('steals_state')
          .select('checked_at').eq('user_id', user.id).maybeSingle();
      final checkedAt = (state?['checked_at'] as String?) ?? '1970-01-01';
      final rows = await sb.from('seen_steals')
          .select('deal_key').eq('user_id', user.id).gt('first_seen_at', checkedAt);
      if (mounted) setState(() => _unread = (rows as List).length);
    } catch (_) {/* table may not exist yet / offline — no badge */}
  }

  @override
  Widget build(BuildContext context) {
    return Stack(clipBehavior: Clip.none, children: [
      IconButton(
        icon: Icon(Icons.local_offer_rounded, color: widget.iconColor),
        tooltip: 'Steals',
        visualDensity: VisualDensity.compact,
        padding: const EdgeInsets.symmetric(horizontal: 5),
        constraints: const BoxConstraints(),
        onPressed: () => context.go('/steals'),
      ),
      if (_unread > 0)
        Positioned(
          right: -2, top: -3,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 3, vertical: 1),
            constraints: const BoxConstraints(minWidth: 16, minHeight: 16),
            decoration: BoxDecoration(
              color: const Color(0xFFef4444),
              borderRadius: BorderRadius.circular(9),
              border: Border.all(color: const Color(0xFF166534), width: 1.5),
            ),
            alignment: Alignment.center,
            child: Text(_unread > 9 ? '9+' : '$_unread',
              style: const TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.w900, height: 1)),
          ),
        ),
    ]);
  }
}

Future<void> _confirmAndSignOut(BuildContext context) async {
  final ok = await showDialog<bool>(
    context: context,
    builder: (ctx) => AlertDialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      title: const Text('Sign out?'),
      content: const Text("You'll be signed back in next time using your saved credentials or biometrics."),
      actions: [
        TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
        FilledButton(
          style: FilledButton.styleFrom(
            backgroundColor: const Color(0xFFb91c1c),
            visualDensity: VisualDensity.compact,
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
            minimumSize: const Size(0, 32),
            tapTargetSize: MaterialTapTargetSize.shrinkWrap,
            textStyle: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700),
          ),
          onPressed: () => Navigator.pop(ctx, true),
          child: const Text('Sign out'),
        ),
      ],
    ),
  );
  if (ok != true) return;
  if (!context.mounted) return;
  await context.read<AppAuthProvider>().logout();
  if (context.mounted) context.go('/login');
}
