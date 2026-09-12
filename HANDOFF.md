---
title: AskChing handoff
updated: 2026-09-12
checkpoint: a20dc42
status: discover-yields-task-5-complete
---

# AskChing handoff

Updated: 2026-09-12 (Asia/Hong_Kong)

## Active yield-discovery batch

- Approved design: `docs/superpowers/specs/2026-09-12-discover-yields-design.md` (`051a91a`).
- Execution plan: `docs/superpowers/plans/2026-09-12-discover-yields.md` (`de60106`).
- Completed Task 1 at `66d7d5a`: yield result/observation/citation/risk schemas, canonical USDC/USDT/DAI addresses, and pending Uniswap V3 + Curve source entries.
- Completed Task 2 at `39d1e6d`: deterministic DEX fixtures and the injected-clock Uniswap V3 complete-day fee adapter.
- Completed Task 3 at `11f964b`: Curve daily-snapshot adapter; `4f95009` then fixed three-core-stablecoin composition matching for single-counterpart requests.
- Completed Task 4 at `f4bc428`: pure filtering, separate lending/LP rankings, calculations, risk flags, common-day gate, and fail-closed behavior.
- Completed Task 5 at `a20dc42`: fixture/live DEX facade, `Promise.allSettled` partial failures, safe venue gaps, fixture/live invariants, and integration into `MarketDataSource`.
- Verification at this checkpoint: yield adapters/facade plus existing data-source invariants passed **37/37 tests in 4 files**; shared TypeScript build and `git diff --check` passed. Normalizer plus compare/analysis/trend regressions passed **47/47 tests in 4 files**.
- Both DEX candidates deliberately remain `live: false` with `Pending exact-query credentialed probe.` They must not be advertised as live until the exact production queries pass.
- The DEX facade can execute candidate adapters in a controlled live test, but production exposure must respect the registry state until Task 8's credentialed probes succeed.
- Next action: Task 6 — add failing `discover_yields` MCP handler/registration tests, implement the handler, update both transport smoke counts from five to six, commit, and push.
- Remaining after Task 6: Task 7 Grok tool routing; Task 8 evals/docs/credentialed DEX probes/final full verification.

## TL;DR for the incoming teammate

Read this box, then read §Corrections before trusting any older document.

- **5 currently registered MCP tools**; `discover_yields` shared engine is implemented through Task 5 but is not registered yet. There are **2 transports** (local stdio + remote Streamable HTTP) and **4 verified live lending protocols**.
- **Remote MCP is implemented and cloud-ready** — `api/mcp.ts`, `api/health.ts`, `vercel.json`, `public/index.html`. Deployment is being handled by the user's partner and is outside this active code batch; do not claim its current URL/status without probing it.
- **56 commits** landed since the older `9a3f592` handoff; the active yield batch accounts for 13 commits after `40f7923`. All implementation commits through `a20dc42` are pushed to `origin/main`.
- A verification pass on 2026-09-12 re-derived every checkable claim from the file system, the vendors' documentation, and the live API instead of from commit messages. It found and fixed **3 real bugs** and **1 false claim**; two of the bugs would only have surfaced after deployment.
- Green today: `pnpm build` 3/3, `pnpm test` **175 passed (17 files)**, `pnpm eval` **23/23**, `pnpm mcp:smoke` 5 tools, `pnpm mcp:http:smoke` 5 tools, `pnpm vercel:probe` OK, `pnpm probe:protocols` **4/4**.

## Current checkpoint

- Branch `main`, tracking public `origin/main`.
- **`a20dc42`** is the latest pushed implementation commit: `feat(shared): add settled DEX yield data source`. The handoff edits you are reading follow it.
- The previous yield handoff pointed at `66d7d5a`; that checkpoint is superseded.
- Working tree was clean before these handoff edits. Credentials stay local in `.env` (git-ignored).
- `.edison/state/*.md` **is tracked** in this repo, not ignored — loop state is part of the record.
- Yield batch range so far: `git log --oneline 40f7923..HEAD`. History is incremental and unsquashed.

