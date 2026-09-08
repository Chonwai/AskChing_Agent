# AskChing Handoff

## Current checkpoint

Task 1 is implemented on `main`. The repository now has a three-package pnpm workspace, strict shared TypeScript configuration, environment example, MIT license, and README stub. The design/plan checkpoint is commit `88eaf4e`.

## Source of truth

- Design: `docs/superpowers/specs/2026-09-08-askching-bootstrap-design.md`
- Plan: `docs/superpowers/plans/2026-09-08-askching-bootstrap.md`
- Original user brief: available in the Codex attachment for this task; its constraints are captured in the design and plan.

## Next action

Commit the scaffold as `chore: scaffold AskChing pnpm monorepo`, then execute Task 2 test-first: add a failing comparison-contract test before creating schemas or normalization code.

## Verification

- `pnpm install` passed with pnpm 9.15.4.
- `pnpm build` passed across all three workspace packages on Node.js 22.13.1 (the project floor is Node.js 20).

## Suggested skills

Use `executing-plans`, `test-driven-development`, `pony-trail`, and `verification-before-completion`. Use `systematic-debugging` before changing code in response to any unexpected failure.
