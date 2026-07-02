// Shared app-bar actions row — Notifications, Chat, Sign Out.
// Drop into any Scaffold's appBar with:
//   appBar: AppBar(actions: topAppBarActions(context))
//
// Keeping all three buttons here means a single edit propagates to every
// screen — no per-screen drift, no missed-screen frustrations from
// users who expected to find Sign Out from anywhere.

import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:http/http.dart' as http;
import 'package:provider/provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../providers/auth_provider.dart';
import '../theme/gg_design.dart';

/// Shared native app bar — the 🥑 logo (matching the website) + a Bricolage
/// title + the standard action row (Steals · More · Sign out) in DARK ink on
/// the clean white bar. Use on every native screen so the chrome is identical:
///   appBar: ggAppBar(context, 'Receipts')
/// `extraActions` prepends screen-specific buttons before the shared row;
/// `leading` supplies a back/close button (logo auto-hidden then).
PreferredSizeWidget ggAppBar(
  BuildContext context,
  String title, {
  List<Widget> extraActions = const [],
  bool showLogo = true,
  Widget? leading,
}) {
  final logo = showLogo && leading == null;
  return AppBar(
    backgroundColor: Colors.white,
    surfaceTintColor: Colors.transparent,
    foregroundColor: ggInk,
    iconTheme: const IconThemeData(color: ggInk),
    elevation: 0,
    leading: leading,
    titleSpacing: leading == null ? 16 : 0,
    title: Row(mainAxisSize: MainAxisSize.min, children: [
      if (logo)
        const Padding(
          padding: EdgeInsets.only(right: 8),
          child: Text('🥑', style: TextStyle(fontSize: 22)),
        ),
      Flexible(
        child: Text(title,
          overflow: TextOverflow.ellipsis,
          style: ggHeading(size: 20, weight: FontWeight.w800, color: ggInk)),
      ),
    ]),
    // whiteIcons:false → icons inherit the dark foreground so they're visible
    // on the light bar (white icons were invisible on the redesigned bars).
    actions: [...extraActions, ...topAppBarActions(context, whiteIcons: false)],
  );
}

/// Single Sign-Out icon button for the top-right of any screen that doesn't
/// want the full action row — confirms, then signs out. Used so EVERY screen
/// (native + WebView) carries Sign Out in the same top-right spot.
///
/// The iconColour is left null so it INHERITS the host AppBar's foreground —
/// white on the green WebView/brand bars, dark on white native bars — and is
/// therefore always visible without per-screen tuning. `whiteIcons` is kept
/// only for call-site compatibility; pass `color` to force a specific colour.
Widget signOutAction(BuildContext context, {bool whiteIcons = true, Color? color}) {
  // Two always-visible top-right actions on EVERY screen: Delete my data
  // (one tap → confirm) and Sign out. The delete control is required by
  // Google Play's data-deletion policy and kept prominent per product ask.
  return Row(mainAxisSize: MainAxisSize.min, children: [
    IconButton(
      icon: Icon(Icons.delete_forever_outlined, color: color, size: 21),
      tooltip: 'Delete my data',
      visualDensity: VisualDensity.compact,
      onPressed: () => confirmAndDeleteData(context),
    ),
    IconButton(
      icon: Icon(Icons.logout_rounded, color: color, size: 21),
      tooltip: 'Sign out',
      visualDensity: VisualDensity.compact,
      onPressed: () => confirmAndSignOut(context),
    ),
  ]);
}