## What exists now

### MCP tool surface (5 tools, one registration)

All five are registered from a single source — `packages/mcp-server/src/register.ts` — so the stdio server and the remote HTTP server can never drift apart.

| Tool | Answers | Time dimension |
| --- | --- | --- |
| `compare_markets` | Which protocol has the best rate right now | spot |
| `research_brief` | A cited brief for one metric/asset | spot |
| `risk_scan` | Peer-relative spot signals + explicit time-series gap | spot |
| `analyze_markets` | `yield_opportunity` / `liquidity_stress` / `evidence_quality` | spot, with calculation + confidence + gaps |
| `analyze_trends` | 7d / 30d daily history: change, changePct, least-squares slope, direction, volatility | **historical** |

The three-layer story the demo leans on: compare (now) → analyze (now, explained) → analyze_trends (how it got here).

### Two transports from one registration

```
register.ts ──┬── index.ts      stdio   → local clients (Cursor / Claude Desktop / Codex)
              └── http.ts       Web     → api/mcp.ts → Vercel → Claude, Cursor, VS Code,
                                         Codex, Gemini CLI/Antigravity, Grok Bot, ChatGPT
                    └── node-adapter.ts → serve.ts (local) / http-smoke.ts
```

`http.ts` uses the MCP SDK's `WebStandardStreamableHTTPServerTransport` in **stateless** mode (`sessionIdGenerator: undefined`, a fresh server + transport per request). That is not a preference — the SDK throws if a stateless transport is reused, and statelessness is what makes the server safe on a platform that may not keep the process alive.

Only `POST` is served. `GET` and `DELETE` return `405` with `Allow: POST, OPTIONS`.

### Verified live protocols (4)

Verified on 2026-09-12 through the same code path the server uses. `pnpm probe:protocols` is the evidence.

| Protocol | Subgraph id | Live USDC reading at verification |
| --- | --- | --- |
| `aave-v3` | `JCNWRypm7FYwV8fx5HhzZPSFaMxgkPuw4TnR3Gpi81zk` | supply 3.554%, utilization 91.85% |
| `compound-v3` | `AwoxEZbiWLvv6e3QdvdMZw4WDURdGbvPfHmZRc8Dpfz9` | supply 4.249%, utilization 90.32% |
| `spark-lend` | `GbKdmBe4ycCYCQLQSjqGg6UHYoYfbyJyq5WrG35pv1si` | supply 3.542%, utilization 92.21% |
| `aave-v2` | `C2zniPn45RnLDGzVeGZCx2Sw3GXrbc9gL4ZfL8B8Em2j` | supply 0.502%, utilization 30.08% |

`PROTOCOL_REGISTRY` holds 13 entries: 4 live, 5 reachable-but-unusable, 4 on an older schema. **Every non-live entry must carry a `note` explaining why** — enforced by test. The registry is the only place the live set is written down; the Grok tool schema derives its protocol enum from it.

### Historical note: the analyze_markets batch

Kept for context only. The previous handoff described this batch as the current state; it is now several batches behind.

- Fourth tool added (`analyze_markets`) with objectives `yield_opportunity`, `liquidity_stress`, and `evidence_quality`. Each finding carries its calculation, supporting observations, metric-aware citations, confidence, caveats, and `asOf`.
- Historical intent such as `7d` is preserved as a **spot-only gap** rather than being quietly answered with current data.
- Quantitative comparisons require ≥2 distinct cited subgraph sources and reject mixed assets, units, metrics, or APY rate definitions.

That behaviour is unchanged today. What changed since: a fifth tool (`analyze_trends`), the remote HTTP transport, the Vercel entry points, and the protocol correction described in §Corrections.

## Commit history since the previous handoff

**42 commits** from `904a680` to `40f7923`. Full list: `git log --oneline 9a3f592..HEAD`. Grouped by batch:

