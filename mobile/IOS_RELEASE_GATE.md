# iOS release gate

Do not upload a build to TestFlight or App Store Connect until every automated
gate is green and the physical-device attestation has been completed.

## Automated gates

- Dart formatting, static analysis, and all unit/widget tests pass.
- CocoaPods resolves from the committed `ios/Podfile`.
- `Info.plist`, entitlements, and `PrivacyInfo.xcprivacy` validate with `plutil`.
- A release iOS simulator build cold-launches and shows GetGuac's login/welcome UI.
- A signed IPA archive is created with the App Store provisioning profile.
- The signed archive contains the privacy manifest and production entitlements.

## Physical iPhone checklist

- Register, confirm email, reject a duplicate username, sign in, demo sign in,
  sign out, and reset a forgotten password.
- Capture a receipt with the camera, select one from Photos, parse it, reopen it,
  retry an interrupted upload, and delete it.
- Verify Face ID opt-in, successful unlock, fallback, cancellation, and logout
  cleanup. Confirm no password or token appears in logs.
- Verify voice capture permission denial/acceptance and signed-in/signed-out use.
- Verify push permission denial/acceptance, foreground/background/terminated
  delivery, notification tap routing, and token removal on logout.
- Verify embedded GetGuac pages, CAPTCHA, external-link handoff, retailer HTTPS
  host restrictions, lookalike-host rejection, and retailer cookie cleanup.
- Verify location, camera, microphone, speech, Photos, tracking, and notification
  permission descriptions and recovery from denial in Settings.
- Verify offline, slow-network, background/resume, interrupted uploads, Dynamic
  Type, VoiceOver labels, landscape, and the smallest supported iPhone layout.
- Confirm the App Store privacy answers, account-deletion path, support URL,
  screenshots, version/build number, and release notes match the submitted build.

Record the tested iPhone model, iOS version, build number, tester, and date before
dispatching the App Store release workflow.