/// Returns the standard top-right action buttons every authenticated
/// screen should carry. Order (left → right): Notifications, Chat, Sign Out.
List<Widget> topAppBarActions(BuildContext context, {bool whiteIcons = true}) {
  final iconColor = whiteIcons ? Colors.white : null;
  return [
    // Steals — with a red badge counting unread "fresh steals".
    _StealsAction(iconColor: iconColor),
    // Secondary actions tucked behind one overflow button so the row never
    // overflows on narrow phones — which used to clip the LAST icon (Sign Out),
    // making it invisible on Receipts / Smashlist.
    PopupMenuButton<String>(
      icon: Icon(Icons.more_vert, color: iconColor, size: 21),
      tooltip: 'More',
      onSelected: (v) {
        switch (v) {
          case 'chat':
            context.go('/chat');
            break;
          case 'invite':
            context.go('/invite');
            break;
          case 'notifications':
            ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
              content: Text('Notifications — coming soon'),
              duration: Duration(seconds: 2),
            ));
            break;
        }
      },
      itemBuilder: (_) => const [
        PopupMenuItem(value: 'chat', child: ListTile(
          leading: Icon(Icons.chat_bubble_outline), title: Text('Chat'),
          contentPadding: EdgeInsets.zero, dense: true)),
        PopupMenuItem(value: 'invite', child: ListTile(
          leading: Icon(Icons.person_add_alt_1), title: Text('Refer a friend'),
          contentPadding: EdgeInsets.zero, dense: true)),
        PopupMenuItem(value: 'notifications', child: ListTile(
          leading: Icon(Icons.notifications_none_rounded), title: Text('Notifications'),
          contentPadding: EdgeInsets.zero, dense: true)),
      ],
    ),
    // Sign out — dedicated, always-visible icon (never collapsed into overflow).
    signOutAction(context, color: iconColor),
    const SizedBox(width: 4),
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
        icon: Icon(Icons.local_offer_rounded, color: widget.iconColor, size: 21),
        tooltip: 'Steals',
        visualDensity: VisualDensity.compact,
        padding: EdgeInsets.zero,
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

/// Confirm dialog → sign out → go to /login. Public so non-AppBar surfaces
/// (e.g. the Menu quick panel) can trigger the same flow.
Future<void> confirmAndSignOut(BuildContext context) async {
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

/// Permanently delete the user's account + ALL their data via
/// POST /api/account/delete (Bearer-authed from the app), then sign out.
/// Wired to the top-right "Delete my data" action on every screen.
Future<void> confirmAndDeleteData(BuildContext context) async {
  final ok = await showDialog<bool>(
    context: context,
    builder: (ctx) => AlertDialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      title: const Text('Delete your data?'),
      content: const Text(
        'This permanently deletes your GetGuac account and ALL your data — '
        'receipts, inbox, lists, GuacMoney and settings.\n\nThis cannot be undone.'),
      actions: [
        TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
        FilledButton(
          style: FilledButton.styleFrom(backgroundColor: const Color(0xFFb91c1c)),
          onPressed: () => Navigator.pop(ctx, true),
          child: const Text('Delete everything'),
        ),
      ],
    ),
  );
  if (ok != true || !context.mounted) return;

  showDialog<void>(
    context: context,
    barrierDismissible: false,
    builder: (_) => const AlertDialog(
      content: Row(mainAxisSize: MainAxisSize.min, children: [
        SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2)),
        SizedBox(width: 14),
        Flexible(child: Text('Deleting your data…')),
      ]),
    ),
  );

  String? error;
  try {
    final token = Supabase.instance.client.auth.currentSession?.accessToken;
    if (token == null) throw Exception('not signed in');
    final resp = await http.post(
      Uri.parse('https://getguac.app/api/account/delete'),
      headers: {
        'Authorization': 'Bearer $token',
        'Content-Type': 'application/json',
      },
      body: jsonEncode({'confirm_phrase': 'DELETE MY ACCOUNT'}),
    );
    if (resp.statusCode != 200) error = 'server returned ${resp.statusCode}';
  } catch (e) {
    error = '$e';
  }

  if (!context.mounted) return;
  Navigator.of(context, rootNavigator: true).pop(); // dismiss the spinner

  if (error != null) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text("Couldn't delete your data ($error). Try again.")));
    return;
  }

  // Deleted server-side → clear the local session + bounce to login.
  try { await context.read<AppAuthProvider>().logout(); } catch (_) {}
  if (!context.mounted) return;
  context.go('/login');
  ScaffoldMessenger.of(context).showSnackBar(
    const SnackBar(content: Text('Your account and all data were deleted.')));
}
