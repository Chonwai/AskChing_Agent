# AskChing handoff

Updated: 2026-09-09 (Asia/Hong_Kong)

## Current checkpoint

- Branch: `main`, tracking public `origin/main`
- Current work HEAD: `64fa752` (`docs(demo): document visible Grok tool trace`)
- This handoff-only commit follows that implementation checkpoint.
- Working tree was clean before this handoff update.

## Completed

AskChing now has the complete intended vertical slice:

- Three live/fixture sources: Aave V3, Compound V3, and Spark Lend.
- Settled multi-source fan-out with explicit gaps and a two-cited-source minimum.
- MCP tools: `compare_markets`, `research_brief`, and `risk_scan`.
- Grok/OpenAI-compatible orchestrator with an in-process MCP tool loop.
- CLI that loads `skills/askching/SKILL.md`, defaults to xAI Grok, and supports local OpenAI-compatible endpoints.
- README and skill guidance aligned with the current tool scope.

New commits in the latest Codex batch:

- `53dc3fa feat(grok): implement in-process tool loop`
- `0c71cd0 feat(grok): add OpenAI-compatible CLI`
- `ce1c4d3 docs: document Grok CLI and current tool scope`
- `183c1e9 fix(demo): load local environment for live runs`
- `616897c fix(grok): load root environment in CLI`
- `3391bc5 fix(demo): pin fixture and live execution modes`
- `a901470 docs: design product-led hackathon showcase`
- `536ed52 chore(state): loop complete — VERIFY R2 PASS 97/100` (collaborator showcase review)
- `0959e69 Merge remote-tracking branch 'origin/main'` (preserves both incremental histories)
- `e64412e feat(grok): add safe tool-call debug trace`
- `64fa752 docs(demo): document visible Grok tool trace`

## Verification evidence

Run from the repository root at current work HEAD `64fa752`:

```text
pnpm test  -> 9 files passed, 23 tests passed
pnpm build -> all 3 workspace packages built successfully
pnpm eval  -> 5/5 eval cases passed
```

Credentialed end-to-end checks also passed on 2026-09-09:

- Live Graph: 3 cited sources at blocks 25,933,794–25,933,795; Compound 4.6453%, Aave 3.6283%, Spark 3.5419%.
- Real Grok with fixture tools: selected `compare_markets`, cited all 3 sources, labeled fixture data, preserved the variable-rate definition, and stated `asOf`.
- The launchers now load the root `.env`; `evals/demo-env-config.test.ts` guards all credentialed entry points.
- `pnpm demo` is always fixture mode; `pnpm demo:live` and `pnpm live:smoke` are always live regardless of `.env` defaults.
- Real Grok debug check: `ASKCHING_DEBUG=1` visibly printed `compare_markets` plus its three protocol arguments, then the cited answer; it did not print credentials or raw tool results.
- Showcase package reviewed at 97/100 and ready for manual recording.

Submission artifacts:

- `demos/prompts.md` — final three-source prompts
- `docs/superpowers/plans/2026-09-09-showcase-run-script.md` — 2:55 narration and screen actions
- `docs/superpowers/specs/2026-09-09-ethglobal-copy.md` — ready-to-copy platform text
- `docs/superpowers/specs/2026-09-09-pre-recording-checklist.md` — recording and submission gate

## Run the product

```bash
pnpm install
cp .env.example .env
pnpm build
pnpm askching -- "Compare USDC supply APY across Aave, Compound, and Spark"
```

For xAI, set `XAI_API_KEY`. For a local OpenAI-compatible server, set `ASKCHING_LLM_BASE_URL` and `ASKCHING_LLM_MODEL`; local endpoints may omit the key. Set `DEMO_LIVE=1` plus `GRAPH_API_KEY` only when live Graph data is required.

## Open constraints

- `risk_scan` is an honest peer-relative spot snapshot, not historical time-series risk analysis.
- AskChing remains research software: no trading, transaction execution, or large UI is in scope.
- Credentials remain local in `.env` and must never be committed or pasted into logs.

## Next action

John records the 2:55 demo with human narration by following `docs/superpowers/plans/2026-09-09-showcase-run-script.md`, uploads it unlisted, pastes the video URL into the ETHGlobal form, and submits. Before recording, run the checklist and use `ASKCHING_DEBUG=1 DEMO_LIVE=1 pnpm askching -- "<Demo A prompt>"` so the tool choice and live cited answer are both visible. Do not claim recording or submission is complete until John confirms it.

## Source-of-truth documents

- `README.md` — setup and usage
- `docs/engineering-spec.md` — architecture and contracts
- `docs/product-overview.md` — product and competition narrative
- `demos/prompts.md` — demo prompts
- `skills/askching/SKILL.md` — agent evidence rules
