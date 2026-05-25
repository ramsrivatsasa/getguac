// In-app update check.
//
// Calls GitHub's public Releases API for ramsrivatsasa/getguac, compares the
// latest tag with the bundled pubspec version, and returns the download URL
// when a newer version is available.
//
// Apple-style auto-install isn't possible for sideloaded Android apps without
// Play Store integration. Instead, we open the APK URL in a browser — Android
// downloads it, the user taps the download notification → installs.

import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:package_info_plus/package_info_plus.dart';
import 'package:url_launcher/url_launcher.dart';

class AvailableUpdate {
  final String tag;          // e.g. "v0.1.4"
  final String name;         // release title
  final String downloadUrl;  // direct APK URL (arm64-v8a — most phones)
  final String? releaseNotes;
  AvailableUpdate({required this.tag, required this.name, required this.downloadUrl, this.releaseNotes});
}

class UpdateService {
  static const _githubApi = 'https://api.github.com/repos/ramsrivatsasa/getguac/releases/latest';
  static const _abiPreference = 'app-arm64-v8a-release.apk';

  /// Fetches the latest GitHub release. Returns null if there's no newer
  /// version than what's running, or if the check failed (offline, rate
  /// limited, etc — never throws).
  static Future<AvailableUpdate?> checkForUpdate() async {
    try {
      final info = await PackageInfo.fromPlatform();
      final currentTag = 'v${info.version}';  // pubspec version is like "1.0.0+1" → "v1.0.0"

      final res = await http.get(Uri.parse(_githubApi)).timeout(const Duration(seconds: 6));
      if (res.statusCode != 200) return null;
      final json = jsonDecode(res.body) as Map<String, dynamic>;
      final latestTag = (json['tag_name'] ?? '').toString();
      if (latestTag.isEmpty) return null;
      if (_compareVersions(latestTag, currentTag) <= 0) return null;

      // Find the arm64 APK in the release assets
      final assets = (json['assets'] as List?) ?? [];
      String? downloadUrl;
      for (final a in assets) {
        if (a is Map && a['name'] == _abiPreference) {
          downloadUrl = a['browser_download_url'] as String?;
          break;
        }
      }
      // Fall back to the first APK asset if arm64 isn't there
      downloadUrl ??= assets
          .whereType<Map>()
          .map((a) => a['browser_download_url'] as String?)
          .firstWhere((u) => u != null && u.endsWith('.apk'), orElse: () => null);
      if (downloadUrl == null) return null;

      return AvailableUpdate(
        tag: latestTag,
        name: (json['name'] ?? latestTag).toString(),
        downloadUrl: downloadUrl,
        releaseNotes: (json['body'] ?? '').toString(),
      );
    } catch (_) {
      return null;
    }
  }

  /// Opens the APK URL in the device's browser. Android downloads + offers
  /// to install with one tap. (Real install requires user confirmation —
  /// Play Store is the only path to fully-silent installs.)
  static Future<bool> openDownload(String url) {
    return launchUrl(Uri.parse(url), mode: LaunchMode.externalApplication);
  }

  /// Strict-ish "v1.2.3" comparator. Returns negative if a < b, 0 if equal, positive if a > b.
  static int _compareVersions(String a, String b) {
    List<int> parse(String s) => s
        .replaceFirst(RegExp(r'^v'), '')
        .split(RegExp(r'[.+-]'))
        .map((p) => int.tryParse(p) ?? 0)
        .toList();
    final pa = parse(a);
    final pb = parse(b);
    final n = pa.length > pb.length ? pa.length : pb.length;
    for (var i = 0; i < n; i++) {
      final ai = i < pa.length ? pa[i] : 0;
      final bi = i < pb.length ? pb[i] : 0;
      if (ai != bi) return ai - bi;
    }
    return 0;
  }
}
