import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:provider/provider.dart';
import 'providers/auth_provider.dart';
import 'providers/receipt_provider.dart';
import 'providers/reward_provider.dart';
import 'router.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  await Supabase.initialize(
    url: 'https://qchkwojgvfhlbdtpzzig.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjaGt3b2pndmZobGJkdHB6emlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1NzE0ODUsImV4cCI6MjA5NTE0NzQ4NX0.0aDoZO4-p8XBfdJx8lpK8jmOy02hFG15gXFc7HpcwKs',
  );

  runApp(const GetGuacApp());
}

final supabase = Supabase.instance.client;

class GetGuacApp extends StatelessWidget {
  const GetGuacApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AppAuthProvider()),
        ChangeNotifierProvider(create: (_) => ReceiptProvider()),
        ChangeNotifierProvider(create: (_) => RewardProvider()),
      ],
      child: MaterialApp.router(
        title: 'GetGuac',
        debugShowCheckedModeBanner: false,
        theme: ThemeData(
          colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF1e3a8a), primary: const Color(0xFF1e3a8a)),
          useMaterial3: true,
          appBarTheme: const AppBarTheme(backgroundColor: Color(0xFF1e3a8a), foregroundColor: Colors.white, elevation: 0),
          inputDecorationTheme: InputDecorationTheme(border: OutlineInputBorder(borderRadius: BorderRadius.circular(10))),
          elevatedButtonTheme: ElevatedButtonThemeData(
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF1d4ed8), foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              padding: const EdgeInsets.symmetric(vertical: 14),
            ),
          ),
        ),
        routerConfig: appRouter,
      ),
    );
  }
}
