import 'package:flutter/material.dart';

// TODO: rewrite using supabase_flutter. Stubbed for now.
class CarMilesScreen extends StatelessWidget {
  const CarMilesScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Car Miles')),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Text('🚗', style: TextStyle(fontSize: 72)),
              const SizedBox(height: 16),
              Text('Car Miles', style: Theme.of(context).textTheme.headlineSmall),
              const SizedBox(height: 8),
              Text(
                'Mileage tracking is coming to mobile soon. For now, use it on getguac.app.',
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.bodyMedium,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
