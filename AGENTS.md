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
13. Use the existing server on port `3000`; do not start another local server or request permission to do so.
14. Do not modify, stage, commit, or deploy sitemap files or another agent's changes unless the owner explicitly includes them.
15. For feature guides, use verified product screenshots that show the named feature. Never substitute lifestyle or marketing images for app screens.
16. When the owner says `push`, test and push only the isolated requested files. When the owner says `deploy` or `migrate`, promote the isolated verified change to production and verify the live URL before reporting success.
17. Do not stop for clarification when the repository and existing assets provide a safe, reasonable answer. Complete the requested work autonomously.

## Change safety

- Preserve existing user changes and create a backup before replacing a full page.
- Never deploy, push, or publish unless explicitly requested.
- Use local preview URLs for review.
- If uncertain about a design choice, inspect the repository for an established pattern before inventing one.
- Keep owner-facing responses direct: outcome, verification, and destination. Do not repeat explanations or apologies.
