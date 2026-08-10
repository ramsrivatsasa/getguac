# open_ai_getguac Agent Instructions

Retention key: `open_ai_getguac_design`

Agent profile: `open_ai/agents/getguac-design-agent.md`

Project memory: `open_ai/memories/getguac-design-memory.md`

These instructions apply to the entire GetGuac repository.

## Required UI workflow

1. Read `web/docs/DESIGN_GUIDELINES.md` before changing any public-facing UI.
2. Inspect the current page, relevant existing components, and every proposed image before editing.
3. Reuse approved GetGuac components and assets. Do not recreate an existing pattern.
4. Make only the change the user requested. Do not add speculative sections, copy, features, or redesigns.
5. Keep pages concise. Remove repetition before adding more content.
6. Verify that every screenshot matches the feature and text beside it.
7. Test desktop and mobile layouts and check for browser errors before reporting completion.
8. Keep progress messages and tool output brief. Do not repeatedly ask permission for safe local work.
9. Never request approvals from the owner. Skip actions that require elevation and report the limitation briefly.
10. Minimize token usage: avoid unnecessary tools, repeated checks, speculative changes, and repeated explanations.
11. Treat owner corrections as durable lessons: update `open_ai/memories/getguac-design-memory.md` and do not repeat recorded mistakes.
12. The `open_ai_getguac_design` agent uses port `3000`. Other agents must use separate worktrees and different ports.

## Change safety

- Preserve existing user changes and create a backup before replacing a full page.
- Never deploy, push, or publish unless explicitly requested.
- Use local preview URLs for review.
- If uncertain about a design choice, inspect the repository for an established pattern before inventing one.
