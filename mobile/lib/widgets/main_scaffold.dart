import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'guac_mascot.dart';
import 'top_app_bar_actions.dart';
import 'guac_ad_banner.dart';
import '../services/update_service.dart';

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

// Four tabs flanking a raised centre camera (Add Receipt). Miles lives in the
// quick-launch strip now, so it's dropped from the tab row to make room.
// Visual order is Home · Receipts · [📷] · Smashlist · Menu.
const _items = <_NavItem>[
  _NavItem('/dashboard', Icons.dashboard_rounded,         'Home',     Color(0xFF15803d), [Color(0xFFa3e635), Color(0xFF15803d)]),
  _NavItem('/receipts',  Icons.receipt_long_rounded,      'Receipts', Color(0xFF1d4ed8), [Color(0xFF60a5fa), Color(0xFF1d4ed8)]),
  _NavItem('/shopping',  Icons.shopping_cart_rounded,     'Smashlist',Color(0xFFca8a04), [Color(0xFFfcd34d), Color(0xFFca8a04)]),
  _NavItem('/profile',   Icons.menu_rounded,              'Menu',     Color(0xFF7c3aed), [Color(0xFFa78bfa), Color(0xFF7c3aed)]),
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

// Items shown in the quick-access grid (tap Menu). Ordered by importance to
// the business + the user: rewards/growth first, then deals + finance brain,
// then the rest.
const _quickActions = <_QuickAction>[
  _QuickAction('/guacmoney',   Icons.savings_rounded,            'GuacMoney',    'Points → rewards',         Color(0xFFca8a04), Color(0xFFfef9c3)),
  _QuickAction('/invite',      Icons.person_add_alt_1,           'Refer a friend','Invite, both earn',       Color(0xFF15803d), Color(0xFFd1fae5)),
  _QuickAction('/steals',     Icons.local_offer,               'Steals',       'AI price hunt',         Color(0xFFdb2777), Color(0xFFfce7f3)),
  _QuickAction('/rewards',    Icons.card_giftcard_rounded,     'Rewards',      'Loyalty + expiring',    Color(0xFFdb2777), Color(0xFFfce7f3)),
  _QuickAction('/guacscore',  Icons.auto_awesome,              'GuacScore',    '0–100 spending grade',  Color(0xFF15803d), Color(0xFFd1fae5)),
  _QuickAction('/guacwizard', Icons.auto_fix_high,             'GuacWizard',   'Bank Bite + insights',  Color(0xFF7c3aed), Color(0xFFede9fe)),
  _QuickAction('/stash',      Icons.inventory_2,               'Stash',        'Everything you own',    Color(0xFFca8a04), Color(0xFFfef3c7)),
  _QuickAction('/inbox',       Icons.mark_email_unread_rounded,  'Inbox',        'Mail + auto-receipts',     Color(0xFFca8a04), Color(0xFFfef3c7)),
  _QuickAction('/connections', Icons.link_rounded,               'Connections',  '37 retailers · auto-pull', Color(0xFF15803d), Color(0xFFd1fae5)),
  _QuickAction('/reports',    Icons.bar_chart_rounded,         'Reports',      'Monthly totals',        Color(0xFF15803d), Color(0xFFd1fae5)),
  _QuickAction('/stores',     Icons.storefront_rounded,        'Stores',       'Spend by store',        Color(0xFF1d4ed8), Color(0xFFdbeafe)),
  _QuickAction('/returns',    Icons.undo_rounded,              'Returns',      'Open refund windows',   Color(0xFFb91c1c), Color(0xFFfee2e2)),
  _QuickAction('/car-miles',  Icons.directions_car_filled_rounded, 'Car Miles', 'Trip log',            Color(0xFF0891b2), Color(0xFFcffafe)),
  _QuickAction('/chat',        Icons.chat_bubble_outline,        'Chat',         'Family + friends',         Color(0xFF15803d), Color(0xFFd1fae5)),
  _QuickAction('/profile',    Icons.person,                    'Profile',      'Account + settings',    Color(0xFF7c3aed), Color(0xFFede9fe)),
];

class MainScaffold extends StatefulWidget {
  final Widget child;
  const MainScaffold({super.key, required this.child});

  @override
  State<MainScaffold> createState() => _MainScaffoldState();
}

class _MainScaffoldState extends State<MainScaffold> with WidgetsBindingObserver {
  AvailableUpdate? _available;
  DateTime? _lastChecked;
  bool _dismissedThisSession = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    // Defer the first check by ~2s so the initial frame paints before
    // a network call. The login screen also checks, but signed-in
    // returning users skip /login entirely on cold start, so this is
    // the only reliable place to catch them.
    Future.delayed(const Duration(seconds: 2), _checkForUpdate);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    super.didChangeAppLifecycleState(state);
    // Re-check on app foreground, but at most once per 4 hours so we
    // don't hammer the GitHub API on every screen-on.
    if (state == AppLifecycleState.resumed) {
      final last = _lastChecked;
      if (last == null || DateTime.now().difference(last) > const Duration(hours: 4)) {
        _checkForUpdate();
      }
    }
  }

  Future<void> _checkForUpdate() async {
    _lastChecked = DateTime.now();
    final upd = await UpdateService.checkForUpdate();
    if (!mounted || upd == null) return;
    setState(() => _available = upd);
  }

  Future<void> _runUpdate() async {
    final upd = _available;
    if (upd == null) return;
    // Show a tiny progress dialog while the APK downloads (~20MB).
    showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (_) => const AlertDialog(
        content: Row(mainAxisSize: MainAxisSize.min, children: [
          SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2)),
          SizedBox(width: 14),
          Flexible(child: Text('Downloading update…')),
        ]),
      ),
    );
    final ok = await UpdateService.downloadAndInstall(upd.downloadUrl);
    if (!mounted) return;
    Navigator.of(context, rootNavigator: true).pop();  // dismiss spinner
    if (!ok) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
        content: Text("Couldn't auto-download. Opening browser instead — install via the notification."),
        duration: Duration(seconds: 4),
      ));
      await UpdateService.openDownload(upd.downloadUrl);
    }
  }

  Widget? _updateBanner() {
    final upd = _available;
    if (upd == null || _dismissedThisSession) return null;
    return Material(
      color: const Color(0xFFf0fdf4),
      child: SafeArea(
        bottom: false,
        child: InkWell(
          onTap: _runUpdate,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(12, 8, 8, 8),
            child: Row(children: [
              const Icon(Icons.system_update, size: 18, color: Color(0xFF15803d)),
              const SizedBox(width: 8),
              Expanded(
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [
                  Text('Update available — ${upd.tag}',
                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: Color(0xFF064e3b))),
                  const Text('Tap to install',
                    style: TextStyle(fontSize: 10, color: Color(0xFF065f46))),
                ]),
              ),
              TextButton(
                onPressed: _runUpdate,
                style: TextButton.styleFrom(
                  foregroundColor: const Color(0xFF15803d),
                  visualDensity: VisualDensity.compact,
                  padding: const EdgeInsets.symmetric(horizontal: 8),
                ),
                child: const Text('Install', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 12)),
              ),
              IconButton(
                icon: const Icon(Icons.close, size: 16, color: Colors.black54),
                tooltip: 'Dismiss',
                visualDensity: VisualDensity.compact,
                onPressed: () => setState(() => _dismissedThisSession = true),
              ),
            ]),
          ),
        ),
      ),
    );
  }

  int _selectedIndex(BuildContext context) {
    final loc = GoRouterState.of(context).matchedLocation;
    for (var i = 0; i < _items.length; i++) {
      if (loc == _items[i].route || (i != 0 && loc.startsWith(_items[i].route))) {
        return i;
      }
    }
    if (loc.startsWith('/inbox')      || loc.startsWith('/guacscore')  ||
        loc.startsWith('/guacwizard') || loc.startsWith('/stash')      ||
        loc.startsWith('/steals')     || loc.startsWith('/rewards')    ||
        loc.startsWith('/connections')|| loc.startsWith('/reports')    ||
        loc.startsWith('/returns')    || loc.startsWith('/stores')     ||
        loc.startsWith('/car-miles')) {
      return _items.length - 1;  // Menu (reached via the strip / Profile menu)
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
        return _ProfileQuickMenu(
          onPick: (route) {
            Navigator.of(sheetCtx).pop();
            context.go(route);
          },
          onSignOut: () {
            Navigator.of(sheetCtx).pop();
            confirmAndSignOut(context);
          },
        );
      },
    );
  }

  // Horizontal-swipe navigation between top-level tabs.
  //
  // Per UX request: swipe LEFT = previous tab, swipe RIGHT = next tab.
  // (This is the opposite of the iOS Stories/Instagram convention, where
  // swipe-left advances; we follow the user's stated preference.)
  //
  // Only fires on top-level routes (one of `_items`) so that swiping on
  // a detail page like /receipts/abc-123 doesn't surprise-jump away.
  // Velocity threshold of 300 px/s keeps tiny incidental drags from
  // triggering nav.
  void _handleHorizontalSwipe(BuildContext context, int idx, DragEndDetails details) {
    final loc = GoRouterState.of(context).matchedLocation;
    final onTopLevel = _items.any((it) => loc == it.route);
    final v = details.primaryVelocity ?? 0;
    if (v.abs() < 300) return;
    if (!onTopLevel) {
      // On a pushed screen (detail, feature, GuacMoney, …) a horizontal
      // swipe goes BACK — consistent back gesture everywhere.
      final nav = Navigator.of(context);
      if (nav.canPop()) nav.pop();
      return;
    }
    if (v > 0) {
      // Right swipe → next tab
      if (idx < _items.length - 1) context.go(_items[idx + 1].route);
    } else {
      // Left swipe → previous tab
      if (idx > 0) context.go(_items[idx - 1].route);
    }
  }

  Widget _navBtn(BuildContext context, int i, int idx) {
    final item = _items[i];
    final isProfile = item.route == '/profile';
    return _NavButton(
      item: item,
      active: idx == i,
      // Tapping Menu opens the full grid of feature shortcuts (Steals,
      // Rewards, Stash, Inbox, GuacScore, …). Long-press still works too.
      onTap: isProfile ? () => _showProfileMenu(context) : () => context.go(item.route),
      onLongPress: isProfile ? () => _showProfileMenu(context) : null,
      showLongPressHint: isProfile,
    );
  }

  // Raised centre camera — the primary "Add Receipt" action, Fetch-style.
  // Always elevated; opens the photo/gallery/voice capture menu.
  Widget _cameraButton(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 4),
      child: GestureDetector(
        onTap: () => context.go('/receipts?add=${DateTime.now().millisecondsSinceEpoch}'),
        behavior: HitTestBehavior.opaque,
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          SizedBox(
            height: 34,
            child: Center(
              child: Container(
                width: 36, height: 36,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: const LinearGradient(
                    begin: Alignment.topLeft, end: Alignment.bottomRight,
                    colors: [Color(0xFFfbbf24), Color(0xFFf59e0b)],
                  ),
                  boxShadow: [BoxShadow(color: const Color(0xFFf59e0b).withValues(alpha: 0.4), blurRadius: 6, offset: const Offset(0, 2))],
                ),
                child: const Icon(Icons.photo_camera_rounded, color: Colors.white, size: 20),
              ),
            ),
          ),
          const SizedBox(height: 2),
          const Text('Add Receipts', style: TextStyle(fontSize: 9, fontWeight: FontWeight.w800, color: Color(0xFFd97706)), maxLines: 1, overflow: TextOverflow.ellipsis),
        ]),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final idx = _selectedIndex(context);
    final banner = _updateBanner();
    return Scaffold(
      body: Column(children: [
        if (banner != null) banner,
        Expanded(
          child: GestureDetector(
            behavior: HitTestBehavior.translucent,
            onHorizontalDragEnd: (d) => _handleHorizontalSwipe(context, idx, d),
            // Cross-fade between routes when the user navigates via
            // context.go (which replaces rather than pushes — Cupertino
            // slide doesn't fire on replace). The keyed AnimatedSwitcher
            // detects the route change and runs a 220ms fade-through so
            // tab + sidebar nav doesn't feel "instant teleport."
            child: AnimatedSwitcher(
              duration: const Duration(milliseconds: 220),
              switchInCurve: Curves.easeOutCubic,
              switchOutCurve: Curves.easeIn,
              transitionBuilder: (child, anim) => FadeTransition(
                opacity: anim,
                child: SlideTransition(
                  position: Tween<Offset>(begin: const Offset(0, 0.015), end: Offset.zero).animate(anim),
                  child: child,
                ),
              ),
              child: KeyedSubtree(
                key: ValueKey(GoRouterState.of(context).matchedLocation),
                child: widget.child,
              ),
            ),
          ),
        ),
        // Native AdMob banner above the bottom nav. Tier-2: renders nothing
        // for premium subscribers (and zero-height until an ad loads).
        const GuacAdBanner(),
      ]),
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.06), blurRadius: 10, offset: const Offset(0, -2))],
          border: const Border(top: BorderSide(color: Color(0xFFf1f5f9), width: 1)),
        ),
        child: SafeArea(
          top: false,
          child: Padding(
            padding: const EdgeInsets.only(left: 8, right: 8, top: 3, bottom: 6),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.end,
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _navBtn(context, 0, idx),   // Home
                _navBtn(context, 1, idx),   // Receipts
                _cameraButton(context),     // raised centre camera = Add Receipt
                _navBtn(context, 2, idx),   // Smashlist
                _navBtn(context, 3, idx),   // Menu
              ],
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
        borderRadius: BorderRadius.circular(18),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 2),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Flat tab in a fixed-height icon row so every label lands on the
              // same baseline as the camera's, with no empty band above.
              SizedBox(
                height: 34,
                child: Center(
                  child: Stack(clipBehavior: Clip.none, alignment: Alignment.center, children: [
                    Icon(item.icon, size: 23, color: active ? item.color : Colors.black45),
                    if (showLongPressHint)
                      Positioned(
                        top: -2, right: -6,
                        child: Container(
                          width: 6, height: 6,
                          decoration: BoxDecoration(color: active ? item.color : Colors.black45, shape: BoxShape.circle),
                        ),
                      ),
                  ]),
                ),
              ),
              const SizedBox(height: 2),
              Text(
                item.label,
                style: TextStyle(
                  fontSize: 10,
                  fontWeight: active ? FontWeight.w800 : FontWeight.w600,
                  color: active ? item.color : Colors.black45,
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

class _ProfileQuickMenu extends StatelessWidget {
  final void Function(String route) onPick;
  final VoidCallback onSignOut;
  const _ProfileQuickMenu({required this.onPick, required this.onSignOut});

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
            const SizedBox(height: 10),
            // Sign Out — always here in the Menu, the natural place to find it.
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: onSignOut,
                icon: const Icon(Icons.logout_rounded, size: 18, color: Color(0xFFb91c1c)),
                label: const Text('Sign out',
                  style: TextStyle(fontWeight: FontWeight.w800, color: Color(0xFFb91c1c))),
                style: OutlinedButton.styleFrom(
                  side: const BorderSide(color: Color(0xFFfecaca)),
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                ),
              ),
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
