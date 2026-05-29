# GetGuac — Beginner Tester Guide

> A step-by-step playbook for testing every user-facing feature on both web
> ([getguac.app](https://getguac.app)) and the Android app. No prior testing
> experience required.

**Last updated:** v0.3.0 (2026-05-29) · **Estimated time to run end-to-end:** 60-90 minutes

---

## Before you start

### What you'll need

1. **A real email inbox** — Gmail, Outlook, iCloud, anything you can read. Do NOT use a throwaway email service (the app blocks those on purpose).
2. **At least 3 paper receipts** — recent grocery receipts work best. Take photos of the front of each receipt in good light, ready to upload.
3. **Web browser** — Chrome, Edge, or Firefox on desktop. Safari + iOS Safari for the mobile-web sanity check.
4. **Android phone** — install the latest APK from [github.com/ramsrivatsasa/getguac/releases](https://github.com/ramsrivatsasa/getguac/releases/latest). Look for **app-arm64-v8a-release.apk** (most modern phones) or **app-armeabi-v7a-release.apk** (older Android).
5. **A scratchpad** — paper or a note app. You'll be writing down anything that looks wrong, screenshots help.

### How to file a bug

For each issue, write down:

| Field | Example |
|---|---|
| What you did | "Tapped Auto-Add → Cheapest store on Smashlist" |
| What you expected | "Confetti + toast saying 'Added 5/5 via cheapest store ✓'" |
| What actually happened | "Toast showed but no confetti animation" |
| Screenshot? | Yes / No (attach if yes) |
| Web or Mobile | Web (Chrome on Windows 11) |

---

## Section 1 — Signup (web only)

### 1.1 — Create a new account

1. Open **[getguac.app](https://getguac.app)** in a private/incognito window.
2. Click **Sign Up** in the header (or open `/register` directly).
3. Fill in:
   - **Username** — your choice, lowercase letters/numbers. Watch the field — it should show a green check when available.
   - **First name / Last name** — your real name (or a fake one — both work).
   - **Email** — your real inbox. **Do not** use 10minutemail / mailinator / etc. The app should reject those.
   - **Password** — at least 8 chars, mix letters + numbers.
   - **Confirm password** — same as above.
   - Accept the terms checkbox.
4. If a CAPTCHA appears, complete it. (It might be invisible — Cloudflare Turnstile usually verifies silently.)
5. Tap **Create Account**.

✅ **Expected:** A "Check your inbox" panel appears with the email address you typed. **No** automatic redirect to the dashboard.

### 1.2 — Confirm the email

1. Open your inbox in a new tab.
2. Look for an email from `noreply@mail.app.supabase.io` (or similar). Subject usually says "Confirm Your Signup" or "Welcome".
3. Click the confirmation link inside the email.

✅ **Expected:** Browser opens `getguac.app/auth/confirm`, signs you in, and lands on the **Dashboard**.

### 1.3 — Test the bot rejection paths

Open a **new** incognito window for each test. Each should show a clear error toast, no account creation.

| Test | What to do | Expected error |
|---|---|---|
| **Disposable email** | Register with `test@10minutemail.com` | "Please use a permanent email address" |
| **Reused username** | Try the username you just registered | "That username is already taken" |
| **Weak password** | Try password `12345` | "Password too weak / too short" |
| **Rate-limit** | Submit the form 6 times in 60 seconds with different emails | After ~5 attempts: "Too many sign-up attempts" |

If any of these go through anyway → file a bug.

---

## Section 2 — Receipts (web)

### 2.1 — Upload a paper receipt via photo

1. Sign in to [getguac.app](https://getguac.app).
2. Click **Receipts** in the left sidebar.
3. Click the **+ Add Receipt** or **Upload Photo** button.
4. Select a clear photo of your real receipt.
5. Wait for parsing (15-30 seconds usually).

✅ **Expected:** New receipt appears at the top of the list with the right store name, total, and date. Open it — line items should be there.

🐛 **Bug if:** Store name is wrong / blank, total is `$0.00`, no line items, or page errors.

### 2.2 — Forward a receipt by email

1. Click **Profile** in the sidebar → find your **GetGuac inbox address** (looks like `yourusername@getguac.app`).
2. From your real inbox, forward an order-confirmation email (Amazon order, DoorDash receipt, Costco online order — anything) to that GetGuac address.
3. Wait up to 10 minutes.
4. Refresh the Receipts page.

✅ **Expected:** A new receipt parsed from your forwarded email appears.

🐛 **Bug if:** The receipt never shows up after 15 minutes.

### 2.3 — Bulk upload (3+ at once)

1. On the Receipts page, click **Upload Photo**.
2. Select 3 receipts at once.
3. Wait for all to finish.

✅ **Expected:** All 3 appear within ~1 minute. Counter at the top updates.

---

## Section 3 — Dashboard (web)

After uploading at least 5 receipts, visit `/dashboard`.

### 3.1 — Stat tiles

Count the tiles. There should be **8** (web) arranged in a row that wraps:

1. **GuacScore** — circular gauge
2. **GuacWizard 🧙‍♂️** — number `/ 100` (or "Set up →" if you have no bank data yet)
3. **Transactions** — count
4. **Total Spent** — `$X.XX` + maybe a trend chip
5. **Tax Paid** — `$X.XX`
6. **Bank Fees** — `$X.XX` (probably `$0.00` for you)
7. **Rewards** — count of loyalty rewards
8. **GuacMoney 🥑** — `$0.00 · tap Cheapest` if you haven't used Auto-Add yet
9. **Smash days 🔥** — count of consecutive days you've scanned

✅ **Expected:** Region flag `🇺🇸 US` appears in the top-right header.

🐛 **Bug if:** Any tile is missing or shows "NaN", "undefined", or a broken icon.

### 3.2 — Bank summary row

Only renders if you've imported a bank statement.

If yes → 5 tiles below the main stat row: **Payments made / Interest paid / Fees paid / Purchases / Refunds**.

If no → row is hidden (correct behavior, not a bug).

### 3.3 — Spending chart

Scroll past the stat tiles.

✅ **Expected:** A bar chart titled **Spending by Store** with up to 8 bars. Each bar should be tappable and open the Receipts page filtered to that store.

### 3.4 — Recent activity feed

Scroll all the way to the bottom of the dashboard.

✅ **Expected:** A "Recent activity" list with the last ~10 receipts + any Smashlist items you've added. Each row should have a store icon and an amount.

---

## Section 4 — Smashlist (web)

Visit `/shopping`.

### 4.1 — Buy Again predictions

If you have 3+ weeks of receipts with overlapping items (e.g., milk, eggs), you should see **Buy Again** cards at the top.

If empty → click **Refresh list** (top-right). Wait 30 seconds.

### 4.2 — Add to Smashlist

1. On any Buy Again card, tap the **green ⊕ Add** button.

✅ **Expected:** Toast says "Added to Pantry ✓". Card disappears from Buy Again, appears in **Your Smashlist** below.

### 4.3 — Auto-Add → Cheapest store (the GuacMoney flow)

1. With 2+ items in Buy Again, click **Auto-Add** in the header.
2. From the dropdown, pick **💰 Cheapest store**.

✅ **Expected:** 
- Toast says "Added N/N via cheapest store ✓ · +$X.XX GuacMoney 🥑"
- Confetti animation fires
- The GuacMoney tile on the dashboard will tick up next time you visit

🐛 **Bug if:** No confetti, no GuacMoney message, or the tile doesn't update.

### 4.4 — Per-card Share button

1. On any Buy Again card, click the small **share icon** (next to the Add button).
2. From the dropdown, pick **Copy link**.

✅ **Expected:** Toast says "Link copied 🔗". Paste it in your browser URL bar — should open a share-landing page in a new tab with the product details. Should NOT trigger a Google search.

### 4.5 — Per-card checkbox + Send to store

1. Tick the checkbox on 2-3 Buy Again cards.
2. A sticky bar appears at top: "N selected · Send to: [dropdown]"
3. Pick a store from the dropdown.

✅ **Expected:** Those items get added with that store tagged. Sticky bar disappears.

🐛 **Bug if:** Dropdown is empty when it should have options, or items don't appear in the picked store's group below.

### 4.6 — Smart delete

1. In **Your Smashlist** below, click the trash icon on any **Predicted** item (purple chip).

✅ **Expected:** Item goes BACK to Buy Again above (not deleted permanently). Toast says "Sent back to Buy Again ↩".

### 4.7 — Top-level Share

1. Header → **Share** dropdown → pick **Email**.

✅ **Expected:** Mail app opens with subject "Check this deal out on GetGuac" and body containing your list + a `/share/<token>` URL. The URL should open in any browser without login.

---

## Section 5 — Stash (web)

Visit `/stash`.

### 5.1 — Product cards

✅ **Expected:** Each unique item you've bought shows as a card. Card avatar should be the **store's brand favicon** (not a generic emoji) for known stores like Costco/Walmart/Target.

🐛 **Bug if:** All avatars are emojis — means the favicon API is failing.

### 5.2 — 5-star rater + GuacScore impact

1. On any card, hover over the stars. Watch the chip on the right.

✅ **Expected:** Chip shows "GuacScore +5 / +2 / 0 / −2 / −5" as you hover from 5 stars down to 1.

2. Click 5 stars on something you actually like (e.g., a brand of coffee).

✅ **Expected:** Toast says "Worth it ⭐ — GuacScore +5". Refresh and you'll see the rating persisted (stars are colored).

### 5.3 — Audit chips

Some cards should show small colored chips above the price tiles:

- **💸 Top spender** (top 10% by total spend)
- **↩ Returnable Nd** (sky-blue, or amber if ≤ 7 days)
- **🛡 Warranty** (only on big-ticket items with warranty info)

If none of your items qualify, no chips render (correct).

### 5.4 — On-hand inventory stepper

1. Find a grocery item. Look below the rating row.
2. Tap the **+** button 3 times.

✅ **Expected:** The number "0" turns to "3" and color shifts to emerald. If you have enough buy history, a subtitle appears like "~21d on hand".

3. Tap **−** all the way back to 0.

✅ **Expected:** Number turns rose, an "🛑 Out of stock" chip appears in the audit row.

### 5.5 — Per-item Share

1. On any Stash card, tap the **share button** (sky-emerald gradient circle in the footer).
2. Pick **WhatsApp** (if installed) or **Copy link**.

✅ **Expected:** Same behavior as the Buy Again share — token URL that opens a public landing page.

### 5.6 — Share landing page (recipient view)

After copying a share link, open it in an incognito window.

✅ **Expected:** Page renders WITHOUT requiring login. Should have:
- The sharer's name ("Ramya shared a product with you 💌")
- Social-proof chips (Smash days / GuacMoney) if data exists
- The product card with price + store
- **Rating Wizard** chip if 2+ users have rated this item
- A green "Watch how GetGuac works" card with a play button
- A 🥑 mascot footer
- A footer "expires in 30 days"

**Tap the Play button on the Watch card** → an inline modal opens with the auto-narrated walkthrough. ESC closes.

---

## Section 6 — Mobile (Android)

### 6.1 — Install

1. On your phone, download `app-arm64-v8a-release.apk` from the [latest release](https://github.com/ramsrivatsasa/getguac/releases/latest).
2. Open the downloaded file. Allow "Install from unknown sources" if prompted.
3. Open the app.
4. Log in with the account you created in Section 1.

### 6.2 — Dashboard tiles

Tap the **Dashboard** tab.

✅ **Expected:** Same general tiles as web, in a 2×4 grid:

- Row 1: GuacScore | GuacMoney 🥑
- Row 2: Total Spent | Tax Paid
- Row 3: Transactions | Rewards
- Row 4: Smash days 🔥 | (empty)

App bar (top) shows: avocado logo → **GetGuac · MONEY'S WINGMAN** → chip with **🇺🇸 US** → chat icon.

🐛 **Bug if:** Any tile shows "—" forever (means a backend call failed; reload and try again — if it persists, file).

### 6.3 — Scan a receipt with the camera

1. Tap the camera FAB (lower-right).
2. Snap a photo of a real receipt.
3. Wait for parse.

✅ **Expected:** New receipt appears in the Receipts tab within ~30s. Smash days count on dashboard increases by 1 if you didn't already have a receipt today.

### 6.4 — Share-intent

1. From your phone's Photos / Gallery app, share a receipt photo TO the GetGuac app.

✅ **Expected:** GetGuac opens, shows the photo, parses it into a new receipt.

### 6.5 — In-app update check

1. Pull down on the dashboard to refresh.
2. If a newer release exists on GitHub, you should see an update prompt.

(With this current release we just shipped, you should NOT see a prompt unless an even-newer one exists.)

### 6.6 — Sign out + back in

1. Profile tab → Sign out.
2. Sign back in with the same credentials.

✅ **Expected:** Lands on dashboard, all your data still there.

---

## Section 7 — Edge cases + cleanup

### 7.1 — Browser back button

After signup confirm, hit browser back. Then forward.

✅ **Expected:** No crash. Either lands on the right page or shows a clean login screen.

### 7.2 — Tab the password field's eye toggle

On login + register pages, click the eye icon.

✅ **Expected:** Password becomes visible / hidden. No layout shift.

### 7.3 — Mobile rotate

Rotate your phone landscape ↔ portrait.

✅ **Expected:** Layout adapts without overflowing or breaking.

### 7.4 — Disable network mid-action

1. Open Smashlist on web.
2. Open browser DevTools → Network tab → throttle to **Offline**.
3. Try to add an item.

✅ **Expected:** A clear error toast ("Network failed" or "Add failed"), no silent failure.

### 7.5 — Delete account

(Only if you're 100% sure — this clears all your data.)

Profile → bottom of page → **Delete account**. Confirm.

✅ **Expected:** All receipts, lists, ratings gone. You're signed out.

---

## Sign-off

After running through all sections, send back:

1. **List of bugs you found** — in the format from "How to file a bug" above.
2. **Sections you couldn't complete** — and why (e.g., "No bank statement imported so 5.3 skipped").
3. **General feedback** — anything that felt slow, confusing, or great.

Thanks for testing! 🥑
