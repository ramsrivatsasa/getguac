import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'providers/auth_provider.dart';
import 'screens/auth/login_screen.dart';
import 'screens/auth/register_screen.dart';
import 'screens/dashboard/dashboard_screen.dart';
import 'screens/receipts/receipts_screen.dart';
import 'screens/receipts/receipt_detail_screen.dart';
import 'screens/rewards/rewards_screen.dart';
import 'screens/rewards/reward_detail_screen.dart';
import 'screens/shopping/shopping_list_screen.dart';
import 'screens/car_miles/car_miles_screen.dart';
import 'screens/profile/profile_screen.dart';
import 'screens/guacscore/guacscore_screen.dart';
import 'screens/guacwizard/guacwizard_screen.dart';
import 'screens/stash/stash_screen.dart';
import 'screens/steals/steals_screen.dart';
import 'widgets/main_scaffold.dart';

final appRouter = GoRouter(
  initialLocation: '/dashboard',
  redirect: (context, state) {
    final auth = context.read<AppAuthProvider>();
    final isLoggedIn = auth.currentUser != null;
    final isAuthRoute = state.matchedLocation == '/login' || state.matchedLocation == '/register';
    if (!isLoggedIn && !isAuthRoute) return '/login';
    if (isLoggedIn && isAuthRoute) return '/dashboard';
    return null;
  },
  routes: [
    GoRoute(path: '/login', builder: (_, __) => const LoginScreen()),
    GoRoute(path: '/register', builder: (_, __) => const RegisterScreen()),
    ShellRoute(
      builder: (_, __, child) => MainScaffold(child: child),
      routes: [
        GoRoute(path: '/dashboard', builder: (_, __) => const DashboardScreen()),
        GoRoute(path: '/receipts', builder: (_, __) => const ReceiptsScreen()),
        GoRoute(path: '/receipts/:id', builder: (_, state) => ReceiptDetailScreen(id: state.pathParameters['id']!)),
        GoRoute(path: '/rewards', builder: (_, __) => const RewardsScreen()),
        GoRoute(path: '/rewards/:id', builder: (_, state) => RewardDetailScreen(id: state.pathParameters['id']!)),
        GoRoute(path: '/shopping', builder: (_, __) => const ShoppingListScreen()),
        GoRoute(path: '/car-miles', builder: (_, __) => const CarMilesScreen()),
        GoRoute(path: '/profile', builder: (_, __) => const ProfileScreen()),
        GoRoute(path: '/guacscore', builder: (_, __) => const GuacScoreScreen()),
        GoRoute(path: '/guacwizard', builder: (_, __) => const GuacWizardScreen()),
        GoRoute(path: '/stash', builder: (_, __) => const StashScreen()),
        GoRoute(path: '/steals', builder: (_, __) => const StealsScreen()),
      ],
    ),
  ],
);
