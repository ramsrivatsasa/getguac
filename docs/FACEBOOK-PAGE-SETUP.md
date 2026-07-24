# GetGuac — Facebook Page setup

Everything needed to create the Page. **You have to do the actual creation
yourself** — it requires being logged into your Facebook account. This doc is
the copy/paste kit so it takes ~5 minutes.

---

## 1. Assets (already generated)

Two generators, both writing to `web/marketing-assets/fb/page/`:

- `node web/scripts/fb-page-assets.mjs` — profile picture (from the store app icon)
- `node web/scripts/fb-cover-hero.mjs` — cover, screenshotted from the **live
  homepage hero** on getguac.app, so the Page matches the site (real
  Bricolage/Jakarta type + the live `HeroScoreCard` mockup). Needs network.

Then upload:

| File | Where it goes |
|---|---|
| `profile-1080x1080.png` | Profile picture — the store app icon, so the Page matches the App Store / Play listing. Verified to survive FB's circle crop down to the 40px feed size |
| `cover-1640x624.png` | Cover photo — the homepage hero: headline, tagline, both store badges, GuacScore card, `getguac.app` footer |
| `cover-1640x624-GUIDES.png` | **Do not upload.** Reference only — shows the mobile crop + profile-picture overlap zones |

Why 1640×624: Facebook renders the cover at 820×312 on desktop but crops the
*sides* on mobile, and the profile picture sits on top of the bottom-left
(desktop) / bottom-centre (mobile). The generated cover keeps all text inside
both safe zones.

---

## 2. Create the Page

`facebook.com/pages/create` → **Business or brand**.

| Field | Value |
|---|---|
| **Page name** | `GetGuac` |
| **Category** | `App Page` (add `Finance` / `Software` as secondary if offered) |
| **Username** | ✅ **DONE — `GetGuacApp` → `facebook.com/GetGuacApp`.** `getguac` was already taken (Facebook usernames share one namespace across Pages *and* personal profiles, and you cannot check availability while logged out — a free name and a name held by a personal profile look identical). Wired into `MarketingFooter.jsx` as `FACEBOOK_URL` |
| **Website** | `https://getguac.app` |
| **Email** | `admin@getguac.app` |
| **Call-to-action button** | **Use app** → `https://getguac.app/download` (falls back to **Learn more** → `https://getguac.app`) |

### Bio (255-char limit)

```
Free AI receipt scanner & spending tracker. Snap a receipt, see where every
dollar goes, catch hidden subscriptions, and never miss a refund. No bank
login required. iOS, Android & web — 100% free.
```

### About / description

```
GetGuac is a free AI receipt scanner and spending tracker.

Snap a photo of a receipt — or forward the emailed one — and GetGuac reads
it, files it, and shows you where your money is actually going. It flags
subscriptions you forgot about, tracks returns and refunds so you never miss
a window, and keeps a running Smashlist of what you buy again.

No bank login required. No cashback gimmicks.

Free on iOS, Android and the web:
• iOS — https://apps.apple.com/us/app/getguac/id6790993237
• Android — https://play.google.com/store/apps/details?id=app.getguac.getguac
• Web — https://getguac.app
```

---

## 3. First posts

Creatives already exist in `web/marketing-assets/fb/feed-1080x1080/`:
`receipts.png`, `dashboard.png`, `dashboard-bars.png`, `smashlist.png`,
`steals.png`, `steals-cards.png`, `guacmoney.png`.

1. **Launch** — `dashboard.png`. "GetGuac is live on iOS and Android." + both store links. Pin this one.
2. **Scan** — `receipts.png`. Snap a receipt, it files itself.
3. **Where it goes** — `dashboard-bars.png`. Spending broken down by category.
4. **Smashlist** — `smashlist.png`. What you buy again, ready before the trip.
5. **Steals** — `steals.png`. Price checks across stores.

### Copy rules (carried over from the site)

- **Capability claims only.** "Catches subscriptions", "tracks refunds" — fine.
  Do **not** invent outcome numbers ("users save 23%"); there's no survey behind them.
- **Never say "redeem"** about GuacMoney. It is a *value* indicator
  (1000 GM = $1 in value), not a redeemable currency.
- Avoid competitor vocabulary — no "streak", "points", "fetch". The house words
  are Smashlist, Smash days, smash.

---

## 4. After it exists

- [ ] Add the Page link to the site footer + app About screen.
- [ ] Set the Page to **Published** (new Pages default to unpublished while you edit).
- [ ] If you plan to run ads: create a **Meta Business Manager**, claim the Page in it,
      then build the ad account there. The 21 ad creatives in
      `web/marketing-assets/fb/` are already sized for feed/stories/link.
- [ ] A Page is also what Meta requires to run Instagram ads from the same account.
