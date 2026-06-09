// Shared app-bar actions row — Notifications, Chat, Sign Out.
// Drop into any Scaffold's appBar with:
//   appBar: AppBar(actions: topAppBarActions(context))
//
// Keeping all three buttons here means a single edit propagates to every
// screen — no per-screen drift, no missed-screen frustrations from
// users who expected to find Sign Out from anywhere.

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

/// Returns the standard top-right action buttons every authenticated
/// screen should carry. Order (left → right):
///   1. Notifications  — placeholder "coming soon" snack.
///   2. Chat           — context.go('/chat')
/// Sign Out moved to Menu → Profile (it was eating prime app-bar space).
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
    const SizedBox(width: 4),
  ];
}
