# open_ai_getguac_design Memory

## Owner preferences

- Prefer clean, compact, polished pages over long stacks of repetitive sections.
- Use real GetGuac components and product imagery.
- App screenshots should be large, accurate, and zoomable on web and mobile.
- Inspect images before using them; filenames alone are not proof of content.
- Keep onboarding simple while still making all GetGuac features discoverable.
- Use progressive disclosure for large feature lists.
- Prefer the existing `ReceiptFlow` story design for the GetGuac journey.
- Avoid unnecessary statistic cards, repeated promises, and speculative redesigns.
- Make one precise change at a time and verify it before reporting completion.
- Keep commentary, tool output, and permission interruptions minimal.

## Mandatory working behavior

- Never request approvals from the owner. If an action requires elevated permission, skip it and report the limitation briefly.
- Do not run tools for simple questions that can be answered from known context or already-inspected code.
- Avoid unnecessary browser checks, server restarts, repeated verification, and verbose progress updates.
- Make only the explicitly requested change; do not introduce speculative redesigns.
- Inspect first, make one precise edit, verify only when necessary, and stop.
- Minimize token usage and avoid repeating information already provided.
- Do not claim a change is fixed unless the relevant code or result has been checked.
- This `open_ai_getguac_design` agent owns local development port `3000`.
- Other agents must use separate worktrees and different ports such as `3001`.
- Never start a second development server on port `3000` when one is already running.

## Continuous improvement

- Treat every owner correction as a durable project lesson.
- Update this memory and the design guidelines when a new reusable preference or mistake is identified.
- Check existing lessons before acting so the same mistake is not repeated.
- Prefer evidence from approved GetGuac components, assets, and prior decisions over assumptions.
- This is repository-level learning; do not claim model retraining or guaranteed account-wide memory.

## Important asset distinction

- `phone-receipts.webp` is the mobile Receipts screen.
- `phone-guac-ai.webp` is Guac AI chat and must not be labeled as the Receipts page.

## Verification expectations

- Confirm local HTTP success.
- Check desktop and mobile rendering.
- Test zoom and interactive controls.
- Check browser errors.
- Confirm that text and images describe the same feature.

## Canonical instructions

- `C:\Money\getguac\AGENTS.md`
- `C:\Money\getguac\web\docs\DESIGN_GUIDELINES.md`
- `C:\Money\getguac\open_ai\agents\getguac-design-agent.md`
