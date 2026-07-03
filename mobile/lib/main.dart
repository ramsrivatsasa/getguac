import 'dart:async';
import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter/services.dart' show FontLoader, rootBundle;
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:provider/provider.dart';
import 'providers/auth_provider.dart';
import 'providers/receipt_provider.dart';
import 'providers/reward_provider.dart';
import 'router.dart';
import 'services/share_intent_service.dart';
import 'services/app_lock_service.dart';
import 'services/debug_log.dart';
import 'services/update_service.dart';
import 'services/receipt_outbox.dart';
import 'services/push_notifications.dart';
import 'services/analytics_service.dart';
import 'services/referral_apply_service.dart';
import 'services/premium_service.dart';
import 'services/purchase_service.dart';
import 'services/ads_service.dart';
import 'theme/gg_design.dart';

// Env-var-gated DSN/keys. Empty string = service disabled. Passed via
// --dart-define=SENTRY_DSN=... and --dart-define=POSTHOG_KEY=... at build.
// sentry_flutter SDK pulled — Gradle compile error. Re-add when sorted.


// Brand palette — the clean "new design" avocado look (see theme/gg_design.dart).
// Repointed from the old emerald tones to the lime-forward home-page palette so
// every screen inheriting the theme picks up the refreshed accent in one place.
const kBrandPrimary    = ggLime;   // lime-600 — main brand
const kBrandPrimaryDk  = ggInk;    // deep forest green — accents
const kBrandAccent     = ggAccent; // lime-500 — pop
const kBrandSurface    = ggBgTint; // soft green — tinted surface

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  await DebugLog.init();
  await _loadBundledFonts();
  _fontDiag('post-load');
  await _bootstrap();
  // Second probe once the app is up, in case font availability is delayed.
  Future.delayed(const Duration(seconds: 5), () => _fontDiag('delayed-5s'));
}

/// TEMP device diagnostic (v0.4.5): measure whether the custom fonts actually
/// resolve on THIS device by comparing TextPainter widths vs the system font.
/// Uploaded to client_logs via DebugLog so we can read the real cause on a
/// device we can't reproduce locally (Samsung One UI). Remove once solved.
void _fontDiag(String phase) {
  try {
    double w(String? fam) {
      final tp = TextPainter(
        text: TextSpan(
          text: 'Guac WHOLESALE \$39 illil',
          style: TextStyle(fontFamily: fam, fontWeight: FontWeight.w800, fontSize: 24),
        ),
        textDirection: TextDirection.ltr,
      )..layout();
      return tp.width;
    }
    final sys = w(null);
    final bri = w('Bricolage Grotesque');
    final jak = w('Plus Jakarta Sans');
    DebugLog.event('font-diag', 'width probe ($phase)', level: 'warn', meta: {
      'phase': phase,
      'sys': sys.toStringAsFixed(1),
      'bricolage': bri.toStringAsFixed(1),
      'jakarta': jak.toStringAsFixed(1),
      'bricolage_resolved': (bri - sys).abs() > 0.5,
      'jakarta_resolved': (jak - sys).abs() > 0.5,
    });
  } catch (e) {
    DebugLog.event('font-diag', 'probe failed ($phase): $e', level: 'error');
  }
}

/// Force-register the bundled static fonts from asset bytes. Some devices don't
/// pick up pubspec-declared fonts and silently fall back to the system font
/// (Roboto); loading them explicitly via [FontLoader] guarantees Bricolage +
/// Jakarta are available regardless. Each static instance's own usWeightClass
/// lets Flutter match the requested fontWeight. Best-effort — never blocks boot.
Future<void> _loadBundledFonts() async {
  const families = <String, List<String>>{
    'Bricolage Grotesque': [
      'assets/fonts/static/BricolageGrotesque-700.ttf',
      'assets/fonts/static/BricolageGrotesque-800.ttf',
    ],
    'Plus Jakarta Sans': [
      'assets/fonts/static/PlusJakartaSans-400.ttf',
      'assets/fonts/static/PlusJakartaSans-500.ttf',
      'assets/fonts/static/PlusJakartaSans-600.ttf',
      'assets/fonts/static/PlusJakartaSans-700.ttf',
      'assets/fonts/static/PlusJakartaSans-800.ttf',
    ],
  };
  for (final entry in families.entries) {
    try {
      final loader = FontLoader(entry.key);
      var bytesOk = 0;
      for (final asset in entry.value) {
        final data = await rootBundle.load(asset); // throws if asset missing
        bytesOk += data.lengthInBytes;
        loader.addFont(Future.value(data));
      }
      await loader.load();
      DebugLog.event('font-load', 'FontLoader OK: ${entry.key}', level: 'warn',
          meta: {'weights': entry.value.length, 'bytes': bytesOk});
    } catch (e) {
      DebugLog.event('font-load', 'FontLoader FAILED: ${entry.key}: $e', level: 'error');
    }
  }
}

