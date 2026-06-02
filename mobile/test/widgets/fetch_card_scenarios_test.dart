// FetchCard contract test — pumps each scenario from
// test-fixtures/item-card-scenarios.json through the real FetchCard
// widget and asserts the build succeeds with no exception. Catches
// prop-contract drift (web-only props that mobile doesn't accept,
// or vice versa) at test time rather than runtime.

import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:getguac/widgets/fetch_card.dart';

void main() {
  final path = _findFixture('item-card-scenarios.json');
  final data = jsonDecode(File(path).readAsStringSync()) as Map<String, dynamic>;
  final scenarios = (data['scenarios'] as List).cast<Map<String, dynamic>>();

  group('FetchCard — item-card contract scenarios', () {
    for (final scenario in scenarios) {
      final id = scenario['id'] as String;
      final title = scenario['title'] as String;
      final props = scenario['props'] as Map<String, dynamic>;

      testWidgets('$id — $title', (tester) async {
        final card = _buildCardFromProps(props);
        await tester.pumpWidget(MaterialApp(
          home: Scaffold(body: SingleChildScrollView(child: Padding(
            padding: const EdgeInsets.all(12),
            child: card,
          ))),
        ));
        await tester.pumpAndSettle();

        // The widget rendered without throwing — that's the primary
        // assertion. Also verify the title text is present in the
        // tree so the prop actually wired through.
        final expectedTitle = props['title'] as String;
        expect(find.text(expectedTitle), findsOneWidget,
          reason: 'FetchCard did not render title="$expectedTitle"');

        // Subtitle present when supplied.
        final subtitle = props['subtitle'] as String?;
        if (subtitle != null) {
          expect(find.text(subtitle), findsOneWidget,
            reason: 'FetchCard did not render subtitle for $id');
        }
      });
    }
  });
}

FetchCard _buildCardFromProps(Map<String, dynamic> p) {
  return FetchCard(
    title: p['title'] as String,
    subtitle: p['subtitle'] as String?,
    imageEmoji: p['imageEmoji'] as String?,
    imageUrl: p['imageUrl'] as String?,
    tint: _color(p['tint']) ?? const Color(0xFFfef9c3),
    urgency: p['urgency'] as String?,
    urgencyBg: _color(p['urgencyBg']) ?? const Color(0xFFfecdd3),
    urgencyFg: _color(p['urgencyFg']) ?? const Color(0xFF9f1239),
    storeName: p['storeName'] as String?,
    storeColor: _color(p['storeColor']),
    storeEmoji: p['storeEmoji'] as String?,
    value: p['value'] as num?,
    valueLabel: (p['valueLabel'] as String?) ?? '',
    valueIsPrefix: (p['valueIsPrefix'] as bool?) ?? false,
    rating: (p['rating'] as num?)?.toInt() ?? 0,
    saved: (p['saved'] as bool?) ?? false,
    onRate: p['onRate'] != null ? (_) {} : null,
    onToggleSave: p['onToggleSave'] != null ? () {} : null,
    onTap: p['onTap'] != null ? () {} : null,
    onShare: p['onShare'] != null ? () {} : null,
    onMenu: p['onMenu'] != null ? () {} : null,
  );
}

Color? _color(Object? v) {
  if (v == null) return null;
  var s = v.toString();
  if (s.startsWith('#')) s = s.substring(1);
  if (s.length == 6) s = 'FF$s';
  final n = int.tryParse(s, radix: 16);
  return n == null ? null : Color(n);
}

String _findFixture(String name) {
  var dir = Directory.current.absolute;
  for (var i = 0; i < 6; i++) {
    final candidate = File('${dir.path}/test-fixtures/$name');
    if (candidate.existsSync()) return candidate.path;
    final parent = dir.parent;
    if (parent.path == dir.path) break;
    dir = parent;
  }
  throw StateError('Could not find test-fixtures/$name');
}