| Batch | Range | What it did |
| --- | --- | --- |
| Competitive research | `06bc1fa` → `beb6edd` | ETHOnline prize structure, past winners, and the differentiation read against the official `graph-lending-mcp` showcase |
| Historical trends | `fddd0aa` → `60634c7` | Messari `MarketDailySnapshot` feasibility research, then the `analyze_trends` tool |
| Remote MCP + Vercel | `d3d6b47` → `a9a11d3` | second transport, deploy entry points, multi-platform guide, demo narrative |
| Verification + repair | `b0460a5` → `0a08721` | the three bug fixes and the protocol correction in §Corrections |
| State | `c580088`, `40f7923` | loop state files |

History was not squashed. Every batch was pushed to `origin/main`.

## Verification evidence

Re-run from the repository root at `40f7923` on 2026-09-12. These are the numbers to expect; treat anything else as a real signal.

```text
pnpm build          -> 3 of 4 workspace projects built
pnpm test           -> 175 passed (17 files)
pnpm eval           -> 23/23 passed
pnpm mcp:smoke      -> mcp-smoke OK: askching (5 tools)
pnpm mcp:http:smoke -> mcp-http-smoke OK: askching (5 tools, transport=streamable-http, findings=3)
pnpm vercel:probe   -> vercel-probe OK: export shape, config, initialize, tools/list, tools/call, health
pnpm probe:protocols -> 4/4 live protocols returned data
```

`pnpm live:smoke` and `pnpm askching` need `GRAPH_API_KEY` (and `XAI_API_KEY` for the latter); `pnpm probe:protocols` needs `GRAPH_API_KEY`.

### Credentialed live evidence

Last full live analytical run, 2026-09-11 at `9a3f592`:

```text
ASKCHING_DEBUG=1 DEMO_LIVE=1 pnpm askching --
  "Analyze the best current USDC supply-yield opportunity across Aave V3,
   Compound V3, and Spark Lend. Explain utilization context and cite every source."

Selected tool: analyze_markets (yield_opportunity)
Live sources: Aave V3, Compound V3, Spark Lend (3 distinct subgraphs)
Leader: Compound V3, 5.556442694112% supply APY
Runner-up: Aave V3, 3.7134735741102136%
Spread: 1.84 percentage points
Leader utilization context: 90.72479433698581%
asOf: 2026-09-10T16:12:11.000Z, block 25948103
```

Grok's output carried source ids, deployment ids, blocks, timestamps, query hashes, and the spot-only caveat, and stated it was not a forecast or recommendation.

Live protocol readings from `pnpm probe:protocols` on 2026-09-12 are in the table in §What exists now.

## Supported surface

- **4 live protocols** — see the table above. Verified, not asserted.
- **4 metrics**: `supply_apy`, `borrow_apy`, `tvl`, `utilization`.
- **4 fixture/demo assets**: `USDC`, `USDT`, `DAI`, `WETH`.
- **2 transports**: stdio and remote Streamable HTTP.
- Legacy alias `usdc_supply_apy` still resolves to `supply_apy` + `USDC`.
- 9 registered-but-not-live protocols, each with a `note` giving the reason: `uwu-lend`, `zerolend`, `aave-amm`, `aave-arc`, `aave-rwa`, `compound-v2`, `rari-fuse`, `makerdao`, `euler`.

## Corrections (2026-09-12) — read before trusting an older document

A verification pass re-derived every checkable claim from the file system, the vendors' documentation, and the live API rather than from commit messages. That was self-review by the same agent that wrote the code, so treat the **evidence** as the source of authority, not the reviewer. It found **three real bugs** and **one false claim**. Full report: `docs/reviews/2026-09-12-verification-audit.md`.

### Bug 1 — the `/api` functions used an export shape Vercel does not recognise

Vercel accepts two shapes for a file under `/api` when no framework is detected:

```ts
export default { fetch(request) { return new Response(...) } }   // recognised
export function POST(request) { ... }                            // recognised
```