Future<void> _bootstrap() async {

  // Global error capture — FlutterError.onError for framework errors,
  // PlatformDispatcher.onError for uncaught async errors. Both feed the
  // DebugLog so we get the full trace next time it crashes / parser
  // fails / a connection blows up.
  FlutterError.onError = (FlutterErrorDetails details) {
    DebugLog.event('flutter-error', details.exceptionAsString(),
      level: 'error',
      meta: {
        'library': details.library,
        'context': details.context?.toString(),
        'stack': details.stack?.toString().split('\n').take(20).join('\n'),
      });
    FlutterError.presentError(details); // keep the default behaviour
  };
  PlatformDispatcher.instance.onError = (Object error, StackTrace stack) {
    // Some Supabase-side conditions throw at the zone level even though
    // the surrounding flow is handling them correctly (router sends the
    // user to /login on missing session, etc.). Downgrade those from
    // 'error' to 'info' so the audit log isn't drowning in expected
    // sign-out / token-rotation events.
    final msg = error.toString();
    final isExpectedAuth = error is AuthException &&
        (msg.contains('refresh_token_not_found') ||
         msg.contains('Invalid Refresh Token') ||
         msg.contains('Auth session missing'));
    DebugLog.event('zone-error', msg,
      level: isExpectedAuth ? 'info' : 'error',
      meta: {
        'stack': stack.toString().split('\n').take(20).join('\n'),
      });
    return true; // mark as handled — we don't want the platform to crash us
  };

  await Supabase.initialize(
    url: 'https://qchkwojgvfhlbdtpzzig.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjaGt3b2pndmZobGJkdHB6emlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1NzE0ODUsImV4cCI6MjA5NTE0NzQ4NX0.0aDoZO4-p8XBfdJx8lpK8jmOy02hFG15gXFc7HpcwKs',
  );

  // Diagnostic event log — hydrates the persistent buffer from
  // SharedPreferences before any biometric / app-lock event runs, so we
  // capture the cold-start flow.
  await DebugLog.init();
  final hasSession = Supabase.instance.client.auth.currentSession != null;
  DebugLog.event('main', 'app start', meta: {
    'has_supabase_session': hasSession,
  });

  // Cache the biometric "enabled" flag synchronously so the router's redirect
  // can read it on the first frame. Without this, the lock-screen gate would
  // race the initial route resolution.
  await AppLockService.init();

  // Best-effort cleanup of the previous version's downloaded APK. If we got
  // here, the new build is running, so the old APK in the app cache is
  // useless. Fire-and-forget so app start isn't blocked.
  unawaited(UpdateService.cleanupOldApk());

  // Sweep the receipt outbox. Pure fire-and-forget so a slow network can't
  // delay the first frame. Anything queued by a prior session (offline
  // capture, server 5xx) is replayed with its original Idempotency-Key.
  // ReceiptOutbox.flush() reads the supabase session itself; if the user
  // isn't signed in it no-ops cleanly.
  unawaited(ReceiptOutbox.flush());

  // Set up share-intent listener AFTER router is constructed so we can
  // navigate to /car-miles on incoming shares.
  await ShareIntentService.init(appRouter);

  // Push notifications — best-effort. Initializes Firebase, requests
  // OS permission, captures the device's FCM token, and upserts it
  // into `push_tokens` so the server dispatcher can target this
  // device. No-ops cleanly if Firebase isn't configured for this
  // build (no google-services.json / GoogleService-Info.plist).
  unawaited(PushNotifications.instance.init());

  // PostHog setup + Supabase auth subscription. No-ops when
  // --dart-define=POSTHOG_KEY is empty.
  unawaited(AnalyticsService.init());

  // Apply any pending referral code captured pre-signup (deep link).
  // Mirrors the web's PostSignupReferralApply; fires a mascot
  // celebrate on success. No-op when there's nothing pending.
  unawaited(ReferralApplyService.applyPendingIfAny());

  // Premium entitlement + in-app purchase listener. refresh() reads the
  // current premium state; PurchaseService.init() wires the store + re-delivers
  // any past purchases. Both no-op cleanly when signed out / store unavailable.
  unawaited(PremiumService.instance.refresh());
  unawaited(PurchaseService.instance.init());

  // AdMob SDK init (native Tier-2 ads). No-ops cleanly if the AdMob app id
  // isn't configured yet; ads only render for non-premium users once a unit
  // id is set (test ads in debug builds).
  unawaited(AdsService.init());

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
        ChangeNotifierProvider.value(value: PremiumService.instance),
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
          // Pure white canvas to match the web app (changed from
          // slate-50). Cards, tiles, and gradients keep their own
          // colors; this just keeps the page background neutral so
          // brand chrome reads cleanly.
          scaffoldBackgroundColor: Colors.white,
          // Central type system — Plus Jakarta Sans body + Bricolage Grotesque
          // headings, exactly like the website. Defined once in
          // theme/gg_design.dart and inherited by every screen so fonts stay
          // consistent across the board (no per-screen fontFamily drift).
          textTheme: ggTextTheme(),
          // Edge-swipe-to-go-back on EVERY platform. Cupertino's
          // page-transition builder ships the iOS-style drag-from-
          // left-edge gesture (drag right, screen behind slides
          // back into view) — on stock Android Material that
          // gesture isn't wired by default. Applying it to all
          // TargetPlatform entries gives the same UX everywhere
          // without rewriting individual routes.
          pageTransitionsTheme: const PageTransitionsTheme(
            builders: {
              TargetPlatform.android: CupertinoPageTransitionsBuilder(),
              TargetPlatform.iOS:     CupertinoPageTransitionsBuilder(),
              TargetPlatform.linux:   CupertinoPageTransitionsBuilder(),
              TargetPlatform.macOS:   CupertinoPageTransitionsBuilder(),
              TargetPlatform.windows: CupertinoPageTransitionsBuilder(),
            },
          ),
          // Headers use Plus Jakarta Sans — a geometric humanist sans
          // with friendly curves. Recognizable in the hand without
          // being odd, plays well with the emerald/lime palette, and
          // reads cleanly at large AppBar sizes. Body text stays on
          // the system default (legibility for receipts data).
          // Clean light top bar on every native screen — the "new design"
          // home-page look (white surface, deep-green title, hairline divider)
          // instead of the old dark-emerald bar. web_app_screen.dart matches
          // this so native + embedded pages stay consistent. Fonts unchanged
          // (still Plus Jakarta Sans on the title).
          appBarTheme: AppBarTheme(
            backgroundColor: Colors.white,
            surfaceTintColor: Colors.transparent,
            foregroundColor: ggInk,
            iconTheme: const IconThemeData(color: ggInk),
            actionsIconTheme: const IconThemeData(color: ggInk),
            elevation: 0,
            scrolledUnderElevation: 0.5,
            shadowColor: ggShadow,
            centerTitle: false,
            shape: const Border(bottom: BorderSide(color: ggBorder, width: 1)),
            titleTextStyle: const TextStyle(
              fontFamily: kDisplayFont,
              color: ggInk,
              fontSize: 21,
              fontWeight: FontWeight.w800,
              letterSpacing: -0.5,
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
          // Pill-shaped buttons in brand lime — the home-page CTA style.
          elevatedButtonTheme: ElevatedButtonThemeData(
            style: ElevatedButton.styleFrom(
              backgroundColor: kBrandPrimary,
              foregroundColor: Colors.white,
              shape: const StadiumBorder(),
              padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 22),
              elevation: 0,
            ),
          ),
          filledButtonTheme: FilledButtonThemeData(
            style: FilledButton.styleFrom(
              backgroundColor: kBrandPrimary,
              foregroundColor: Colors.white,
              shape: const StadiumBorder(),
              padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 22),
              elevation: 0,
            ),
          ),
          textButtonTheme: TextButtonThemeData(
            style: TextButton.styleFrom(foregroundColor: kBrandPrimary),
          ),
          // Cleaner cards: softer radius + whisper-light shadow, matching the
          // airy home-page surfaces.
          cardTheme: CardThemeData(
            elevation: 0,
            color: Colors.white,
            surfaceTintColor: Colors.transparent,
            shadowColor: ggShadow,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(20),
              side: const BorderSide(color: ggBorder),
            ),
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
