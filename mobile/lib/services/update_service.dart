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
import 'dart:io';
import 'package:http/http.dart' as http;
import 'package:open_filex/open_filex.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:path_provider/path_provider.dart';
import 'package:url_launcher/url_launcher.dart';
import 'debug_log.dart';

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

  /// Filename we always write the downloaded APK to inside the app's cache
  /// directory. Stable name so the next-launch cleanup can find and delete
  /// it without scanning.
  static const _kCachedApkName = 'getguac-update.apk';

  /// Download the APK into the app's cache directory and trigger the
  /// system's package installer. Android cleans the cache automatically
  /// when storage gets tight, AND we also delete the file explicitly on
  /// the next app launch via cleanupOldApk(). Result is no leftover APK
  /// in Downloads after the install.
  ///
  /// Returns true if the install intent fired. False on download failure;
  /// caller may want to fall back to openInBrowser().
  static Future<bool> downloadAndInstall(String url) async {
    DebugLog.event('update', 'downloadAndInstall start', meta: {'url': url});
    try {
      final res = await http.get(Uri.parse(url)).timeout(const Duration(minutes: 2));
      if (res.statusCode != 200) {
        DebugLog.event('update', 'download non-200', level: 'error',
          meta: {'status': res.statusCode});
        return false;
      }
      final dir = await getApplicationCacheDirectory();
      final file = File('${dir.path}/$_kCachedApkName');
      await file.writeAsBytes(res.bodyBytes, flush: true);
      DebugLog.event('update', 'apk written', meta: {
        'bytes': res.bodyBytes.length,
        'path': file.path,
      });
      final opened = await OpenFilex.open(file.path);
      DebugLog.event('update', 'OpenFilex result',
        meta: {'type': opened.type.toString(), 'message': opened.message});
      return opened.type == ResultType.done;
    } catch (e) {
      DebugLog.event('update', 'downloadAndInstall threw', level: 'error',
        meta: {'error': e.toString()});
      return false;
    }
  }

  /// Delete the cached APK from the previous update (if any). Called from
  /// main() on every app start — by the time the new build is running, the
  /// previous APK is no longer needed.
  static Future<void> cleanupOldApk() async {
    try {
      final dir = await getApplicationCacheDirectory();
      final file = File('${dir.path}/$_kCachedApkName');
      if (await file.exists()) {
        await file.delete();
        DebugLog.event('update', 'old apk deleted', meta: {'path': file.path});
      }
    } catch (e) {
      DebugLog.event('update', 'cleanupOldApk threw', level: 'warn',
        meta: {'error': e.toString()});
    }
  }

  /// Legacy browser-based path — kept as a fallback in case the in-app
  /// download fails (network or permission issue). Browser saves to
  /// Downloads, which is what we're trying to avoid, but at least the
  /// user can still install.
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
