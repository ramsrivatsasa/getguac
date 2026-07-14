import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'providers/auth_provider.dart';
import 'services/app_lock_service.dart';
import 'screens/auth/login_screen.dart';
import 'screens/auth/register_screen.dart';
import 'screens/auth/app_lock_screen.dart';
import 'screens/dashboard/dashboard_screen.dart';
import 'screens/receipts/receipts_screen.dart';
import 'screens/receipts/receipt_detail_screen.dart';
import 'screens/items/item_detail_screen.dart';
import 'screens/rewards/reward_detail_screen.dart';
import 'screens/shopping/shopping_list_screen.dart';
import 'screens/car_miles/car_miles_screen.dart';
import 'screens/profile/profile_screen.dart';
import 'screens/profile/report_problem_screen.dart';
import 'screens/stash/stash_screen.dart';
import 'screens/guacmoney/guacmoney_screen.dart';
import 'screens/inbox/inbox_screen.dart';
import 'screens/inbox/inbox_detail_screen.dart';
import 'screens/how_it_works/how_it_works_screen.dart';
import 'screens/chat/chat_list_screen.dart';
import 'screens/chat/chat_thread_screen.dart';
import 'screens/connections/connections_screen.dart';
import 'screens/connections/link_retailer_screen.dart';
import 'screens/invite/invite_screen.dart';
import 'screens/returns/returns_screen.dart';
import 'widgets/main_scaffold.dart';
import 'widgets/web_app_screen.dart';

