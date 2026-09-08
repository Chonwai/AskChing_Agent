# AskChing Handoff

## Current checkpoint

Tasks 1–3 are implemented on `main`. Fixture mode returns cited Aave V3 and Compound V3 observations without network access. Live mode fans out through the Graph gateway with bearer auth, parses their shared Messari lending schema, and fails clearly without `GRAPH_API_KEY`. Commits already present: `88eaf4e` (design/plan), `eb4c87e` (scaffold), and `58dbf24` (comparison contract).

## Source of truth

- Design: `docs/superpowers/specs/2026-09-08-askching-bootstrap-design.md`
- Plan: `docs/superpowers/plans/2026-09-08-askching-bootstrap.md`
- Original user brief: available in the Codex attachment for this task; its constraints are captured in the design and plan.

## Next action

Commit the data sources as `feat(shared): add fixture and live Graph market sources`, then execute Task 4 test-first: define `compareMarkets(input, dataSource)` behavior before implementing the MCP handler and stdio registration.

## Verification

- `pnpm install` passed with pnpm 9.15.4.
- `pnpm build` passed across all three workspace packages on Node.js 22.13.1 (the project floor is Node.js 20).
- The comparison test was observed red on missing `compare.js`, then passed 2 tests after implementation.
- `vitest.config.ts` excludes `.getsuperpower` because Ponytrail stores source copies that otherwise look like tests.
- Data-source tests were observed red on missing `data-source.js`; live request coverage was observed red on missing `operationName`.
- Fresh `pnpm test`: 3 files, 5 tests passed. Fresh `pnpm build`: all three packages passed.

## Live source notes

- Aave V3 Ethereum: `JCNWRypm7FYwV8fx5HhzZPSFaMxgkPuw4TnR3Gpi81zk`
- Compound V3 Ethereum: `AwoxEZbiWLvv6e3QdvdMZw4WDURdGbvPfHmZRc8Dpfz9`
- Both expose Messari lending schema 3.1.0-compatible `markets`, `inputToken`, and lender `rates` fields. Endpoint metadata was verified in Graph Explorer; no authenticated live smoke was run because no key is present.

## Suggested skills

Use `executing-plans`, `test-driven-development`, `pony-trail`, and `verification-before-completion`. Use `systematic-debugging` before changing code in response to any unexpected failure.
