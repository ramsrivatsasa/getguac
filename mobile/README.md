# getguac

GetGuac Flutter app (Android + iOS).

## Build-time environment variables

Pass via `--dart-define` to enable optional services. Each is gated on a
non-empty value — leave empty (or omit) to disable the service entirely.

```
--dart-define=SENTRY_DSN=          # crash + error reporting
--dart-define=POSTHOG_KEY=         # behavioral analytics
--dart-define=POSTHOG_HOST=https://us.i.posthog.com
--dart-define=FIREBASE_ENABLED=    # push notifications (requires google-services.json)
```

Example release build:

```
flutter build apk --release \
  --dart-define=SENTRY_DSN=https://...ingest.sentry.io/... \
  --dart-define=POSTHOG_KEY=phc_... \
  --dart-define=FIREBASE_ENABLED=true
```

## Getting started

- [Learn Flutter](https://docs.flutter.dev/get-started/learn-flutter)
- [Write your first Flutter app](https://docs.flutter.dev/get-started/codelab)
- [Flutter learning resources](https://docs.flutter.dev/reference/learning-resources)
