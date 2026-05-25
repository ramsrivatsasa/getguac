import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

// Colorful bottom nav matching the web's brand palette.
// Each tab keeps its own brand colour so the active state pops.

class _NavItem {
  final String route;
  final IconData icon;
  final String label;
  final Color color;
  final List<Color> activeGradient;
  const _NavItem(this.route, this.icon, this.label, this.color, this.activeGradient);
}

const _items = <_NavItem>[
  _NavItem('/dashboard', Icons.dashboard_rounded,    'Home',     Color(0xFF15803d), [Color(0xFFa3e635), Color(0xFF15803d)]),
  _NavItem('/receipts',  Icons.receipt_long_rounded, 'Receipts', Color(0xFF1d4ed8), [Color(0xFF60a5fa), Color(0xFF1d4ed8)]),
  _NavItem('/shopping',  Icons.shopping_cart_rounded,'Smashlist',Color(0xFFca8a04), [Color(0xFFfcd34d), Color(0xFFca8a04)]),
  _NavItem('/rewards',   Icons.card_giftcard_rounded,'Rewards',  Color(0xFFdb2777), [Color(0xFFf472b6), Color(0xFFdb2777)]),
  _NavItem('/profile',   Icons.person_rounded,       'Profile',  Color(0xFF7c3aed), [Color(0xFFa78bfa), Color(0xFF7c3aed)]),
];

class MainScaffold extends StatelessWidget {
  final Widget child;
  const MainScaffold({super.key, required this.child});

  int _selectedIndex(BuildContext context) {
    final loc = GoRouterState.of(context).matchedLocation;
    for (var i = 0; i < _items.length; i++) {
      if (loc == _items[i].route || (i != 0 && loc.startsWith(_items[i].route))) {
        return i;
      }
    }
    // Sub-routes that don't have a dedicated tab — fall back to Profile
    // (most of these are reached via the Profile menu now).
    if (loc.startsWith('/inbox')      || loc.startsWith('/guacscore')  ||
        loc.startsWith('/guacwizard') || loc.startsWith('/stash')      ||
        loc.startsWith('/steals')     || loc.startsWith('/car-miles')) {
      return 4;  // Profile (last item, index 4)
    }
    return 0;
  }

  @override
  Widget build(BuildContext context) {
    final idx = _selectedIndex(context);
    return Scaffold(
      body: child,
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.06), blurRadius: 10, offset: const Offset(0, -2))],
          border: const Border(top: BorderSide(color: Color(0xFFf1f5f9), width: 1)),
        ),
        child: SafeArea(
          top: false,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: List.generate(_items.length, (i) {
                final item = _items[i];
                final active = idx == i;
                return _NavButton(item: item, active: active, onTap: () => context.go(item.route));
              }),
            ),
          ),
        ),
      ),
    );
  }
}

class _NavButton extends StatelessWidget {
  final _NavItem item;
  final bool active;
  final VoidCallback onTap;
  const _NavButton({required this.item, required this.active, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 220),
          curve: Curves.easeOutCubic,
          padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 4),
          decoration: BoxDecoration(
            gradient: active ? LinearGradient(
              begin: Alignment.topLeft, end: Alignment.bottomRight,
              colors: item.activeGradient,
            ) : null,
            borderRadius: BorderRadius.circular(16),
            boxShadow: active ? [BoxShadow(color: item.color.withValues(alpha: 0.4), blurRadius: 8, offset: const Offset(0, 3))] : null,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(item.icon, size: 22, color: active ? Colors.white : item.color),
              const SizedBox(height: 2),
              Text(
                item.label,
                style: TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.w800,
                  color: active ? Colors.white : item.color,
                ),
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
