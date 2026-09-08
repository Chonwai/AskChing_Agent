# AskChing handoff

Updated: 2026-09-08 (Asia/Hong_Kong)

## Current checkpoint

- Branch: `main`, tracking public `origin/main`
- Implementation HEAD: `ce1c4d3` (`docs: document Grok CLI and current tool scope`)
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

## Verification evidence

Run from the repository root at implementation HEAD `ce1c4d3`:

```text
pnpm test  -> 7 files passed, 19 tests passed
pnpm build -> all 3 workspace packages built successfully
pnpm eval  -> 5/5 eval cases passed
```

The orchestrator tests use a deterministic mock model and fixture data, so they require no network credentials. The CLI was also checked to fail clearly when the default xAI endpoint is selected without `XAI_API_KEY`.

## Run the product

```bash
pnpm install
cp .env.example .env
pnpm build
pnpm askching -- "Compare USDC supply APY across Aave, Compound, and Spark"
```

For xAI, set `XAI_API_KEY`. For a local OpenAI-compatible server, set `ASKCHING_LLM_BASE_URL` and `ASKCHING_LLM_MODEL`; local endpoints may omit the key. Set `DEMO_LIVE=1` plus `GRAPH_API_KEY` only when live Graph data is required.

## Open constraints

- No real Grok end-to-end call was made in this batch because `XAI_API_KEY` is not available in the checked-in environment.
- Live Graph behavior was already validated earlier, but was not re-run in this batch to avoid unnecessary gateway traffic.
- `risk_scan` is an honest peer-relative spot snapshot, not historical time-series risk analysis.
- AskChing remains research software: no trading, transaction execution, or large UI is in scope.

## Next action

Add `XAI_API_KEY` locally and record one real fixture-mode Grok CLI transcript. Then prepare the showcase/demo video and final ETHOnline submission materials. If the real model emits unexpected tool arguments, add the transcript shape as a regression test before changing the loop.

## Source-of-truth documents

- `README.md` — setup and usage
- `docs/engineering-spec.md` — architecture and contracts
- `docs/product-overview.md` — product and competition narrative
- `demos/prompts.md` — demo prompts
- `skills/askching/SKILL.md` — agent evidence rules
