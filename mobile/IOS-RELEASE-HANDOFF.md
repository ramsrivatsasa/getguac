# iOS release handoff (do this on your Mac)

Generated 2026-07-16. Windows can't build/sign/upload iOS — these steps run on
your Mac. Android AAB was built separately on Windows (see bottom).

---

## 0. First, the thing that surprises people

**The games "Sign in" fix and the receipts-leak fix are ALREADY on iOS.**
Games is a WebView (`WebAppScreen(path: '/games')`) and the receipts fix was a
database (RLS) change — both reached the *installed* TestFlight/App Store build
the moment the web deploy went live. **You do NOT need a new iOS binary to ship
those two fixes.**

Do a new iOS build (216) only if you want to:
- advance the stalled App Store **v0.4.20 submission** (metadata/review), or
- ship a **native** change (something not rendered through the WebView).

If neither applies, you can stop here.

---

## 1. ⚠️ Do NOT touch the Windows pbxproj on your Mac

- The Windows working copy of `ios/Runner.xcodeproj/project.pbxproj` is the
  **wrong/old one**: `app.getguac.getguac` + Automatic signing. That combo was
  abandoned (stuck on the free Personal Team).
- Your **Mac's local, uncommitted** `project.pbxproj` is the correct one:
  bundle `com.yathis.getguac`, **Manual** signing, Distribution cert +
  "GetGuac App Store" provisioning profile.
- When you `git pull`, if git tries to change `project.pbxproj`, **keep your Mac
  copy** (`git checkout -- ios/Runner.xcodeproj/project.pbxproj` after pull, or
  stash it first). Never overwrite it with the committed/Windows version or the
  build breaks.

## 2. Pull the latest code (web/lib only)

```sh
cd ~/…/getguac
git stash push -- mobile/ios/Runner.xcodeproj/project.pbxproj   # protect Mac signing
git pull origin main
git stash pop                                                    # restore Mac signing
```

Nothing in the commit I just pushed (`c119681`) touches iOS native code — it's
web + a SQL migration — so this pull is safe. `flutter pub get` after:

```sh
cd mobile
flutter pub get
```

## 3. Version / build number

`pubspec.yaml` is already at **`0.4.20+216`**. Build **215** was already
uploaded to TestFlight (2026-07-14) — **do not re-submit 215**, ship **216**.
If ASC rejects 216 as duplicate, bump to `0.4.20+217` in pubspec and rebuild.

## 4. Build + upload

```sh
# From mobile/
flutter build ipa --release
# → build/ios/archive/Runner.xcarchive and build/ios/ipa/*.ipa
```

Then upload the `.ipa` with **Transporter** (App Store Connect app) or
Xcode → Organizer → Distribute App. Manual signing means Xcode should pick the
Distribution cert + "GetGuac App Store" profile automatically from your Mac
config. If auto-signing errors reappear, that's the known unfixable path —
stay on **Manual**.

## 5. App Store Connect (finish the v0.4.20 submission)

Still-pending metadata from before:
- Category, Content Rights, **Pricing = Free**, App Privacy answers
- Version page: screenshots (fresh Games + Guac AI shots were wanted),
  description, **select build 216**, demo login `demo@getguac.app` / `Guac!Demo2026`
- Age rating → **Add for Review** → **Submit**

## 6. Sanity gotchas (from prior releases)

- AdMob iOS ids are already wired.
- Don't "fix" signing to Automatic — Manual is intentional.
- Commit the Mac's `project.pbxproj` **from the Mac** once stable, so future
  rebuilds don't lose the bundle+signing. (It's been living uncommitted.)

---

## Android (built on Windows this session)

Signed release AAB built with the upload key (`app.getguac.getguac`, version
`0.4.20+216`). Output + Play upload steps are in the chat / build log. Upload it
to the Play Console (Internal testing → Production) yourself — Windows has the
build but not your Play Console session.
