import 'package:flutter/material.dart';

// TODO: rewrite using supabase_flutter (was Firebase Firestore previously).
// Stubbed out for now so the app compiles and lands on the phone.
class ShoppingListScreen extends StatelessWidget {
  const ShoppingListScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Smashlist')),
      body: const _ComingSoon(
        emoji: '🛒',
        title: 'Smashlist',
        body: 'Your shopping list is coming to mobile soon. For now, use it on getguac.app.',
      ),
    );
  }
}

class _ComingSoon extends StatelessWidget {
  final String emoji;
  final String title;
  final String body;
  const _ComingSoon({required this.emoji, required this.title, required this.body});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(emoji, style: const TextStyle(fontSize: 72)),
            const SizedBox(height: 16),
            Text(title, style: Theme.of(context).textTheme.headlineSmall),
            const SizedBox(height: 8),
            Text(body, textAlign: TextAlign.center, style: Theme.of(context).textTheme.bodyMedium),
          ],
        ),
      ),
    );
  }
}
