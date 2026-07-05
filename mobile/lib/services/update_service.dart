// In-app update check.
//
// Reads getguac.app/downloads/latest.json, compares the published
// version against the bundled pubspec version, and returns the
// download URL when a newer version is available. The JSON shape:
//
//   {
//     "version":      "v0.3.5",
//     "name":         "v0.3.5 — engagement strip horizontal scroll",
//     "downloadUrl":  "https://getguac.app/downloads/v0.3.5/app-arm64-v8a-release.apk",
//     "releaseNotes": "What's new in this build…"
//   }
//
// Switched from GitHub Releases because we publish APKs to
// /downloads/<version>/ on getguac.app directly — the manifest
// approach decouples the in-app update prompt from creating a
// GitHub release for every build.
//
// Apple-style auto-install isn't possible for sideloaded Android
// apps without Play Store integration. Instead, we download the APK
// into the app's cache and open it with the system package
// installer (downloadAndInstall) — Android shows the install
// confirmation, user taps Install, done.

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
  // Manifest published alongside each release at
  // /downloads/latest.json. Reading from getguac.app means a fresh
  // deploy = an instantly-detected update on every signed-in
  // device, with zero GitHub coupling. `?t=…` cache-buster appended
  // at request time so CDN/edge caches can't serve a stale
  // manifest after a redeploy.
  static const _manifestUrl = 'https://getguac.app/downloads/latest.json';

  // Play Store builds pass --dart-define=IS_PLAY=true. Google Play prohibits
  // self-updating (installing APKs outside Play), so the in-app updater must be
  // completely inert on Play builds — Play delivers updates. The /download
  // sideload build leaves this false and keeps the updater active.
  static const _isPlayBuild = bool.fromEnvironment('IS_PLAY', defaultValue: false);

  /// Fetches latest.json. Returns null if there's no newer version than what's
  /// running, if the check failed (offline, 404, JSON parse error — never
  /// throws), or always on Play builds and on non-Android platforms (the
  /// manifest points at an APK — meaningless on iOS, and Apple prohibits
  /// self-updating anyway).
  static Future<AvailableUpdate?> checkForUpdate() async {
    if (_isPlayBuild || !Platform.isAndroid) return null;
    try {
      final info = await PackageInfo.fromPlatform();
      final currentTag = 'v${info.version}';  // pubspec is "0.3.5+97" → "v0.3.5+97"

      final res = await http
          .get(Uri.parse('$_manifestUrl?t=${DateTime.now().millisecondsSinceEpoch}'))
          .timeout(const Duration(seconds: 6));
      if (res.statusCode != 200) return null;
      final json = jsonDecode(res.body) as Map<String, dynamic>;
      final latestTag = (json['version'] ?? '').toString();
      if (latestTag.isEmpty) return null;
      if (_compareVersions(latestTag, currentTag) <= 0) return null;

      final downloadUrl = (json['downloadUrl'] ?? '').toString();
      if (downloadUrl.isEmpty) return null;

      return AvailableUpdate(
        tag: latestTag,
        name: (json['name'] ?? latestTag).toString(),
        downloadUrl: downloadUrl,
        releaseNotes: (json['releaseNotes'] ?? '').toString(),
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
