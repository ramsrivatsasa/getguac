# GetGuac — Tester Bundle

Everything a beginner tester needs to validate v0.3.0 of the app, in one folder.

## What's in here

| File | What it's for |
|---|---|
| **TEST_PLAN.pdf** | Step-by-step playbook covering signup → receipts → dashboard → Smashlist → Stash → mobile → edge cases. ~25 pages, formatted for printing. Start here. |
| **TEST_PLAN.md** | The same plan in markdown — handy if you'd rather read in an editor. |
| **TEST_DATA.csv** | 100 rows — a curated minimal fixture for quick smoke tests. |
| **TEST_DATA_1000.csv** | **1000 rows** — full-volume fixture spanning ~18 months of realistic shopping cadences. Exercises subscriptions, multi-store Compare-Stores, GuacMoney, predictor, anomalies, return-window, etc. Use this for thorough testing. |
| **receipts/*.png** | **20 synthetic receipt images** in thermal-printer format. Upload via the photo-flow on web or mobile to exercise the OCR pipeline end-to-end (parse-receipt → categorize → predictor → embeddings). |
| **statements/*.pdf** | **20 synthetic credit-card statement PDFs** spanning ~20 months. Each carries random purchases + an interest charge + occasional fee + a payment. Upload via the bank-statement-import flow to exercise GuacWizard's fee/interest detection. |
| **generate_test_data.js** | Node script that regenerated TEST_DATA_1000.csv. Re-run any time. |
| **generate_receipts.js** | Node script that regenerated the 20 receipt PNGs. |
| **generate_statements.js** | Node script that regenerated the 20 statement PDFs. |
| **getguac-v0.3.0-arm64-v8a.apk** | Android release APK for v0.3.0. Sideload this onto a modern Android phone (arm64) to test the mobile app. |
| **test_plan.css** | Stylesheet used to render the PDF. Ignore unless you want to regenerate it. |

## Quick start

### 1. Sign up

Open <https://getguac.app/register> in an incognito window and create a new account using a **real** email (not a 10-minute or mailinator address — the app blocks those).

### 2. Confirm your email

Look in your inbox for the Supabase confirmation email and click the link. You'll land on the dashboard.

### 3. Importing the test data (recommended)

The fastest way to exercise every feature is to bulk-import the CSV into your account:

1. While signed in, open <https://getguac.app/admin> (admin page).
2. Scroll down to **Tester data importer**.
3. Click **Choose File** and pick `TEST_DATA.csv` from this folder.
4. Click **Import to my account**.
5. Wait ~10-30 seconds. You'll see a summary of how many receipts + items got created.
6. Visit `/dashboard` and `/shopping` and `/stash` — they should now have realistic data.

Every imported receipt is tagged `[TEST IMPORT]` internally. When you're done testing:

- Same admin page → **Clear all test data** → confirms and wipes all `[TEST IMPORT]` receipts.
- Your real receipts (if any) are untouched.

### 4. Mobile

1. Transfer `getguac-v0.3.0-arm64-v8a.apk` to your Android phone (USB, Drive, email).
2. Open the file on the phone. Allow "Install from unknown sources" if prompted.
3. Launch GetGuac and sign in with the account you created in step 1.

### 5. Run through TEST_PLAN.pdf

Open it side-by-side with the app and check off each section.

## Reporting bugs

For each issue you find, capture:

- **What you did** (which page, which button)
- **What you expected**
- **What actually happened**
- **Screenshot** (if it's a visual bug)
- **Web or Mobile** (and which OS / browser)

Group them and send back in any format — markdown, email, doc.

## Notes for whoever ships this

This whole folder is intentionally NOT in any production runtime path:

- `TEST_PLAN.*`, `TEST_DATA.csv` are static files — never read by the app.
- The `/admin` test-importer + the two routes (`/api/admin/import-test-data`, `/api/admin/clear-test-data`) are scoped to the signed-in user's own account, gated by RLS, and tagged for clean removal.

When you're done with QA:

1. Delete the **Tester data importer** section in `web/src/app/(dashboard)/admin/page.jsx`
2. Delete `web/src/app/api/admin/import-test-data/route.js`
3. Delete `web/src/app/api/admin/clear-test-data/route.js`
4. Delete this `test/` folder

Nothing else depends on any of it.
