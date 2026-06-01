# Push notifications — setup checklist

Code for end-to-end FCM is in place (DB migration, mobile capture,
server sender, daily cron, in-app prefs). To actually deliver a
push, complete the one-time setup below.

## 1. Apply the SQL migration

```sql
-- in Supabase SQL editor
\i web/supabase/migration_061_push_notifications.sql
```

This creates:
- `push_tokens` (user_id, token, platform) with RLS
- `notification_prefs` JSON column on `profiles`
- `notification_log` (de-dup ledger) with RLS

## 2. Create a Firebase project

1. https://console.firebase.google.com → Add project
2. Project Settings → Cloud Messaging → enable
3. **Android**: register Android app with package name
   `com.getguac.app` (or your actual applicationId — check
   `mobile/android/app/build.gradle`). Download
   `google-services.json` → drop into `mobile/android/app/`.
4. **iOS**: register iOS app with bundle id from
   `mobile/ios/Runner.xcodeproj`. Download
   `GoogleService-Info.plist` → drag into the Runner target in
   Xcode.
5. **iOS APNS**: Apple Developer → Keys → create an APNS auth
   key. Upload the `.p8` to Firebase Console → Project Settings
   → Cloud Messaging → Apple app configuration.

## 3. Wire FlutterFire

```bash
cd mobile
dart pub global activate flutterfire_cli
flutterfire configure --project=YOUR_PROJECT_ID
```

This generates `lib/firebase_options.dart` and ensures the
correct config files are bundled per platform.

After running, update `lib/services/push_notifications.dart` to
pass the generated options:

```dart
import '../firebase_options.dart';
…
await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);
```

(currently it calls `Firebase.initializeApp()` with no options;
that works when the platform config files are in place but is
flakier — `firebase_options.dart` is the recommended path.)

## 4. iOS-only Xcode capabilities

In Xcode, `Runner` target → Signing & Capabilities → add:
- **Push Notifications**
- **Background Modes** → tick "Remote notifications"

Without these the device gets a token but APNS won't actually
deliver to it.

## 5. Service-account credential for Vercel

1. Firebase Console → Project Settings → Service Accounts →
   "Generate new private key" → download JSON.
2. In Vercel project settings, add an env var:
   - `FIREBASE_SERVICE_ACCOUNT_JSON`
   - value: paste the JSON contents (raw or base64 — the sender
     accepts both).
3. Also set `CRON_SECRET` to a random string. Vercel cron sends
   `Authorization: Bearer $CRON_SECRET` automatically when the
   var is set.

## 6. (Optional) Redeploy

After both env vars are set, redeploy so the new
`/api/notify/dispatch` route picks them up.

## 7. Test path

Mobile:
1. Build a debug APK (`flutter run --release` ideally) and sign
   in. The app should print a token in logcat:
   `[PushNotifications]` … and `push_tokens` should have a new row
   for your user.

Web:
1. `https://getguac.app/notifications` — should show all five
   categories with toggles, all on by default.

Trigger:
1. Manually hit the dispatcher in your browser while signed in
   to Vercel:
   `https://getguac.app/api/notify/dispatch`
   (You'll get 401 unless you pass `Authorization: Bearer
   $CRON_SECRET`. Use Postman / curl for the real test.)

Daily:
1. Vercel cron runs `/api/notify/dispatch` at 14:00 UTC. Check
   `notification_log` for sends — each row is a successful
   dispatch.

## Triggers and de-dup

| Category            | Condition                                              | De-dup key                                  |
|---------------------|--------------------------------------------------------|---------------------------------------------|
| `rewards_expiring`  | Reward expires within 7 days                           | `reward:<id>:expires-<date>`                |
| `return_window`     | Eligible policy expires tomorrow                       | `return:<policyId>:closes-<date>`           |
| `bank_bite_digest`  | Monday only; last 7 days of fees > $0                  | `digest:week-<dateStart>`                   |
| `anomaly_alert`     | Category 30d > 1.5× prior 30d AND > $50 absolute       | `anomaly:<cat>:week-<isoWeek>`              |
| `smashlist_day`     | `shopping_list.next_due` ∈ today..today+2              | `smashlist:<store>:week-<isoWeek>`          |

Re-running the dispatcher the same day is safe — every row in
`notification_log` is unique on `(user_id, category, event_key)`,
so duplicates are short-circuited inside `sendPushToUser`.

## User controls

- Web settings page: `/notifications` (linked from main nav once
  added)
- API: `GET/POST /api/notify/prefs` accepts/returns the
  `notification_prefs` JSON blob
- Mute by category: set the boolean `false` for the matching key
- Quiet hours: `quiet_hours: true` + `quiet_start` / `quiet_end`
  (UTC integers)

## Troubleshooting

- **Permission denied on iOS** → user said no to the prompt. Send
  them to Settings → GetGuac → Notifications → Allow.
- **No tokens in `push_tokens`** → Firebase not configured (no
  google-services.json) or the user isn't signed in when init runs.
  `PushNotifications.init()` is idempotent — call it again after
  login if needed.
- **Dispatcher returns 401** → `CRON_SECRET` mismatch.
- **Send returns `dead`** → token belonged to a reinstalled or
  uninstalled app; the sender automatically prunes them.
