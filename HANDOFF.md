# AskChing Handoff

## Current checkpoint

Tasks 1 and 2 are implemented on `main`. The shared package now validates citation-bearing observations, ranks comparable APY values, requires two distinct subgraph sources, and emits `asOf` plus timestamp caveats. Commits already present: `88eaf4e` (design/plan) and `eb4c87e` (scaffold).

## Source of truth

- Design: `docs/superpowers/specs/2026-09-08-askching-bootstrap-design.md`
- Plan: `docs/superpowers/plans/2026-09-08-askching-bootstrap.md`
- Original user brief: available in the Codex attachment for this task; its constraints are captured in the design and plan.

## Next action

Commit the shared contract as `feat(shared): normalize cited market comparisons`, then execute Task 3 test-first: define fixture-mode and missing-live-credential behavior before implementing a data source.

## Verification

- `pnpm install` passed with pnpm 9.15.4.
- `pnpm build` passed across all three workspace packages on Node.js 22.13.1 (the project floor is Node.js 20).
- The comparison test was observed red on missing `compare.js`, then passed 2 tests after implementation.
- `vitest.config.ts` excludes `.getsuperpower` because Ponytrail stores source copies that otherwise look like tests.

## Suggested skills

Use `executing-plans`, `test-driven-development`, `pony-trail`, and `verification-before-completion`. Use `systematic-debugging` before changing code in response to any unexpected failure.
