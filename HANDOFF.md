# AskChing Handoff

## Current checkpoint

The ETHOnline bootstrap session definition of done is complete at `de238a8` on `main`: the pnpm monorepo builds, `compare_markets` returns a normalized two-source fixture comparison with citations and `asOf`, fixture/live Graph paths exist, the MCP stdio server is wired, five eval cases pass, and the README explains why AskChing is not a replacement for the official Subgraph MCP.

## Source of truth

- Design: `docs/superpowers/specs/2026-09-08-askching-bootstrap-design.md`
- Plan: `docs/superpowers/plans/2026-09-08-askching-bootstrap.md`
- Demo sources and prompts: `demos/prompts.md`
- User/operator setup: `README.md`

## Incremental history

```text
de238a8 fix(shared): enforce comparable rate definitions
305d64f docs: add demo and MCP setup guidance
035c865 docs(skill): add thin AskChing tool playbook
b4969ef test(evals): add cited compare cases
c413c98 feat(mcp): implement compare_markets vertical slice
edc8a9a feat(shared): add fixture and live Graph market sources
58dbf24 feat(shared): normalize cited market comparisons
eb4c87e chore: scaffold AskChing pnpm monorepo
88eaf4e docs: define AskChing bootstrap design and plan
```

Do not squash this history; it demonstrates Start Fresh progress.

## Verification evidence

- `pnpm install`: passed with pnpm 9.15.4.
- `pnpm test`: 5 files, 8 tests passed.
- `pnpm build`: shared, MCP server, and Grok orchestrator packages passed.
- `pnpm eval`: 5/5 fixture cases passed.
- `pnpm live:smoke` in fixture mode: returned two ranked rows, two distinct subgraph IDs, citations, caveats, and `asOf`.
- Forbidden legacy-name scan across source/docs: no matches.
- Thin skill: 48 lines; structural contract test and manual YAML/frontmatter validation passed. The optional official validator could not start because its Python environment lacks PyYAML.

## Open constraints

- No authenticated live smoke was run because no `GRAPH_API_KEY` was present. Graph Explorer confirms both configured IDs and their Messari lending schema; recheck index status before recording.
- Exactly two live sources are configured, so either source failure correctly fails the comparison. When adding a third source, change fan-out to settled results and include explicit gaps whenever at least two cited observations survive.
- `research_brief` and `risk_scan` are registered but deliberately return explicit not-implemented errors.
- `packages/grok-orchestrator` is scaffolded; the xAI tool-calling loop is not implemented in this bootstrap slice.

## Next actions

1. Set `GRAPH_API_KEY`, run `DEMO_LIVE=1 pnpm live:smoke`, and capture the response or any schema drift before changing code.
2. Implement the Grok in-process tool loop test-first and commit it as its own feature.
3. Implement `research_brief`, then `risk_scan`, each with independent fixture evals and commits.
4. Push after every completed slice; never rewrite or squash the incremental history.

## Suggested skills

Use `brainstorming` for the next feature design, then `writing-plans`, `test-driven-development`, `pony-trail`, `systematic-debugging` for failures, `code-review`, and `verification-before-completion`.