final appRouter = GoRouter(
  initialLocation: '/dashboard',
  redirect: (context, state) {
    final auth = context.read<AppAuthProvider>();
    final isLoggedIn = auth.currentUser != null;
    final loc = state.matchedLocation;
    final isAuthRoute = loc == '/login' || loc == '/register';
    final isLockRoute = loc == '/lock';
    if (!isLoggedIn && !isAuthRoute) return '/login';
    if (isLoggedIn && isAuthRoute) return '/dashboard';
    // Cold-start biometric gate: when biometric is enabled and we haven't
    // unlocked this process yet, all authenticated routes funnel through
    // /lock first. We carry the original target as ?to= so unlock can return.
    if (isLoggedIn && AppLockService.shouldLock && !isLockRoute) {
      return '/lock?to=${Uri.encodeQueryComponent(state.uri.toString())}';
    }
    return null;
  },
  routes: [
    GoRoute(path: '/login', builder: (_, __) => const LoginScreen()),
    GoRoute(path: '/register', builder: (_, __) => const RegisterScreen()),
    GoRoute(
      path: '/lock',
      builder: (_, state) => AppLockScreen(returnTo: state.uri.queryParameters['to']),
    ),
    ShellRoute(
      builder: (_, __, child) => MainScaffold(child: child),
      routes: [
        GoRoute(path: '/dashboard', builder: (_, __) => const DashboardScreen()),
        GoRoute(
          path: '/receipts',
          builder: (_, state) => ReceiptsScreen(
            initialStoreFilter: state.uri.queryParameters['store'],
            initialPeriod: state.uri.queryParameters['period'],
            initialDateFrom: state.uri.queryParameters['dateFrom'],
            openAdd: state.uri.queryParameters['add'] != null,
            addNonce: state.uri.queryParameters['add'],
          ),
        ),
        GoRoute(path: '/receipts/:id', builder: (_, state) => ReceiptDetailScreen(id: state.pathParameters['id']!)),
        GoRoute(path: '/items/:id', builder: (_, state) => ItemDetailScreen(id: state.pathParameters['id']!)),
        GoRoute(path: '/rewards', builder: (_, __) => const WebAppScreen(path: '/rewards', title: 'Rewards')),
        GoRoute(path: '/rewards/:id', builder: (_, state) => RewardDetailScreen(id: state.pathParameters['id']!)),
        GoRoute(path: '/shopping', builder: (_, __) => const ShoppingListScreen()),
        GoRoute(path: '/car-miles', builder: (_, __) => const CarMilesScreen()),
        GoRoute(path: '/profile', builder: (_, __) => const ProfileScreen()),
        GoRoute(path: '/connections', builder: (_, __) => const ConnectionsScreen()),
        GoRoute(path: '/invite', builder: (_, __) => const InviteScreen()),
        GoRoute(path: '/connections/link/:id', builder: (_, state) =>
          LinkRetailerScreen(retailerId: state.pathParameters['id']!)),
        GoRoute(path: '/reports',     builder: (_, __) => const WebAppScreen(path: '/reports', title: 'Reports')),
        GoRoute(path: '/validate',    builder: (_, __) => const WebAppScreen(path: '/validate', title: 'Worth It?')),
        GoRoute(path: '/returns',     builder: (_, __) => const ReturnsScreen()),
        GoRoute(path: '/stores',      builder: (_, __) => const WebAppScreen(path: '/stores', title: 'Stores')),
        GoRoute(path: '/report-problem', builder: (_, state) {
          // Batch failure dialog and other callers can push() with
          // extra: {subject, description, context} to pre-fill.
          final extra = state.extra is Map<String, dynamic>
              ? state.extra as Map<String, dynamic>
              : const <String, dynamic>{};
          return ReportProblemScreen(
            prefillSubject: extra['subject'] as String?,
            prefillDescription: extra['description'] as String?,
            context: extra['context'] as Map<String, dynamic>?,
          );
        }),
        // GuacScore + Guacanomics both render the web /guacanomics page
        // (its headline content is the GuacScore). Web is the source of
        // truth so the score logic can't drift from mobile.
        GoRoute(path: '/guacscore',   builder: (_, __) => const WebAppScreen(path: '/guacanomics', title: 'Guacanomics')),
        GoRoute(path: '/guacanomics', builder: (_, __) => const WebAppScreen(path: '/guacanomics', title: 'Guacanomics')),
        GoRoute(path: '/guacwizard',  builder: (_, __) => const WebAppScreen(path: '/guacwizard', title: 'GuacWizard')),
        GoRoute(path: '/stash', builder: (_, __) => const StashScreen()),
        GoRoute(path: '/guacmoney', builder: (_, __) => const GuacMoneyScreen()),
        GoRoute(path: '/steals', builder: (_, __) => const WebAppScreen(path: '/steals', title: 'Steals')),
        // Public marketing pages, shown in-app via the WebView (build-once).
        // Reachable from the Menu grid; each gets the native AdMob banner from
        // MainScaffold. Their own web AdSense slots are suppressed in-app.
        GoRoute(path: '/marketplace', builder: (_, __) => const WebAppScreen(path: '/marketplace', title: 'Marketplace')),
        GoRoute(path: '/coupons',     builder: (_, __) => const WebAppScreen(path: '/coupons', title: 'Coupons')),
        GoRoute(path: '/plan',        builder: (_, __) => const WebAppScreen(path: '/plan', title: 'Plan & Forecast')),
        GoRoute(path: '/resources',   builder: (_, __) => const WebAppScreen(path: '/resources', title: 'Resources')),
        GoRoute(path: '/articles',    builder: (_, __) => const WebAppScreen(path: '/articles', title: 'Articles')),
        GoRoute(path: '/inbox', builder: (_, __) => const InboxScreen()),
        GoRoute(path: '/inbox/:id', builder: (_, state) => InboxDetailScreen(id: state.pathParameters['id']!)),
        GoRoute(path: '/how-it-works', builder: (_, __) => const HowItWorksScreen()),
        GoRoute(path: '/chat', builder: (_, __) => const ChatListScreen()),
        GoRoute(path: '/chat/:threadId', builder: (_, state) => ChatThreadScreen(threadId: state.pathParameters['threadId']!)),
        // Guac AI assistant + the Guac Arcade live on the web (the AI thread and
        // the canvas games are web-only), shown in-app via the WebView so the
        // dashboard's Guac AI / Games shortcuts work on mobile. Web /chat opens
        // the pinned Guac AI assistant by default; native /chat above stays DMs.
        GoRoute(path: '/guac-ai', builder: (_, __) => const WebAppScreen(path: '/chat', title: 'Guac AI')),
        GoRoute(path: '/games',   builder: (_, __) => const WebAppScreen(path: '/games', title: 'Games')),
      ],
    ),
  ],
);
