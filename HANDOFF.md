---
title: AskChing handoff
updated: 2026-09-13
checkpoint: c9aceac
status: submission-images-complete
---

# AskChing handoff

Updated: 2026-09-13 (Asia/Hong_Kong)

## Submission image batch — COMPLETE

- Approved Terminal Proof design: `docs/superpowers/specs/2026-09-13-submission-images-design.md`.
- Execution plan: `docs/superpowers/plans/2026-09-13-submission-images.md`.
- `90f5e8a` added the validated 512×512 logo; `356159e` added the validated 1600×900 cover.
- `d76595c` added three deterministic 1600×900 product screenshots and their reproducible HTML sources; `c9aceac` refreshed screenshot 1 to the canonical Pro endpoint after pulling the partner's deployment changes.
- Upload mapping and data caveats are in `submission-assets/README.md`. All five PNGs were visually inspected, dimension checked, and scanned for credential markers.
- Product surface now has **7 MCP tools total**: 6 research tools plus the `get_info` self-description tool added at `1e9947e`.
- Canonical live endpoint: `https://ask-ching-agent.vercel.app/api/mcp`.
- Next action: upload the five files from `submission-assets/` to ETHOnline, then record/submit the demo. Re-run or relabel time-sensitive numerical screenshots if a later recording claims they are current rather than the dated 2026-09-12 observations.

## Active yield-discovery batch — COMPLETE

- Approved design: `docs/superpowers/specs/2026-09-12-discover-yields-design.md` (`051a91a`).
- Execution plan: `docs/superpowers/plans/2026-09-12-discover-yields.md` (`de60106`).
- Completed Task 1 at `66d7d5a`: yield result/observation/citation/risk schemas, canonical USDC/USDT/DAI addresses, and pending Uniswap V3 + Curve source entries.
- Completed Task 2 at `39d1e6d`: deterministic DEX fixtures and the injected-clock Uniswap V3 complete-day fee adapter.
- Completed Task 3 at `11f964b`: Curve daily-snapshot adapter; `4f95009` then fixed three-core-stablecoin composition matching for single-counterpart requests.
- Completed Task 4 at `f4bc428`: pure filtering, separate lending/LP rankings, calculations, risk flags, common-day gate, and fail-closed behavior.
- Completed Task 5 at `a20dc42`: fixture/live DEX facade, `Promise.allSettled` partial failures, safe venue gaps, fixture/live invariants, and integration into `MarketDataSource`.
- Completed Task 6 at `1f335c4`: `discover_yields` MCP handler + registration over both transports (6 tools).
- Completed Task 7 at `20cf570`: Grok orchestrator routing for `discover_yields`.
- Completed Task 8 (this handoff batch, `a745f67` → `aa440bd`):
  - `a745f67` added `probe:yields` (`demos/probe-yield-sources.ts`) — credentialed DEX source probe.
  - Root-cause fix: johnku pinned Messari-schema subgraphs, but the Uniswap adapter used the official v3 schema. `f4f294f`/`f46fd33` rewrote it to the Messari `liquidityPoolDailySnapshots` shape.
  - Second fix (`712fe84`/`b316186`): Messari Uniswap V3's **global** `liquidityPoolDailySnapshots(first:1000)` query reliably times out (all 5 indexers unavailable), so the adapter now does a **two-phase lookup**: pools query (aliased `usdtPools`/`daiPools` with `inputTokens_contains`) then per-pool `where:{pool}` snapshot fetches in parallel (~5s + ~390ms/pool). Verified live: obs=8, gaps=0, eligible=2 (USDC/USDT 0.01% TVL $34.0M APR 1.51%; USDC/DAI TVL $1.17M APR 0.99%).
  - `3f9bfd4` flipped **both DEX sources to `live: true`** and removed their pending notes — Task 8 was the only task allowed to do this, gated on `probe:yields` passing (2/2).
  - `9cc3372`/`aa440bd` typed + aligned the two-phase mock tests.
