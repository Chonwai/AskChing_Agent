# AskChing Handoff

## Current checkpoint

Tasks 1–4 are implemented on `main`. The MCP stdio server registers `compare_markets`, `research_brief`, and `risk_scan`; `compare_markets` is the completed end-to-end slice, while the latter two return explicit errors rather than invented analysis. Commits already present: `88eaf4e` (design/plan), `eb4c87e` (scaffold), `58dbf24` (comparison contract), and `edc8a9a` (Graph sources).

## Source of truth

- Design: `docs/superpowers/specs/2026-09-08-askching-bootstrap-design.md`
- Plan: `docs/superpowers/plans/2026-09-08-askching-bootstrap.md`
- Original user brief: available in the Codex attachment for this task; its constraints are captured in the design and plan.

## Next action

Commit the MCP slice as `feat(mcp): implement compare_markets vertical slice`, then execute Task 5: add the fixture eval runner first, followed by the thin skill, demo prompts, README MCP configuration/live smoke notes, and final handoff evidence in separate commits.

## Verification

- `pnpm install` passed with pnpm 9.15.4.
- `pnpm build` passed across all three workspace packages on Node.js 22.13.1 (the project floor is Node.js 20).
- The comparison test was observed red on missing `compare.js`, then passed 2 tests after implementation.
- `vitest.config.ts` excludes `.getsuperpower` because Ponytrail stores source copies that otherwise look like tests.
- Data-source tests were observed red on missing `data-source.js`; live request coverage was observed red on missing `operationName`.
- Handler tests were observed red on missing `tools.js`, then passed 2 tests after implementation.
- `@types/node` 22 was added for the executable MCP entry point.
- Focused MCP verification: 2 handler tests passed and the MCP package build passed.

## Live source notes

- Aave V3 Ethereum: `JCNWRypm7FYwV8fx5HhzZPSFaMxgkPuw4TnR3Gpi81zk`
- Compound V3 Ethereum: `AwoxEZbiWLvv6e3QdvdMZw4WDURdGbvPfHmZRc8Dpfz9`
- Both expose Messari lending schema 3.1.0-compatible `markets`, `inputToken`, and lender `rates` fields. Endpoint metadata was verified in Graph Explorer; no authenticated live smoke was run because no key is present.

## Suggested skills

Use `executing-plans`, `test-driven-development`, `pony-trail`, and `verification-before-completion`. Use `systematic-debugging` before changing code in response to any unexpected failure.
