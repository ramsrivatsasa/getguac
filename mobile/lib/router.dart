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
import 'screens/rewards/rewards_screen.dart';
import 'screens/rewards/reward_detail_screen.dart';
import 'screens/shopping/shopping_list_screen.dart';
import 'screens/car_miles/car_miles_screen.dart';
import 'screens/profile/profile_screen.dart';
import 'screens/profile/report_problem_screen.dart';
import 'screens/guacscore/guacscore_screen.dart';
import 'screens/guacwizard/guacwizard_screen.dart';
import 'screens/stash/stash_screen.dart';
import 'screens/steals/steals_screen.dart';
import 'screens/inbox/inbox_screen.dart';
import 'screens/inbox/inbox_detail_screen.dart';
import 'screens/how_it_works/how_it_works_screen.dart';
import 'widgets/main_scaffold.dart';

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
          ),
        ),
        GoRoute(path: '/receipts/:id', builder: (_, state) => ReceiptDetailScreen(id: state.pathParameters['id']!)),
        GoRoute(path: '/rewards', builder: (_, __) => const RewardsScreen()),
        GoRoute(path: '/rewards/:id', builder: (_, state) => RewardDetailScreen(id: state.pathParameters['id']!)),
        GoRoute(path: '/shopping', builder: (_, __) => const ShoppingListScreen()),
        GoRoute(path: '/car-miles', builder: (_, __) => const CarMilesScreen()),
        GoRoute(path: '/profile', builder: (_, __) => const ProfileScreen()),
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
        GoRoute(path: '/guacscore', builder: (_, __) => const GuacScoreScreen()),
        GoRoute(path: '/guacwizard', builder: (_, __) => const GuacWizardScreen()),
        GoRoute(path: '/stash', builder: (_, __) => const StashScreen()),
        GoRoute(path: '/steals', builder: (_, __) => const StealsScreen()),
        GoRoute(path: '/inbox', builder: (_, __) => const InboxScreen()),
        GoRoute(path: '/inbox/:id', builder: (_, state) => InboxDetailScreen(id: state.pathParameters['id']!)),
        GoRoute(path: '/how-it-works', builder: (_, __) => const HowItWorksScreen()),
      ],
    ),
  ],
);
