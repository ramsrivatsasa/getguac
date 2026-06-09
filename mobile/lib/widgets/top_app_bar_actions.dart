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
import '../providers/auth_provider.dart';

/// Returns the standard top-right action buttons every authenticated
/// screen should carry. Order (left → right):
///   1. Notifications  — currently a no-op tap that opens a "coming
///      soon" snack; placeholder until the notifications table + push
///      pipeline lands.
///   2. Chat           — context.go('/chat')
///   3. Sign Out       — confirmation dialog → logout → /login
List<Widget> topAppBarActions(BuildContext context, {bool whiteIcons = true}) {
  final iconColor = whiteIcons ? Colors.white : null;
  return [
    IconButton(
      icon: Icon(Icons.notifications_none_rounded, color: iconColor),
      tooltip: 'Notifications',
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
    IconButton(
      icon: Icon(Icons.chat_bubble_outline, color: iconColor),
      tooltip: 'Chat',
      onPressed: () => context.go('/chat'),
    ),
    // Slim labelled pill — same compact, low-chrome feel as the
    // "Install" button in the update banner.
    Padding(
      padding: const EdgeInsets.only(right: 6, left: 2),
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
