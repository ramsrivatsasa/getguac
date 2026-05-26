# GetGuac — iOS build notes

The Flutter project (`mobile/`) was originally Android-only. v0.2.38 added the
iOS platform scaffolding via `flutter create --platforms=ios .`, plus the
permission keys iOS App Store review requires (camera, photo library, Face ID,
share-intent doc types). The Dart code itself is already cross-platform — all
the plugins we use (`image_picker`, `local_auth`, `flutter_secure_storage`,
`supabase_flutter`, `receive_sharing_intent`, `package_info_plus`,
`shared_preferences`, `url_launcher`, `webview_flutter`, `provider`,
`go_router`, `http`, `flutter_svg`, `fl_chart`) ship iOS implementations.

## What's done in-repo

- `ios/` folder exists (40 files: Xcode project, Runner target, Pods setup,
  AppDelegate / SceneDelegate, launch screen, Assets.xcassets, etc.).
- `ios/Runner/Info.plist` has the required usage-description strings:
  - `NSCameraUsageDescription`
  - `NSPhotoLibraryUsageDescription`
  - `NSPhotoLibraryAddUsageDescription`
  - `NSFaceIDUsageDescription`
- `CFBundleDocumentTypes` declares the app accepts inbound shares of
  images / PDFs / text / URLs (needed for the Car-Miles maps-share and any
  future "share receipt to GetGuac" flow).

## What still needs a Mac

I can't produce a `.ipa` from this Windows workstation — iOS builds require
macOS + Xcode. Everything below is what you'll do on a Mac, in roughly the
order you'll need to do it:

### 1. One-time Mac setup

```bash
# Install Xcode from the Mac App Store (full IDE, ~15GB)
sudo xcode-select --install
sudo xcodebuild -license accept

# CocoaPods — used by Flutter plugins for iOS native deps
sudo gem install cocoapods

# Flutter SDK (skip if already installed)
brew install --cask flutter
flutter doctor       # follow prompts until all rows are green
```

### 2. Apple Developer account ($99/year)

1. Sign up at https://developer.apple.com/programs/
2. In Xcode → Settings → Accounts → add your Apple ID, sign in.
3. Open `mobile/ios/Runner.xcworkspace` in Xcode (NOT the `.xcodeproj`).
4. Select the `Runner` target → "Signing & Capabilities" tab.
5. Tick "Automatically manage signing" and pick your team.
6. Set a unique bundle identifier (e.g. `app.getguac.mobile`). Has to be
   globally unique on Apple's side. Whatever you pick has to match the
   App Store Connect record you create later.

### 3. First build

```bash
cd mobile
flutter pub get
cd ios && pod install && cd ..       # downloads native deps into Pods/
flutter build ios --release          # builds a release .app bundle
```

Or open `ios/Runner.xcworkspace` in Xcode and ⌘B (Product → Build).

### 4. Run on a real device

1. Plug in an iPhone via USB.
2. Trust the computer when prompted.
3. Xcode → device picker → choose the iPhone → ▶ Run.
4. On the phone: Settings → General → VPN & Device Management → trust the
   developer cert (one-time).

### 5. Ship via TestFlight (recommended over direct sideload)

1. App Store Connect → My Apps → "+" → New App. Match the bundle ID.
2. Back in Xcode → Product → Archive (target must be "Any iOS Device").
3. When the archive opens in the Organizer, click "Distribute App" →
   "App Store Connect" → "Upload".
4. Wait ~10–20 min for Apple to process the build.
5. App Store Connect → TestFlight → add testers → they install via the
   TestFlight iOS app. No App Store review needed for internal testers.

### 6. Public App Store release

When you're ready for the public store:

1. App Store Connect → App Store tab → fill in screenshots (6.7", 6.5", 5.5"),
   description, keywords, privacy policy URL, support URL.
2. Privacy: declare what data you collect. GetGuac collects:
   - email (account creation)
   - receipts + photos (user-uploaded)
   - rewards data
   - debug logs (user-scoped, opt-out via Diagnose dialog)
   Mark each as "Linked to user" / "Used for app functionality".
3. Submit for review. Apple usually responds within 24h.

## Known gotchas to watch for

- **`receive_sharing_intent` on iOS** needs a Share Extension target in
  Xcode. The plugin's README has the steps. Without it, "Share to GetGuac"
  from other apps won't work.
- **`local_auth` Face ID** needs the `NSFaceIDUsageDescription` key (already
  added) AND you have to call `setIOSAuthMessages` if you want to customize
  the prompt — current code uses the default which is fine.
- **`flutter_secure_storage` on iOS** stores in the Keychain. Unlike Android,
  Keychain is NOT wiped on reinstall — biometric credentials should survive
  installs cleanly, fixing the recurring "creds wiped after upgrade" bug we
  see on Android with the debug keystore.
- **`image_picker` PHPickerViewController** (iOS 14+) doesn't need photo
  library permission at all for "pick" operations, but the
  `NSPhotoLibraryUsageDescription` key is still required by App Store review.
- **`webview_flutter`** uses `WKWebView` on iOS — fine, but any custom JS
  bridges would need iOS-specific work.

## Version bump for first iOS release

When the iOS build is ready, bump `pubspec.yaml` version to `0.3.0+50` and
ship the same APK + new IPA together. The login-screen footer already shows
the version, so users can tell what they have.
