import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

class MainScaffold extends StatelessWidget {
  final Widget child;
  const MainScaffold({super.key, required this.child});

  int _selectedIndex(BuildContext context) {
    final loc = GoRouterState.of(context).matchedLocation;
    if (loc.startsWith('/receipts')) return 1;
    if (loc.startsWith('/rewards')) return 2;
    if (loc.startsWith('/shopping')) return 3;
    if (loc.startsWith('/car-miles')) return 4;
    if (loc.startsWith('/profile')) return 5;
    return 0;
  }

  @override
  Widget build(BuildContext context) {
    final idx = _selectedIndex(context);
    return Scaffold(
      body: child,
      bottomNavigationBar: NavigationBar(
        selectedIndex: idx,
        onDestinationSelected: (i) {
          const routes = ['/dashboard', '/receipts', '/rewards', '/shopping', '/car-miles', '/profile'];
          context.go(routes[i]);
        },
        destinations: const [
          NavigationDestination(icon: Icon(Icons.dashboard), label: 'Dashboard'),
          NavigationDestination(icon: Icon(Icons.receipt_long), label: 'Receipts'),
          NavigationDestination(icon: Icon(Icons.card_giftcard), label: 'Rewards'),
          NavigationDestination(icon: Icon(Icons.shopping_cart), label: 'Shopping'),
          NavigationDestination(icon: Icon(Icons.directions_car), label: 'Car Miles'),
          NavigationDestination(icon: Icon(Icons.person), label: 'Profile'),
        ],
      ),
    );
  }
}
