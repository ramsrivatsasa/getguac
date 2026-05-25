import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'guac_mascot.dart';

// Colorful bottom nav matching the web's brand palette.
// Each tab keeps its own brand colour so the active state pops.
//
// Profile tab supports long-press: pops a quick-access menu with Inbox,
// GuacScore, GuacWizard, Stash, Steals, Car Miles, Security.
// Regular tap on Profile still goes to /profile.

class _NavItem {
  final String route;
  final IconData icon;
  final String label;
  final Color color;
  final List<Color> activeGradient;
  const _NavItem(this.route, this.icon, this.label, this.color, this.activeGradient);
}

const _items = <_NavItem>[
  _NavItem('/dashboard', Icons.dashboard_rounded,         'Home',     Color(0xFF15803d), [Color(0xFFa3e635), Color(0xFF15803d)]),
  _NavItem('/receipts',  Icons.receipt_long_rounded,      'Receipts', Color(0xFF1d4ed8), [Color(0xFF60a5fa), Color(0xFF1d4ed8)]),
  _NavItem('/shopping',  Icons.shopping_cart_rounded,     'Smashlist',Color(0xFFca8a04), [Color(0xFFfcd34d), Color(0xFFca8a04)]),
  _NavItem('/car-miles', Icons.directions_car_filled_rounded,'Miles', Color(0xFF0891b2), [Color(0xFF67e8f9), Color(0xFF0891b2)]),
  _NavItem('/profile',   Icons.person_rounded,            'Profile',  Color(0xFF7c3aed), [Color(0xFFa78bfa), Color(0xFF7c3aed)]),
];

class _QuickAction {
  final String route;
  final IconData icon;
  final String label;
  final String sub;
  final Color color;
  final Color bg;
  const _QuickAction(this.route, this.icon, this.label, this.sub, this.color, this.bg);
}

// Items shown in the long-press popover. Order matches the user's mental
// model: communication first, then their finance brain, then the rest.
const _quickActions = <_QuickAction>[
  _QuickAction('/inbox',      Icons.mark_email_unread_rounded, 'Inbox',        'Mail + auto-receipts',  Color(0xFFca8a04), Color(0xFFfef3c7)),
  _QuickAction('/guacscore',  Icons.auto_awesome,              'GuacScore',    '0–100 spending grade',  Color(0xFF15803d), Color(0xFFd1fae5)),
  _QuickAction('/guacwizard', Icons.auto_fix_high,             'GuacWizard',   'Bank Bite + insights',  Color(0xFF7c3aed), Color(0xFFede9fe)),
  _QuickAction('/rewards',    Icons.card_giftcard_rounded,     'Rewards',      'Loyalty + expiring',    Color(0xFFdb2777), Color(0xFFfce7f3)),
  _QuickAction('/stash',      Icons.inventory_2,               'Stash',        'Everything you own',    Color(0xFFca8a04), Color(0xFFfef3c7)),
  _QuickAction('/steals',     Icons.local_offer,               'Steals',       'AI price hunt',         Color(0xFFdb2777), Color(0xFFfce7f3)),
  _QuickAction('/profile',    Icons.person,                    'Profile',      'Account + settings',    Color(0xFF7c3aed), Color(0xFFede9fe)),
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
    if (loc.startsWith('/inbox')      || loc.startsWith('/guacscore')  ||
        loc.startsWith('/guacwizard') || loc.startsWith('/stash')      ||
        loc.startsWith('/steals')     || loc.startsWith('/rewards')) {
      return 4;  // Profile (these are reached via the Profile long-press menu)
    }
    return 0;
  }

  void _showProfileMenu(BuildContext context) {
    HapticFeedback.mediumImpact();
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      barrierColor: Colors.black.withValues(alpha: 0.4),
      builder: (sheetCtx) {
        return _ProfileQuickMenu(onPick: (route) {
          Navigator.of(sheetCtx).pop();
          context.go(route);
        });
      },
    );
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
                final isProfile = item.route == '/profile';
                return _NavButton(
                  item: item,
                  active: active,
                  onTap: () => context.go(item.route),
                  onLongPress: isProfile ? () => _showProfileMenu(context) : null,
                  showLongPressHint: isProfile,
                );
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
  final VoidCallback? onLongPress;
  final bool showLongPressHint;
  const _NavButton({
    required this.item, required this.active, required this.onTap,
    this.onLongPress, this.showLongPressHint = false,
  });

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: InkWell(
        onTap: onTap,
        onLongPress: onLongPress,
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
          child: Stack(clipBehavior: Clip.none, alignment: Alignment.center, children: [
            Column(
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
            // Tiny indicator that this tab supports long-press for more options.
            if (showLongPressHint)
              Positioned(
                top: -2, right: 4,
                child: Container(
                  width: 6, height: 6,
                  decoration: BoxDecoration(
                    color: active ? Colors.white : item.color,
                    shape: BoxShape.circle,
                    border: Border.all(color: active ? Colors.white : Colors.transparent, width: 1),
                  ),
                ),
              ),
          ]),
        ),
      ),
    );
  }
}

class _ProfileQuickMenu extends StatelessWidget {
  final void Function(String route) onPick;
  const _ProfileQuickMenu({required this.onPick});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            // Drag handle
            Container(
              width: 38, height: 4, margin: const EdgeInsets.only(bottom: 8),
              decoration: BoxDecoration(color: Colors.black12, borderRadius: BorderRadius.circular(2)),
            ),
            Row(children: [
              const GuacMascot(size: 28),
              const SizedBox(width: 8),
              const Expanded(child: Text('Quick access',
                style: TextStyle(fontSize: 14, fontWeight: FontWeight.w900, color: Color(0xFF064e3b)))),
              IconButton(
                icon: const Icon(Icons.close, size: 20),
                onPressed: () => Navigator.of(context).pop(),
                visualDensity: VisualDensity.compact,
              ),
            ]),
            const SizedBox(height: 4),
            // 2-column grid of action tiles
            GridView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: _quickActions.length,
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 2,
                mainAxisSpacing: 8,
                crossAxisSpacing: 8,
                childAspectRatio: 2.4,
              ),
              itemBuilder: (_, i) {
                final a = _quickActions[i];
                return InkWell(
                  onTap: () => onPick(a.route),
                  borderRadius: BorderRadius.circular(14),
                  child: Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: a.bg,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: a.color.withValues(alpha: 0.18)),
                    ),
                    child: Row(children: [
                      Container(
                        width: 32, height: 32,
                        decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.8), borderRadius: BorderRadius.circular(10)),
                        child: Icon(a.icon, color: a.color, size: 18),
                      ),
                      const SizedBox(width: 8),
                      Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [
                        Text(a.label, style: TextStyle(fontSize: 13, fontWeight: FontWeight.w900, color: a.color), maxLines: 1, overflow: TextOverflow.ellipsis),
                        Text(a.sub, style: const TextStyle(fontSize: 10, color: Colors.black54), maxLines: 1, overflow: TextOverflow.ellipsis),
                      ])),
                    ]),
                  ),
                );
              },
            ),
            const SizedBox(height: 8),
            Text(
              'Tip — long-press the Profile tab any time to open this menu.',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 10, color: Colors.black.withValues(alpha: 0.45)),
            ),
            const SizedBox(height: 4),
          ]),
        ),
      ),
    );
  }
}
