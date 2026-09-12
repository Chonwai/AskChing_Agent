# AskChing Demo Prompts

## Demo A — required comparison

> Compare live USDC supply APY across Aave V3, Compound V3, and Spark Lend right now. Rank the results, cite each source, and state the as-of time. Every result must state the `asOf` block timestamp.

Expected path: three source queries (`aave-v3`, `compound-v3`, `spark-lend`), normalized percent values, ranked rows, three source IDs, `asOf`, and caveats.

## Demo B — evidence follow-up

> Re-query the live sources and show me the citation structure for any protocol in the result: subgraph, block, query hash, and observation timestamp. Do not add any number that is not in the tool result. Every result must state the `asOf` block timestamp.

Expected path: a fresh fan-out that surfaces the evidence structure for at least one source — subgraph identity, block, query hash, and observation timestamp — with no invented numbers and the `asOf` restated.

> **跨 prompt 引用限制（stateless CLI）：** 每支 CLI 呼叫皆 stateless（`runGrokOrchestrator` 單次執行），**無法**引用上一支 CLI 的 tool result。因此 Demo B 不可假設 Grok「追蹤 top result 回到先前的 citation」；它必須**重新查詢**並展示 citation 結構。若 Grok 回「I don't have the previous result」，請改用 run-script §2.3 的 zoom-in 變體（畫面 zoom-in 現有 ranked 結果的 citation 欄位）。

## Demo C — honest spot snapshot

> Scan Aave V3, Compound V3, and Spark Lend for unusual USDC risk over seven days. Every result must state the `asOf` block timestamp.

`risk_scan` is implemented as a peer-relative spot snapshot: it compares current USDC supply-market metrics across the three sources and flags outliers relative to peers at the current block. It does not read historical time-series, so the response must be explicit that this is a spot signal — a seven-day trend cannot be claimed. Historical time-series belongs to the dedicated `analyze_trends` tool (Demo F), not `risk_scan`.

## Demo D — transparent yield-opportunity analysis

> Analyze the best current USDC supply-yield opportunity across Aave V3, Compound V3, and Spark Lend. Show the APY spread calculation, utilization context, confidence, citations, caveats, and `asOf`.

Expected path: Grok selects `analyze_markets` with `yield_opportunity`. The result ranks only comparable spot APY definitions, explains the leader-versus-runner-up spread, and cites at least two distinct sources. It is research, not a forecast or recommendation.

## Demo E — explainable liquidity-stress analysis

> Analyze current USDC liquidity-stress signals across Aave V3, Compound V3, and Spark Lend. Explain each utilization threshold, peer rank, TVL context, citations, and `asOf`.

Expected path: `analyze_markets` uses `liquidity_stress`, labels utilization below 80% as `info`, 80–90% inclusive as `watch`, and above 90% as `high`. TVL is described only as scale context, never available liquidity or proof of safety.

## Demo F — cited historical trend analysis (v1.1)

> How has USDC supply APY trended across Aave V3, Compound V3, and Spark Lend over the last seven days? Give each protocol's direction and change, cite every data point, and state the `asOf` time.

Expected path: Grok selects `analyze_trends` with `metric: "supply_apy"`, `window: "7d"`, and the three protocols. The result returns, per protocol, a cited daily-snapshot series plus descriptive statistics — `earliest`/`latest`, `change`, `changePct`, `slopePerDay` (least-squares), `direction` (`rising`/`falling`/`flat`), `volatility`, `min`/`max` — each backed by at least two cited `MarketDailySnapshot` points carrying `subgraphId`, `block`, `timestamp`, and `queryHash`.

A utilization variant:

> Is USDC utilization trending up at Aave V3, Compound V3, or Spark Lend over the last seven days?

Expected path: `analyze_trends` with `metric: "utilization"`, `window: "7d"`. When a protocol has fewer snapshots than the requested window, the result reports an explicit gap and computes the trend only from the available points — it never pads or extrapolates. The trend is descriptive; it is not a forecast or financial recommendation.

## Demo G — cross-venue USDC yield discovery (20–30 seconds)

> Where can I earn yield on USDC across lending, Uniswap V3, and Curve? Keep lending and LP rankings separate, show every formula and citation, explain the risk flags, and do not propose a transaction.

Expected path: Grok selects `discover_yields`. The screen shows two rankings, not one blended winner: lending uses current variable supply APY, while DEX LP uses `dailySupplySideFeesUsd / tvlUsd × 365 × 100` on the latest complete common UTC day. A non-null `crossDexWinner` requires qualifying cited Uniswap V3 and Curve results on that day. Point out the $1M default TVL floor, the pool addresses, `asOf`, source gaps, and that incentives, gas, compounding, and position-level returns are excluded. Keep the rankings separate and do not call the result a recommendation.


## Locked live sources

| Protocol | Network | Graph subgraph ID |
| --- | --- | --- |
| Aave V3 | Ethereum mainnet | `JCNWRypm7FYwV8fx5HhzZPSFaMxgkPuw4TnR3Gpi81zk` |
| Compound V3 | Ethereum mainnet | `AwoxEZbiWLvv6e3QdvdMZw4WDURdGbvPfHmZRc8Dpfz9` |
| Spark Lend | Ethereum mainnet | `GbKdmBe4ycCYCQLQSjqGg6UHYoYfbyJyq5WrG35pv1si` |
| Uniswap V3 | Ethereum mainnet | `4cKy6QQMc5tpfdx8yxfYeb9TLZmgLQe44ddW1G7NwkA6` |
| Curve | Ethereum mainnet | `3fy93eAT56UJsRCEht8iFhfi6wjHWXtZ9dnnbQmvFopF` |

The lending sources use the Messari lending schema. The DEX rows are pinned candidates in `packages/shared/src/yield-sources.ts`; run `pnpm probe:yields` and check their `live` flags before calling them live in a recording. Recheck index status in Graph Explorer before recording the demo.
