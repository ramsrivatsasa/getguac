# GetGuac — Apple App Store submission checklist

Status as of 2026-07-05. Bundle id `app.getguac.getguac`, deploy target iOS 13,
Flutter 3.44.x with SPM disabled (CocoaPods only — do NOT re-enable SPM, see
pubspec.yaml). iOS builds run on the MacBook Air; the Podfile is generated
there and not committed.

## Code readiness (done on Windows, ships with the repo)

- [x] Registration works in-app again — Turnstile CAPTCHA webview step
      (`lib/widgets/turnstile_check.dart` + web `/turnstile-embed`, v0.4.16).
- [x] WebView screens no longer eject iOS users to Safari for iframe loads
      (`web_app_screen.dart` main-frame-only navigation intercept). This is
      the prime suspect for the "Steals opens an ad" report — retest on the
      iPhone; if it persists, check `audit_log` (action=debug_log,
      tag=webview-nav) for the exact bounced URL.
- [x] Self-updater never offers APKs on iOS (`!Platform.isAndroid` guard).
- [x] In-app account + data deletion (App Review requires it) — top-bar
      Delete on every screen.
- [x] No third-party sign-in in the native app (email only), so the
      "Sign in with Apple" rule (4.8) does not apply. Keep it that way, or
      add Apple sign-in the moment Google login lands in the app.

## User to-dos, in order

### 1. Apple Developer Program (blocks everything else)
- Enroll at https://developer.apple.com/programs/enroll/ with your Apple ID
  ($99/yr). Enrolling as an organization (Yathis) needs a D-U-N-S number and
  takes days–weeks; enrolling as an individual is near-instant but the store
  shows your personal name as seller. Pick deliberately — switching later is
  a support ticket.
- After approval, sign into App Store Connect (https://appstoreconnect.apple.com).

### 2. AdMob iOS app id (before the release build)
- AdMob console → Apps → Add app → iOS → "GetGuac" (can be registered before
  it's live on the store).
- Copy the **app id** (`ca-app-pub-…~…`) into
  `ios/Runner/Info.plist` → `GADApplicationIdentifier`
  (currently Google's TEST id `ca-app-pub-3940256099942544~1458002511`).
- Create a **Native Advanced** ad unit for iOS and paste its id
  (`ca-app-pub-…/…`) into `lib/services/ads_service.dart` →
  `iosNativeUnitId`. Until you do, release iOS builds simply show no ads
  (safe, not a blocker).

### 3. Signing + build + upload (on the Mac) — runbook

Current shipping version: **v0.4.20+214** (from `mobile/pubspec.yaml`; the iOS
build number comes from the `+214` half, and App Store Connect rejects a build
number it has already seen — bump `+N` for every re-upload).

**a. Register the app once (web, before the first upload)**
- https://developer.apple.com/account → Certificates, IDs & Profiles →
  Identifiers → **+** → App IDs → App → bundle id `app.getguac.getguac`
  (explicit, not wildcard). Capabilities: none needed beyond the defaults.
- https://appstoreconnect.apple.com → Apps → **+** → New App:
  platform iOS, name "GetGuac", primary language English (U.S.),
  bundle id `app.getguac.getguac`, SKU `getguac-ios`, full access.
  *Without this app record the upload succeeds but the build has nowhere to
  land.*

**b. Build the archive (Mac terminal, repo root)**
```sh
cd mobile
flutter clean && flutter pub get
cd ios && pod install && cd ..          # Podfile is Mac-generated, not committed
open ios/Runner.xcworkspace              # Runner target → Signing & Capabilities
                                         # → Team = Yathis Corporation, automatic
flutter build ipa --release              # ~10 min; IS_PLAY is Android-only, omit it
```

**c. Upload**
- Easiest: `open build/ios/archive/Runner.xcarchive` → Xcode **Organizer** →
  Distribute App → App Store Connect → Upload → let Xcode manage signing.
- Or CLI with an App Store Connect API key:
  `xcrun altool --upload-app -f build/ios/ipa/*.ipa -t ios --apiKey <KEY_ID> --apiIssuer <ISSUER_ID>`
- Processing takes 5–30 min, then the build appears under TestFlight.

**Known upload snags**
- *"Missing Compliance"* — fixed: `ITSAppUsesNonExemptEncryption=false` is now
  in `Info.plist` (GetGuac only uses OS-provided HTTPS, which is exempt).
- *"No profiles for 'app.getguac.getguac' were found"* — the App ID in step (a)
  wasn't created, or Xcode's Team is still Personal. Re-pick the team.
- *"The bundle version must be higher than the previously uploaded version"* —
  bump `+214` in `pubspec.yaml`, rebuild.
- *Invalid bitcode / arm64 sim slice* — `flutter build ipa` already excludes
  simulator slices; never upload an `.app` from `build/ios/iphonesimulator`.

### 4. App Store Connect listing
- Screenshots: ready-made in `web/marketing-assets/store/ios-6.7-1290x2796/`
  and `ios-6.5-1242x2688/` (9 each). Upload the 6.7" set; 6.5" covers older
  devices.
- Name "GetGuac", subtitle e.g. "Receipts, refunds & real savings".
- Category: Finance. Description: reuse the Play listing copy.
- **Age rating: answer the questionnaire honestly BUT set the 17+ / "unrestricted
  web access" flag** — the app embeds a WebView of getguac.app, and GetGuac's
  own terms require 18+. Expect App Review to ask about the age gate; the
  birth-date check at registration is the answer.
- App Privacy (nutrition labels) — collected & linked to identity:
  - Contact info: name, email, phone (optional)
  - Financial info: purchase history (receipts, bank statements)
  - User content: photos (receipt captures), customer support messages
  - Identifiers: user id
  - Location: coarse/fine, only if the user enables Car Miles
  - Tracking: **No** — AdMob is configured without ATT-based tracking; we
    request consent via UMP, not cross-app tracking. (Info.plist still has an
    NSUserTrackingUsageDescription in case Google's SDK triggers the prompt —
    if Review flags it, answer "Yes, advertising" instead.)
- Data deletion URL: point to https://getguac.app/profile (in-app deletion
  also exists — mention it in Review notes).
- Review notes: include the demo account `demo@getguac.app` / `Guac!Demo2026`
  so reviewers don't have to register (but registration DOES work in-app as
  of v0.4.16 — CAPTCHA shows a small dialog).

### 5. Before submitting
- [ ] Retest on the iPhone: register a fresh account in-app (Turnstile dialog
      appears → account created), and tap Steals from the app bar — it must
      stay in-app.
- [ ] Replace the AdMob TEST app id (step 2) — shipping the test id is fine
      for review builds but real ads need the real id.
- [ ] Share Extension (receive_sharing_intent) — optional; "share a photo to
      GetGuac" won't appear on iOS until it's added on the Mac. Not a
      submission blocker.