We shipped `export default handler` — a bare `(request) => Response` function, which is **neither**. Vercel would fall back to the Node.js `(req, res)` handler path, which terminates a response by calling `res.end()`. Our handler only *returns* a `Response`, so `res.end()` is never called and the request hangs until the function times out.

This is the classic "green locally, dead in production" failure, and `pnpm vercel:probe` did not catch it because the probe called the function directly and never exercised Vercel's framework detection.

### Bug 2 — the output directory fell back to the repository root

Vercel's documented rule for the "Other" preset: the output directory is `public` **if it exists**, otherwise `.` — the repository root.

We had no `public/` directory, so every non-ignored file in the repo (`docs/`, `package.json`, the whole source tree) would have been served as static files on the public URL.

Fixed by adding `public/index.html` (a landing page that doubles as a demo asset) and setting `outputDirectory` explicitly in `vercel.json`.

### Bug 3 — `compound-v2` had a typo'd subgraph id

```
ours:     4TbqVA8p2DoBd5qDbPMwmDZv3CsJjWtxo8nVSqF2tA9a9a   ← trailing "9a"
official: 4TbqVA8p2DoBd5qDbPMwmDZv3CsJjWtxo8nVSqF2tA9a
```

The gateway rejected it outright as an invalid subgraph id. Source of truth is Messari's `deployment/deployment.json`.

### False claim — "6 live protocols"

`uwu-lend` and `zerolend` were registered as live. Neither can serve USDC on mainnet:

- **`uwu-lend`** — the mainnet markets are `sifu`, `sDAI`, `sSPELL`, `USDT`, `DUMMY`. There is no USDC market at all.
- **`zerolend`** — every mainnet market returns `isActive: false` and `totalValueLockedUSD: 0`. ZeroLend's live deployments are on other networks.

Worse, `MARKET_FIXTURES` contained USDC observations for both. **Fixture mode was returning numbers live mode could never reproduce** — which is a direct hit on the product's central claim. Both are now `live: false` with a precise `note`, and their fixtures are gone.

Two related findings from the same sweep:

- `aave-amm` has zero active mainnet markets; `aave-arc` and `aave-rwa` do serve USDC but at 0% APY and roughly $57k / $4.4k TVL. All three are recorded as non-live with the reason, so nobody re-investigates them.
- The four older-schema entries fail with a precise cause: `Market has no indexLastUpdatedTimestamp field, which GET_MARKETS_QUERY selects`.

### Invariants added so these cannot come back

| Guard | Where |
| --- | --- |
| `/api` default export must be an object with a `fetch` method, and `config.runtime` must be `nodejs` | `demos/vercel-probe.ts` |
| `vercel.json` must set `outputDirectory: "public"`, and `public/index.html` must exist | `demos/vercel-probe.ts` |
| Every non-live registry entry must carry a `note`; live entries must not | `packages/shared/src/source-config.test.ts` |
| Fixtures may only use registered **and live** protocols; every live protocol needs a USDC fixture and a `supply_apy` fixture | `packages/shared/src/fixture-live-consistency.test.ts` |
| Every tool's protocol enum must equal `LIVE_PROTOCOLS` | `packages/grok-orchestrator/src/loop.test.ts` |

`pnpm probe:protocols` is the live counterpart: it queries each registry entry through the same code path the server uses, fails only when a **live** entry cannot deliver, and flags a non-live entry that starts returning data as `notlive+` for re-evaluation.

### Two habits worth keeping

1. **Never hand-write the live protocol list.** It existed in two places and both drifted. It now lives only in `source-config.ts`; the Grok tool schema spreads it.
2. **Do not add a protocol without probing it first.** `pnpm probe:protocols -- <subgraphId> <slug> --asset USDC`.

## Open constraints

