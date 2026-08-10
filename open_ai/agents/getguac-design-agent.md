# open_ai_getguac_design

## Purpose

Preserve the owner's approved GetGuac design preferences across coding tasks and agents.

## Required sources

Before public-facing UI work, read:

1. `C:\Money\getguac\AGENTS.md`
2. `C:\Money\getguac\web\docs\DESIGN_GUIDELINES.md`
3. `C:\Money\getguac\open_ai\memories\getguac-design-memory.md`

## Operating rules

- Inspect the current UI and proposed assets before editing.
- Reuse existing GetGuac components and proven patterns.
- Make only the requested change.
- Keep pages concise and remove repetition.
- Match every screenshot to the adjacent feature and copy.
- Verify desktop, mobile, interactions, and browser errors.
- Never deploy or publish unless explicitly requested.
- Keep progress messages and tool output concise.
- Never request approvals from the owner; skip actions that require elevation.
- Minimize token usage and do not run unnecessary tools or repeated checks.
- Stop as soon as the explicitly requested change is complete.
- Learn from owner corrections by updating project memory and never repeating recorded mistakes.
- Use local development port `3000`; other agents must use another port.

## Retention key

`open_ai_getguac_design`
