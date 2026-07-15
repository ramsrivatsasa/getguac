# Social login (Google + Apple) — setup & config checklist

The **code** for Google + Apple sign-in is done (branch `feat/social-login`):

- `lib/providers/auth_provider.dart` → `signInWithGoogle()`, `signInWithApple()`
- `lib/widgets/social_auth_buttons.dart` → the buttons (Apple shows on iOS only)
- Wired into `login_screen.dart` and `register_screen.dart`
- `pubspec.yaml` → `google_sign_in ^6.2.2`, `sign_in_with_apple ^6.1.4`, `crypto ^3.0.3`

But it **cannot function until the config below is done** — none of it is doable from
the Windows dev box, and the iOS half needs a Mac + Xcode. Until then the buttons
render but a tap shows "social sign-in isn't available yet — use email for now".

> Do this as **v0.4.21**, *after* the current 215/216 App Store submission ships.
> Adding Sign in with Apple pulls in an Xcode entitlement + review surface — don't
> mix it into the in-flight build.

---

## 1. Supabase dashboard (Authentication → Providers)

- **Google**: enable. Paste the **Web** OAuth client ID + secret (from step 2).
  Already used by the web app, so this may already be on — confirm.
- **Apple**: enable. Paste the **Services ID**, **Team ID**, **Key ID**, and the
  `.p8` key contents (from step 3).
- Note the Supabase callback URL shown there:
  `https://qchkwojgvfhlbdtpzzig.supabase.co/auth/v1/callback` — you'll register it
  with Google and Apple below.

## 2. Google Cloud Console (one project, three OAuth clients)

APIs & Services → Credentials → Create OAuth client ID:

1. **Web** client → its ID goes into Supabase (step 1) **and** into the app build as
   `GOOGLE_WEB_CLIENT_ID` (this is the `serverClientId` the ID token is minted for).
   Authorized redirect URI = the Supabase callback URL above.
2. **iOS** client → bundle ID must match the App Store bundle
   (`com.yathis.getguac` per the current signing — verify against `project.pbxproj`).
   Its ID goes into the build as `GOOGLE_IOS_CLIENT_ID`, and its **reversed** client
   ID goes into `Info.plist` (step 4a).
3. **Android** client → register the app's **SHA-1** (debug *and* release/Play-signing
   keys). No client ID needed in code — Android resolves it via the SHA.

## 3. Apple Developer (developer.apple.com)

1. Certificates, IDs & Profiles → **App ID** `com.yathis.getguac` → enable the
   **Sign in with Apple** capability.
2. Create a **Services ID** (e.g. `com.yathis.getguac.signin`) → configure Sign in
   with Apple → add the domain `qchkwojgvfhlbdtpzzig.supabase.co` and the return URL
   = the Supabase callback URL.
3. Keys → create a key with **Sign in with Apple** enabled → download the `.p8`.
   Record the **Key ID** and your **Team ID** → all three go into Supabase (step 1).

## 4. Native config (needs a Mac / Xcode for iOS)

**4a. iOS — `mobile/ios/Runner/Info.plist`**: add the Google reversed client ID URL
scheme (there are currently no URL schemes):

```xml
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLSchemes</key>
    <array>
      <!-- REVERSED iOS client ID, e.g. com.googleusercontent.apps.123-abc -->
      <string>com.googleusercontent.apps.YOUR_IOS_CLIENT_ID</string>
    </array>
  </dict>
</array>
```

**4b. iOS — Sign in with Apple capability** (Xcode): select the Runner target →
Signing & Capabilities → **+ Capability → Sign in with Apple**. This writes
`Runner.entitlements` (`com.apple.developer.applesignin = Default`). Commit it
*from the Mac* (same caveat as the signing changes in `project.pbxproj`).

**4c. Android**: nothing in the manifest — just the SHA-1 registration in step 2.3.
(Apple on Android, if ever wanted, would use the web-redirect flow; not needed now.)

## 5. Build with the client IDs injected

```
flutter build ipa \
  --dart-define=GOOGLE_IOS_CLIENT_ID=YOUR_IOS_CLIENT_ID.apps.googleusercontent.com \
  --dart-define=GOOGLE_WEB_CLIENT_ID=YOUR_WEB_CLIENT_ID.apps.googleusercontent.com
# same two --dart-define flags for `flutter build appbundle` (Android)
```

Consider putting these in the Codemagic/CI config so releases always carry them.

## 6. Verify (on device)

- Google: tap "Continue with Google" → account chooser → lands on `/dashboard`;
  a new `auth.users` row + `profiles` row appears.
- Apple (iOS): tap the Apple button → Face ID/Apple sheet → `/dashboard`. On the
  **first** sign-in Apple sends the name once — confirm `first_name`/`last_name`
  get set (the code calls `updateUser` with them).
- Cancel flows: dismissing either chooser returns to the login screen with no error.

---

## Optional — Apple button on the **web** too (parity)

The web already has Google (`web/src/app/(auth)/login/page.jsx` +
`register/page.jsx`, via `signInWithOAuth({provider:'google'})` → `/auth/callback`).
Apple on the web is **not** required by Apple's rules (that's an iOS-app rule), but
for parity you can mirror the Google handler with `provider: 'apple'` once the Apple
provider is enabled in Supabase (step 1). Don't ship the web Apple button before the
provider is live — it would be a dead button in production.
