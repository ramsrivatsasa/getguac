// Stub analytics service — posthog_flutter was pulled because its
// Kotlin compile fails on our AGP version. All methods no-op so
// call sites keep working. Re-implement against the real PostHog
// SDK once the Gradle issue is sorted with a real POSTHOG_KEY to
// verify against.

class AnalyticsService {
  static Future<void> init() async {}
  static Future<void> identify(String userId, {String? email}) async {}
  static Future<void> reset() async {}
  static Future<void> track(String event, [Map<String, Object>? props]) async {}
}
