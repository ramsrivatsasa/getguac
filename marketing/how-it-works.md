# GetGuac — "How It Works" video + screenshot script

This single file is the source of truth for **both** the narrated marketing video
and the auto-captioned screen tour. The Playwright capture script
(`web/scripts/capture-tour.mjs`) reads the **Scene table** below — the `route`
and `caption` columns must stay in sync with it.

---

## Positioning

**GetGuac turns the receipts you already collect into money back in your pocket.**
Snap a receipt, our AI reads every line, and GetGuac surfaces the savings you'd
otherwise miss — better prices, refunds you're owed, and what's worth buying again.

- **Tagline:** *Where every dollar earns its smash.*
- **Voice:** warm, confident, a little playful. Avocado/guac motif. Never "points,"
  "streaks," or "fetch" — we *smash*, we keep a *Smashlist*, money is *GuacMoney*.
- **Hero character:** the avocado **genie** (GuacWizard) — rises from a laptop,
  waves a wand, and "no sneaky fee, charge, or leak survives the spell."

---

## Video specs

| | |
|---|---|
| Length | 60–75s (hero cut), 20s (store-preview cut) |
| Aspect | 16:9 master (1920×1080) + 9:16 vertical (1080×1920) for App Store / Play / Reels |
| Music | upbeat, light, ~110–120 BPM; duck under VO |
| Captions | always on (sound-off autoplay), brand green `#059669` chip, white text |
| End card | genie + logo + "GetGuac — getguac.app" + store badges |

---

## Scene table  (drives the captured tour)

> Durations are for the narrated cut. The auto-captioned tour holds each route
> ~3s and cross-fades.

| # | Route | On-screen caption | VO line | Dur |
|---|-------|-------------------|---------|-----|
| 1 | `/` | **Stop leaving money on the table.** | "You keep every receipt. GetGuac keeps the *money*." | 4s |
| 2 | `/receipts` (camera open) | **Snap any receipt.** | "Snap a receipt — paper, email, or screenshot." | 5s |
| 3 | `/receipts` (parsing) | **AI reads every line.** | "Our AI reads every line item in seconds — no typing." | 5s |
| 4 | `/dashboard` | **Your money, scored.** | "Your GuacScore shows how smart your spending really is." | 6s |
| 5 | `/steals` | **Find the better price.** | "Steals hunts the web for a cheaper price before you buy." | 6s |
| 6 | `/shopping` (Smashlist) | **Your Smashlist.** | "GetGuac predicts what you're about to run out of — your Smashlist builds itself." | 6s |
| 7 | `/returns` | **Claw back refunds.** | "It tracks return windows and the refunds you're actually owed." | 6s |
| 8 | `/bites` | **Rate what you buy.** | "Rate the things you try — keep the wins, skip the regrets." | 5s |
| 9 | `/reports` | **Taxes, sorted.** | "Business and charity spend, export-ready at tax time." | 5s |
| 10 | `/guacwizard` | **Meet GuacWizard.** | "And the GuacWizard? One wave — no sneaky fee survives the spell." | 6s |
| 11 | `/guacanomics` | **Where every dollar earns its smash.** | "GetGuac. Where every dollar earns its smash." | 5s |
| — | end card | **GetGuac · getguac.app** | (music swell, store badges) | 4s |

**Hero cut total:** ~73s. Trim scenes 7–9 for the 20s store-preview cut
(keep 1, 2/3, 4, 5, 6, 10, 11).

---

## Voiceover — clean read (hero cut)

> You keep every receipt. GetGuac keeps the money.
> Snap a receipt — paper, email, or screenshot — and our AI reads every line in
> seconds. No typing.
> Your GuacScore shows how smart your spending really is. Steals hunts the web
> for a cheaper price before you buy, and your Smashlist builds itself from what
> you're about to run out of.
> GetGuac tracks the return windows and refunds you're owed, rates the things you
> try, and sorts your business and charity spend for tax time.
> And the GuacWizard? One wave — and no sneaky fee, charge, or leak survives the
> spell.
> GetGuac. Where every dollar earns its smash.

---

## App-store screenshot captions (1 per shot)

These are the big header lines composited above each phone screenshot
(`web/scripts/frame-screenshots.mjs`). Keep ≤5 words.

1. **Snap any receipt** — `/receipts`
2. **AI reads every line** — `/receipts` (parsing)
3. **Know your GuacScore** — `/dashboard`
4. **Find the better price** — `/steals`
5. **Your Smashlist, automatic** — `/shopping`
6. **Claw back refunds** — `/returns`
7. **Taxes, export-ready** — `/reports`
8. **Meet the GuacWizard** — `/guacwizard`

---

## Production notes

- **Auto-captioned tour** (ships now): `capture-tour.mjs` records the live tour
  with these captions burned in. Use as the working draft + the silent
  autoplay loop on the landing page.
- **Narrated cut** (upgrade): record the VO above over the same captured clips;
  add music + end card in any editor (CapCut / Premiere / DaVinci). The scene
  table is the edit decision list.
- **Vertical (9:16):** the capture script also outputs phone-viewport clips, so
  the vertical cut reuses the same takes.
