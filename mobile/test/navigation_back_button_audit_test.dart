// Static-source audit — verifies every screen file under
// lib/screens/ uses a Scaffold + AppBar so Flutter's automatic
// back-button rendering kicks in (whenever there's a previous
// route in the stack).
//
// Plus: confirms main.dart wires the CupertinoPageTransitionsBuilder
// on every TargetPlatform — that's what makes the left-edge swipe-
// back gesture work app-wide.
//
// Run:  cd mobile && flutter test test/navigation_back_button_audit_test.dart
//
// Why this isn't a widget-pump test: pumping each screen requires
// MaterialApp + Provider + GoRouter + mocked Supabase + ... — way
// more setup per screen than we'd realistically maintain. A
// source-level audit catches the same regressions (a new screen
// missing its AppBar) for ~zero cost.

import 'dart:io';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('every screen file uses Scaffold + AppBar', () {
    final screensDir = Directory('${Directory.current.path}/lib/screens');
    expect(screensDir.existsSync(), isTrue, reason: 'lib/screens must exist');

    // Exclusions — screens that legitimately have no AppBar because
    // there's nowhere to go back to (entry / auth flows).
    const allowedNoAppBar = {
      'login_screen.dart',
      'register_screen.dart',
      'app_lock_screen.dart',
    };

    final offenders = <String>[];
    for (final f in screensDir.listSync(recursive: true).whereType<File>()) {
      if (!f.path.endsWith('.dart')) continue;
      final name = f.path.split(Platform.pathSeparator).last;
      if (allowedNoAppBar.contains(name)) continue;
      final src = f.readAsStringSync();
      // Files that have Scaffold MUST have AppBar — otherwise the
      // top-left back arrow won't render when pushed onto the stack.
      final hasScaffold = src.contains('Scaffold(');
      final hasAppBar   = src.contains('AppBar(') || src.contains('SliverAppBar(');
      if (hasScaffold && !hasAppBar) {
        offenders.add(f.path);
      }
    }

    expect(offenders, isEmpty,
      reason: 'Screens with Scaffold but no AppBar (back button won\'t render): '
              '${offenders.join(', ')}');
  });

  test('main.dart enables CupertinoPageTransitionsBuilder for all platforms', () {
    final main = File('${Directory.current.path}/lib/main.dart').readAsStringSync();

    // Find the pageTransitionsTheme block.
    expect(main, contains('pageTransitionsTheme'),
      reason: 'main.dart must configure pageTransitionsTheme — without it the '
              'edge-swipe-back gesture is disabled on Android.');

    // Every TargetPlatform must map to the Cupertino builder so swipe-back
    // works on every platform, not just iOS.
    for (final p in ['android', 'iOS', 'linux', 'macOS', 'windows']) {
      expect(main, contains('TargetPlatform.$p'),
        reason: 'TargetPlatform.$p must be wired to CupertinoPageTransitionsBuilder');
    }
    expect(main, contains('CupertinoPageTransitionsBuilder()'),
      reason: 'CupertinoPageTransitionsBuilder must be the chosen builder');
  });

  test('dashboard navigation uses context.push (builds a back stack)', () {
    final dash = File('${Directory.current.path}/lib/screens/dashboard/dashboard_screen.dart')
      .readAsStringSync();
    // context.go() REPLACES the stack — nothing to swipe back to.
    // context.push() builds the stack so back navigation works.
    expect(dash.contains('context.go('), isFalse,
      reason: 'dashboard_screen.dart still has context.go() calls — switch to '
              'context.push() so swipe-back + AppBar back arrow work after a tile tap.');
  });
}
