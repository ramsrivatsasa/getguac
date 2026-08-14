# Android release gate

Android publishing is blocked until both automated CI and the physical-device
checks below pass for the exact tagged commit.

## Automated gates

- Formatting check
- `flutter analyze --fatal-infos`
- Complete unit and widget test suite
- Universal release APK build
- Release APK installation and cold launch on an Android 15 emulator
- Visible login/welcome UI assertion
- Android log assertion with no GetGuac fatal exception
- Split-per-ABI release builds
- Release signing with the configured Android upload key; missing secrets fail the workflow

## Required physical-device checks

- Register a new account and confirm its email.
- Verify duplicate/pending usernames are rejected.
- Sign in, sign out, and use the demo account.
- Request a password reset and finish it from the email link.
- Capture, review, save, reopen, and delete a receipt.
- Parse a voice receipt while signed in; verify signed-out requests are rejected.
- Open every embedded GetGuac route and confirm external/lookalike hosts leave the WebView.
- Open retailer preview, confirm non-Amazon navigation is blocked, then leave and verify the retailer session is cleared.
- Deny and grant camera, microphone, notification, and location permissions.
- Test offline launch, slow network, background/resume, and process restart.
- Confirm no secrets or authentication tokens appear in URLs, screenshots, or logs.

Only after recording a pass for this exact commit may the `Release APK`
workflow be dispatched with `manual_device_tests_passed` enabled.