- **Gates today (2026-09-12, HEAD `aa440bd`)**: `pnpm build` 3/3, `pnpm test` **209 passed (21 files)**, `pnpm eval` **27/27**, `pnpm mcp:smoke` 6 tools, `pnpm mcp:http:smoke` 6 tools, `pnpm vercel:probe` OK, `pnpm probe:protocols` 4/4, `pnpm probe:yields` **2/2 live DEX venues**, `git diff --check` clean.
- **Credentialed Grok smoke passed** (`ASKCHING_DEBUG=1 DEMO_LIVE=1 pnpm askching -- "Where can I earn yield on USDC across lending, Uniswap V3, and Curve? ...")`: Grok selects `discover_yields`, prints separate lending/LP rankings, formulas, complete citations, risk flags, and no transaction.
- **Live `crossDexWinner` now works** (commit `44a57ae`): `windowKey` buckets by UTC day instead of exact raw timestamp equality, so Messari pools snapshotting at offset times still share a common day. The final live smoke selected Uniswap V3 DAI/USDC pool `0x5777d92f...` at 4.63% historical fee APR from 3 ranked LP rows. Fail-closed semantics remain unchanged when no shared day exists.
- Post-integration commits `1e69e05` → `da2b40c` retained the richer credentialed probe, normalized both adapters' citation windows to exact containing UTC days, aligned the design/plan with the verified two-phase Messari query, and clarified the README. This complements the ranking-layer bucket: live citations now show identical `2026-09-11T00:00:00Z → 2026-09-12T00:00:00Z` windows for Uniswap and Curve.
- **Final gates at pushed checkpoint `da2b40c`**: `pnpm test` **209/209 (21 files)**; `pnpm build` **3/3 packages**; `pnpm eval` **27/27**; stdio + HTTP smoke **6 tools each**; Vercel probe OK; protocol probe **4/4 live**; DEX probe **2/2 live**; credentialed Grok `discover_yields` smoke passed with a same-day `crossDexWinner`, separate lending/LP rankings, formulas, citations, risks, and no transaction.
- Next actions (nice-to-have, not blocking): revisit chain expansion (Base/Arbitrum/Polygon) as the highest-ROI demo differentiator; consider pagination on the Uniswap pools / Curve snapshots queries (current `first: 100` / `first: 1000` caps).

## TL;DR for the incoming teammate

Read this box, then read §Corrections before trusting any older document.

- **7 currently registered MCP tools**: six research tools (`compare_markets`, `research_brief`, `risk_scan`, `analyze_markets`, `analyze_trends`, `discover_yields`) plus `get_info`, across **2 transports** (local stdio + remote Streamable HTTP); **4 verified live lending protocols** + **2 live DEX venues** (Uniswap V3, Curve).
- **Remote MCP is LIVE on Vercel Pro** — `https://ask-ching-agent.vercel.app/api/mcp` (project `ask-ching-agent` under Pro team `chonwai-s-team`; the free-team `askching` project on `chonwais-projects` is a superseded duplicate). Health at `/api/health` reports `live: true`. Verified: 6 tools listed, `/mcp` rewrite works, `compare_markets` returns live cited data (block 25963035, queryHash, subgraphId). GitHub push-to-deploy connected to the Pro project — pushes to `main` auto-deploy. Env: Production `DEMO_LIVE=1` + `GRAPH_API_KEY` (secret); Preview `DEMO_LIVE=0`.
- The active yield batch is now **complete through Task 8**: both DEX sources are `live: true` (flipped only after `probe:yields` passed 2/2), the Uniswap adapter uses a two-phase lookup to avoid the Messari subgraph's global-snapshot timeout, and all release gates are green.
- Green today (pushed checkpoint `da2b40c`): `pnpm build` 3/3, `pnpm test` **209 (21 files)**, `pnpm eval` **27/27**, `pnpm mcp:smoke` 6 tools, `pnpm mcp:http:smoke` 6 tools, `pnpm vercel:probe` OK, `pnpm probe:protocols` 4/4, `pnpm probe:yields` **2/2**, credentialed Grok smoke passed.

## Current checkpoint

- Branch `main`, tracking public `origin/main`.
- **`c9aceac`** is the latest pushed asset commit before this manifest/handoff update: `fix(demo): use canonical live MCP endpoint`. The handoff commit follows it.
- **Deployed live (Pro team)**: `https://ask-ching-agent.vercel.app` (project `ask-ching-agent`, team `chonwai-s-team`), `live: true` on Production, 6 tools verified, GitHub auto-deploy connected. The earlier free-team deployment `askching.vercel.app` (team `chonwais-projects`) is superseded — the Pro project is the canonical endpoint.
- The previous handoff pointed at `616e4c6`; superseded by the successful deployment batch.
- Working tree clean; credentials stay local in `.env` (git-ignored). `.vercel/` is gitignored.
- **Competition finish-line plan** is at `docs/superpowers/plans/2026-09-12-competition-finish-line.md` (Phase 0 freeze → Phase 1 record → Phase 2 submit → Phase 3 optional fixes). ETHOnline deadline: 2026-09-13 12:00 PM EDT (HK 09-14 00:00).
- **Vercel deployment is DONE and verified** — research `docs/reviews/2026-09-13-vercel-deploy-research.md`, execution plan `docs/superpowers/plans/2026-09-13-vercel-deploy-plan.md`. Next: demo recording + submission.
- `.edison/state/*.md` **is tracked** in this repo, not ignored — loop state is part of the record.
- Yield batch range so far: `git log --oneline 40f7923..HEAD`. History is incremental and unsquashed.

## What exists now

### MCP tool surface (6 tools, one registration)

All six are registered from a single source — `packages/mcp-server/src/register.ts` — so the stdio server and the remote HTTP server cannot drift apart.

| Tool | Answers | Time dimension |
| --- | --- | --- |
| `compare_markets` | Which protocol has the best rate right now | spot |
| `research_brief` | A cited brief for one metric/asset | spot |
| `risk_scan` | Peer-relative spot signals + explicit time-series gap | spot |
| `analyze_markets` | `yield_opportunity` / `liquidity_stress` / `evidence_quality` | spot, with calculation + confidence + gaps |
| `analyze_trends` | 7d / 30d daily history: change, changePct, least-squares slope, direction, volatility | **historical** |
| `discover_yields` | Cross-venue USDC yield: separate lending/LP rankings, citations, risk flags | **discovery** |

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
| `aave-v3` | `JCNWRypm7FYwV8fx5HhzZPSFaMxgkPuw4TnR3Gpi81zk` | supply 3.521%, utilization 91.43% |
| `compound-v3` | `AwoxEZbiWLvv6e3QdvdMZw4WDURdGbvPfHmZRc8Dpfz9` | supply 4.089%, utilization 90.27% |
| `spark-lend` | `GbKdmBe4ycCYCQLQSjqGg6UHYoYfbyJyq5WrG35pv1si` | supply 3.542%, utilization 92.21% |
| `aave-v2` | `C2zniPn45RnLDGzVeGZCx2Sw3GXrbc9gL4ZfL8B8Em2j` | supply 0.501%, utilization 30.07% |

`PROTOCOL_REGISTRY` holds 13 entries: 4 live, 5 reachable-but-unusable, 4 on an older schema. **Every non-live entry must carry a `note` explaining why** — enforced by test. The registry is the only place the live set is written down; the Grok tool schema derives its protocol enum from it.

### Verified live DEX venues (2)

Verified on 2026-09-12 through `pnpm probe:yields` (exact production query path).

| Venue | Subgraph id | Live reading at verification |
| --- | --- | --- |
| `uniswap-v3` | `4cKy6QQMc5tpfdx8yxfYeb9TLZmgLQe44ddW1G7NwkA6` | 2 eligible pools; USDC/USDT TVL $33.29M APR 1.06%; USDC/DAI TVL $1.22M APR 4.63% |
| `curve` | `3fy93eAT56UJsRCEht8iFhfi6wjHWXtZ9dnnbQmvFopF` | 1 eligible pool; 3pool TVL $154.47M APR 0.17% |

Both are Messari-schema subgraphs. The Uniswap adapter uses a two-phase lookup (pools query then per-pool `where:{pool}` snapshots) because the global `liquidityPoolDailySnapshots(first:1000)` query reliably times out on that deployment. `DEX_YIELD_SOURCES` holds exactly these 2 entries, both `live: true` with no `note`. `probe:yields` exits non-zero if a live source cannot deliver an eligible complete snapshot.

### Historical note: the analyze_markets batch

Kept for context only. The previous handoff described this batch as the current state; it is now several batches behind.

- Fourth tool added (`analyze_markets`) with objectives `yield_opportunity`, `liquidity_stress`, and `evidence_quality`. Each finding carries its calculation, supporting observations, metric-aware citations, confidence, caveats, and `asOf`.
- Historical intent such as `7d` is preserved as a **spot-only gap** rather than being quietly answered with current data.
- Quantitative comparisons require ≥2 distinct cited subgraph sources and reject mixed assets, units, metrics, or APY rate definitions.

That behaviour is unchanged today. What changed since: a fifth tool (`analyze_trends`), the remote HTTP transport, the Vercel entry points, and the protocol correction described in §Corrections.

## Commit history since the previous handoff

**63 commits** from `904a680` to `24f7b34`. Full list: `git log --oneline 9a3f592..HEAD`. Grouped by batch:

| Batch | Range | What it did |
| --- | --- | --- |
| Competitive research | `06bc1fa` → `beb6edd` | ETHOnline prize structure, past winners, and the differentiation read against the official `graph-lending-mcp` showcase |
| Historical trends | `fddd0aa` → `60634c7` | Messari `MarketDailySnapshot` feasibility research, then the `analyze_trends` tool |
| Remote MCP + Vercel | `d3d6b47` → `a9a11d3` | second transport, deploy entry points, multi-platform guide, demo narrative |
| Verification + repair | `b0460a5` → `0a08721` | the three bug fixes and the protocol correction in §Corrections |
| State | `c580088`, `40f7923` | loop state files |
| Yield discovery (johnku) | `051a91a` → `8a986d1` | cross-venue USDC yield discovery design → Task 7 (13 commits, John Ku) |
| DEX fix + Task 8 (chonwai) | `a745f67` → `6a36b96` | probe, Messari-schema rewrite, two-phase lookup, live flip, UTC-day bucket |
| Yield release (johnku) | `1e69e05` → `24f7b34` | probe cleanup, adapter UTC-day normalization, docs alignment, handoff rewrite (5 commits) |
| Competition finish-line | `docs/superpowers/plans/2026-09-12-competition-finish-line.md` | Phase 0 freeze → Phase 1 record → Phase 2 submit → Phase 3 optional fixes |
| Project context snapshot | `5055da2` → `8505c49` | `docs/.project-context.md` cache for Edison skills (inventory, conventions, rubric anchors) |
| Phase 3 small fixes | `11aff9b` | F2 `windowKey` UTC-day bucketing aligned to `Math.floor` (see §Corrections) |

History was not squashed. Every batch was pushed to `origin/main`.

## Verification evidence

Re-run from the repository root at pushed checkpoint `da2b40c` on 2026-09-12. These are the numbers to expect; treat anything else as a real signal.

```text
pnpm build          -> 3 of 4 workspace projects built
pnpm test           -> 209 passed (21 files)
pnpm eval           -> 27/27 passed
pnpm mcp:smoke      -> mcp-smoke OK: askching (6 tools)
pnpm mcp:http:smoke -> mcp-http-smoke OK: askching (6 tools, transport=streamable-http, findings=3)
pnpm vercel:probe   -> vercel-probe OK: export shape, config, initialize, tools/list, tools/call, health
pnpm probe:protocols -> 4/4 live protocols returned data
pnpm probe:yields   -> 2/2 live DEX venues passed (uniswap-v3 eligible=2, curve eligible=1)
```

`pnpm live:smoke` and `pnpm askching` need `GRAPH_API_KEY` (and `XAI_API_KEY` for the latter); `pnpm probe:protocols` and `pnpm probe:yields` need `GRAPH_API_KEY`.

### Credentialed live evidence

Latest full live analytical run, 2026-09-12 after `da2b40c`:

```text
ASKCHING_DEBUG=1 DEMO_LIVE=1 pnpm askching --
  "Where can I earn yield on USDC across lending, Uniswap V3, and Curve?
   Keep lending and LP rankings separate, show every formula and citation,
   explain the risks, and do not suggest a transaction."

Selected tool: discover_yields
Lending leader: Compound V3, 4.0894042183056% current variable supply APY
DEX leader: Uniswap V3 DAI/USDC, 4.627626150343912% historical fee APR
DEX common window: 2026-09-11T00:00:00Z -> 2026-09-12T00:00:00Z
Evidence: 4 lending subgraphs + 2 DEX subgraphs; complete citations and formulas
Safety: separate rankings, explicit risk flags/caveats, no transaction
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

### Post-integration batch (johnku `1e69e05` → `24f7b34`, 2026-09-12 evening)

Reviewed by smith (strict, measured 95/100 PASS):

- `d27eed9` normalizes both DEX adapters' citation windows to containing UTC days via `utcDayStart()`; complements the ranking-layer UTC-day bucket from `44a57ae` (files do not overlap).
- `1e69e05` is a lint cleanup of the probe script — its message says "add live DEX yield source probe", which is misleading; it was a no-op refactor.
- `c9955a8` / `da2b40c` / `24f7b34` align design/plan/README/prompts to the verified two-phase Messari DEX query path.
- Live `probe:yields` readings match HANDOFF verbatim: uniswap USDC/USDT TVL $33.29M APR 1.06% + USDC/DAI TVL $1.22M APR 4.63%; curve 3pool TVL $154.47M APR 0.17%; windows identical `2026-09-11T00:00:00Z → 2026-09-12T00:00:00Z`.
- One latent inconsistency (no runtime impact today): `yield-discovery.ts` `windowKey` uses `Math.round`, adapters use `Math.floor` — unify to `Math.floor` after submission (plan F2).

Full report: `docs/reviews/2026-09-12-johnku-morning-update-analysis.md`. Competition finish-line: `docs/superpowers/plans/2026-09-12-competition-finish-line.md`.

### Phase 3 small fixes (2026-09-13, `11aff9b`)

- **F2 applied — `windowKey` bucketing aligned to `Math.floor`.** `packages/shared/src/yield-discovery.ts` used `Math.round(Date.parse(windowStart)/DAY_MS)` while both DEX adapters normalize citation windows with `utcDayStart()` (`Math.floor`). With normalized midnight starts both agree, but a non-normalized `windowStart` just before midnight would be bucketed to the next day by `round` and the same day by `floor`, splitting ranking from citations. Now both use `Math.floor`; existing tests (all midnight-start fixtures) are unaffected.
- **R1 DEX probe flakiness is real — record before recording.** On 2026-09-12 the first `pnpm probe:yields` run returned 0/2 FAIL (gateway transient), rerun 2/2 OK. Re-run both probes immediately before recording the demo; a one-off fail is expected, a second consecutive fail is a signal to investigate.
- F1 applied — checkpoint advanced to `11aff9b`.

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

### Partner — verify the deployed remote MCP server

The user reports deployment is handled by their partner. The local Vercel contract probe is green, but this task did not receive or probe the production URL, so do not infer its external status.

1. `pnpm vercel:probe`, then `vercel --prod`. Framework Preset must be **Other** — settings table in `docs/deployment-vercel.md` §3.
2. `curl https://<app>.vercel.app/api/health` → expect five fields with `"live": true`.
3. `curl` `tools/list` against `/api/mcp` → expect six tool names.
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
