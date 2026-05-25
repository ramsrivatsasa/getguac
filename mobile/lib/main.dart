import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:provider/provider.dart';
import 'providers/auth_provider.dart';
import 'providers/receipt_provider.dart';
import 'providers/reward_provider.dart';
import 'router.dart';

// Brand palette — matches the web app (emerald + lime).
const kBrandPrimary    = Color(0xFF15803d); // emerald-700 — main brand
const kBrandPrimaryDk  = Color(0xFF064e3b); // emerald-900 — accents
const kBrandAccent     = Color(0xFF84cc16); // lime-500   — pop
const kBrandSurface    = Color(0xFFf0fdf4); // emerald-50 — soft background

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
          useMaterial3: true,
          colorScheme: ColorScheme.fromSeed(
            seedColor: kBrandPrimary,
            primary: kBrandPrimary,
            secondary: kBrandAccent,
            surface: Colors.white,
          ),
          scaffoldBackgroundColor: const Color(0xFFf8fafc),
          appBarTheme: const AppBarTheme(
            backgroundColor: Colors.white,
            foregroundColor: kBrandPrimaryDk,
            elevation: 0,
            scrolledUnderElevation: 1,
            centerTitle: false,
            titleTextStyle: TextStyle(
              color: kBrandPrimaryDk,
              fontSize: 20,
              fontWeight: FontWeight.w800,
            ),
          ),
          inputDecorationTheme: InputDecorationTheme(
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: Color(0xFFe5e7eb)),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: kBrandPrimary, width: 2),
            ),
            contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
          ),
          elevatedButtonTheme: ElevatedButtonThemeData(
            style: ElevatedButton.styleFrom(
              backgroundColor: kBrandPrimary,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 18),
              elevation: 0,
            ),
          ),
          filledButtonTheme: FilledButtonThemeData(
            style: FilledButton.styleFrom(
              backgroundColor: kBrandPrimary,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              padding: const EdgeInsets.symmetric(vertical: 14),
            ),
          ),
          textButtonTheme: TextButtonThemeData(
            style: TextButton.styleFrom(foregroundColor: kBrandPrimary),
          ),
          cardTheme: CardThemeData(
            elevation: 1,
            shadowColor: Colors.black12,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          ),
          navigationBarTheme: NavigationBarThemeData(
            backgroundColor: Colors.white,
            indicatorColor: kBrandPrimary.withValues(alpha: 0.15),
            labelTextStyle: WidgetStateProperty.all(const TextStyle(
              fontSize: 12, fontWeight: FontWeight.w700,
            )),
          ),
        ),
        routerConfig: appRouter,
      ),
    );
  }
}