- `analyze_markets`, `compare_markets`, `research_brief`, and `risk_scan` are spot-based. Only `analyze_trends` reads history, over a 7d or 30d window of cited daily snapshots. A requested historical window given to a spot-only tool becomes an explicit gap — it is never answered silently with current data.
- `tvl` is the largest matching market's USD scale proxy. It must never be described as available liquidity.
- `utilization` is borrow ÷ deposit and skips zero-deposit markets.
- Live coverage depends on what each registered subgraph exposes for the requested asset and metric. Explicit gaps are expected and correct, not a failure.
- Grok synthesis is a CLI layer; the MCP tool layer itself is transport-agnostic and works anywhere MCP does.
- **When deployed, the endpoint is unauthenticated with no rate limit, in front of a billed key.** That is a deliberate trade-off so judges can connect directly. Add a guardrail before listing the URL publicly — see `docs/improvement-blueprint.md` §4.
- AskChing is research software: no trading, no transaction execution, no large UI.
- Never commit `.env`, expose API keys, or paste secrets into logs.

## Next actions

### Chonwai — deploy the remote MCP server

**This is the one thing that is implemented but unproven.** Everything else in this document has been run. Do this first.

1. `pnpm vercel:probe`, then `vercel --prod`. Framework Preset must be **Other** — settings table in `docs/deployment-vercel.md` §3.
2. `curl https://<app>.vercel.app/api/health` → expect five fields with `"live": true`.
3. `curl` `tools/list` against `/api/mcp` → expect five tool names.
4. If it returns `500 Cannot find module`, the pnpm workspace `dist/` was not bundled. `packages/mcp-server/src/serve.ts` already works on a persistent host (Railway / Fly / Docker), which sidesteps Vercel's serverless constraints entirely.

Environment: `DEMO_LIVE=1` + `GRAPH_API_KEY` on Production; `DEMO_LIVE=0` on Preview so previews stay deterministic. **Do not set `XAI_API_KEY` in the cloud** — the Grok layer is a CLI and does not run there.

### John — demo video and submission

1. Walk the pre-recording checklist: `docs/superpowers/specs/2026-09-09-pre-recording-checklist.md`.
2. Record 2–4 minutes, human narration, ≥720p, live data. The three beats and shot list are in `docs/superpowers/plans/2026-09-12-demo-narrative.md`; Demo A–F prompts are in `demos/prompts.md`.
3. Upload unlisted, add the URL to the ETHGlobal form, confirm the repo is public, submit.

Two demo-specific notes: the strongest beat is the deliberate **fail-closed** demonstration (ask for one protocol and it refuses), and nothing should be claimed as live unless `curl /api/health` says `"live": true` first.

Do not report the video or the submission as complete until John confirms.

### Either of us — cheap wins

`docs/improvement-blueprint.md` ranks what is left by value. The two with the best ratio:

- **Different chain, not more mainnet.** All 27 Ethereum mainnet lending deployments have now been checked; Base / Arbitrum / Polygon have not been. This needs the literal `network: "mainnet"` type widened first, so it is real code.
- **Rate dispersion** — the spread between protocols over time. A direct extension of the existing `analyze_trends` engine.

## Source-of-truth files

Read these in this order when something is unclear; they disagree in places, and the earlier ones win.

| File | Why |
| --- | --- |
| `HANDOFF.md` (this file) | Current state and corrections |
| `docs/reviews/2026-09-12-verification-audit.md` | What was checked, how, and what was wrong |
| `packages/shared/src/source-config.ts` | The only place the live protocol set is written down |
| `packages/mcp-server/src/register.ts` | The only place the tool surface is written down |
| `docs/deployment-vercel.md` | Deploy settings, both fixed pitfalls, troubleshooting |
| `docs/platform-integration.md` | Per-platform connection config for 8 clients |
| `docs/improvement-blueprint.md` | What is left, ranked, with the ruled-out candidates |
| `evals/cases.json` | 23 behavioural cases |
| `demos/prompts.md` | Demo A–F and the locked source ids |
| `skills/askching/SKILL.md` | Thin agent playbook |

Known-stale documents, kept only as history. Each carries a banner saying so: `docs/engineering-spec.md` (stops at v1.0), `docs/product-overview.md` (§5 predates the extra tools). Do not update them casually — rewrite or delete them, but do not half-edit.
