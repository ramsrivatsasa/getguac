# open_ai_getguac Design Guidelines

Retention key: `open_ai_getguac_design`

This file records the approved design direction for GetGuac. Read it before UI work.

## Design character

- Clean, warm, confident, and human.
- Spacious without creating unnecessarily long pages.
- GetGuac green, lime, cream, white, and deep ink are the primary palette.
- Use strong Bricolage-style display headings and readable supporting copy.
- Prefer real product proof over decorative marketing claims.

## Page structure

- Lead with one clear hero message, one supporting paragraph, and focused actions.
- Avoid repeating the same promise in statistic cards or consecutive sections.
- Use a table of contents for long guides.
- Use progressive disclosure for large feature catalogs: tabs, accordions, or one selected preview.
- Keep onboarding steps separate from advanced feature discovery.
- Link to the existing How It Works experience instead of embedding redundant long presentations.

## Approved components

- Use `src/components/ReceiptFlow.jsx` with `variant="story"` for the interactive GetGuac journey. This is preferred over a compressed circular diagram.
- Use `src/components/ReceiptCircle.jsx` only where the available width comfortably supports it.
- Reuse `MarketingShell` for public marketing pages.
- Reuse existing button classes such as `btn-primary` and `btn-secondary`.
- Reuse the project zoom behavior for screenshots; web and mobile app images should be large and click-to-zoom when UI detail matters.

## Images and product accuracy

- Inspect each image before placing it. Filename assumptions are not sufficient.
- The visual must match the adjacent feature and copy.
- `/home/goals/phone-receipts.webp` represents mobile receipts.
- `/home/goals/phone-guac-ai.webp` represents Guac AI chat and must not be presented as the receipt page.
- Prefer paired web and mobile screens when demonstrating cross-platform functionality.
- Use lifestyle photography when it strengthens the human outcome, not as filler.
- Do not stretch, crop, or shrink app screenshots until their UI becomes misleading or illegible.

## Content rules

- GetGuac is broader than receipt scanning. Relevant product coverage includes receipt capture, email receipts, statements, Guac AI, categories, reports, Worth-It, GuacScore, subscriptions, GuacWizard bank bites, returns, Stash, Smashlist, Steals, Marketplace, bills, GuacMoney, Car Miles, tax reporting, games, privacy, and data control.
- Keep the primary onboarding path simple even when all features are listed elsewhere.
- Do not imply bank linking is required.
- Do not invent unshipped functionality or unsupported claims.
- Use concise, practical language focused on what the user can do and why it matters.

## Interaction and responsiveness

- Interactive slides should use stable dimensions and manual controls unless autoplay is explicitly requested.
- Do not place a wide component inside a shrink-wrapped flex container.
- On mobile, stack content clearly and prevent horizontal overflow.
- Maintain keyboard access, visible focus states, meaningful alternative text, and Escape-to-close behavior for dialogs.

## Verification checklist

- Confirm the local route returns HTTP 200.
- Inspect the rendered desktop page.
- Inspect the mobile layout.
- Check browser console errors.
- Test interactive controls and zoom behavior.
- Confirm every image matches its label and surrounding copy.
- Confirm no duplicate or hidden legacy sections remain in the rendered structure.
- Report only verified results.

## Working style

- Make the smallest correct change.
- Inspect first, edit second, verify third.
- Avoid costly trial-and-error edits.
- Keep updates concise and do not narrate routine implementation details.
