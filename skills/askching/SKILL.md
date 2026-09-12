---
name: askching
description: Use when a user asks to compare or analyze supported DeFi markets, discover USDC lending and stablecoin LP yields, review trends, request a cited brief, or scan supported protocols through AskChing MCP.
allowed-tools:
  - compare_markets
  - research_brief
  - risk_scan
  - analyze_markets
  - analyze_trends
  - discover_yields
version: 0.1.0
license: MIT
compatibility:
  - claude-code
  - codex
  - cursor
  - vscode
  - claude-desktop
  - gemini-cli
metadata:
  category: research/data
  author: "AskChing"
---

> **⚠️ 平台命名註記（ESC-VPW-001）**：Claude Code 對 MCP tool 的 `allowed-tools` 命名慣例可能需 `mcp__askching__<tool>` 前綴（如 `mcp__askching__compare_markets`）。若裸工具名在 Claude Code 不生效，請改用前綴形式。此項需在目標平台實測驗證。

# AskChing

## Overview

Use AskChing as the research tool layer. Treat its cited structured output as evidence, and keep unsupported claims visible as gaps.

## Choose a tool

| Request | Tool |
| --- | --- |
| Compare the same metric across two or more protocols | `compare_markets` |
| Synthesize a question into a cited brief | `research_brief` |
| Look for peer-relative metric changes | `risk_scan` |
| Explain yield opportunity, liquidity stress, or evidence quality with transparent calculations | `analyze_markets` |
| Ask how a metric moved over the last 7 or 30 days | `analyze_trends` |
| Discover USDC yield across lending, Uniswap V3, and Curve | `discover_yields` |

The implementation supports four metrics — `supply_apy`, `borrow_apy`, `tvl`, `utilization` — four assets — `USDC`, `USDT`, `DAI`, `WETH` — and four live protocols — `aave-v3`, `compound-v3`, `spark-lend`, `aave-v2`. Older deployments (`uwu-lend`, `zerolend`, `compound-v2`, `rari-fuse`, `makerdao`, `euler`) are registered but not live: they either lack a USDC market or predate the shared schema, so a request naming them fails closed and comes back as an explicit gap. `compare_markets`, `research_brief`, `risk_scan`, and `analyze_markets` answer from a current snapshot, so `risk_scan` must never be described as historical analysis. Only `analyze_trends` carries the time dimension, over a `7d` or `30d` window of daily snapshots.

Pass the asset in natural language (e.g. "Compare USDT supply APY" → `asset: "USDT"`). The legacy metric alias `usdc_supply_apy` still works and is equivalent to `supply_apy` + `asset: "USDC"`.

For `analyze_markets`, choose one objective:

- `yield_opportunity`: rank current supply APY and include utilization context.
- `liquidity_stress`: rank utilization; below 80% is `info`, 80–90% inclusive is `watch`, and above 90% is `high`. TVL is scale context, never available liquidity.
- `evidence_quality`: report coverage, distinct sources, timestamp skew, gaps, and confidence without claiming protocol safety.

Every objective is spot research only. Preserve a requested historical timeframe as an explicit gap; never turn it into a forecast, risk score, trading instruction, or financial recommendation.

For `analyze_trends`, pass one metric, at least two protocols, and an explicit `window`:

- Read `findings[].stats` for `change`, `changePct`, `slopePerDay`, `direction`, and `volatility`. `direction` is `flat` when the least-squares slope stays inside a narrow band around the series mean.
- `severity` is `info` below a 15% move, `watch` from 15%, and `high` from 30%.
- `30d` over a shorter history returns explicit `gaps`; never describe the result as a full month of data.
- Trends are descriptive history. Report them as measured movement, never as a forecast, risk score, trading instruction, or financial recommendation.
- Route history questions here rather than to `risk_scan`, which has no time dimension.

For `discover_yields`, v1 supports USDC on Ethereum mainnet with USDT/DAI counterparts. Keep lending supply APY and DEX LP `estimatedFeeApr` ranked separately. Show `dailySupplySideFeesUsd`, `tvlUsd`, and the formula `fees / TVL × 365 × 100`; never call them equivalent returns. Carry `fee_returns_variable`, `impermanent_loss`, and other returned risk flags. Uniswap V3 adds `concentrated_liquidity` and `position_range_dependent`; Curve pools may add `multi_asset_pool`. Use `crossDexWinner` only when both DEX venues share a complete UTC day. Make no transaction, deposit instruction, forecast, or recommendation.

## Call pattern

1. Select the smallest tool matching the request.
2. Pass at least two protocols for a comparison or a trend.
3. For `analyze_trends`, always pass `window` as `7d` or `30d`.
4. Preserve the returned metric definition and unit.
5. Present every numeric market value with its protocol and source.
6. State the returned `asOf` time.
7. Carry `caveats` and source gaps into the answer.

Example input:

```json
{
  "metric": "supply_apy",
  "asset": "USDC",
  "protocols": ["aave-v3", "compound-v3", "spark-lend"]
}
```

Analysis input:

```json
{
  "objective": "liquidity_stress",
  "asset": "USDC",
  "protocols": ["aave-v3", "compound-v3", "spark-lend"]
}
```

Trend input:

```json
{
  "metric": "utilization",
  "asset": "USDC",
  "protocols": ["aave-v3", "compound-v3", "spark-lend"],
  "window": "7d"
}
```

Yield discovery input:

```json
{ "asset": "USDC", "venues": ["lending", "uniswap-v3", "curve"], "minTvlUsd": 1000000 }
```

## Evidence gate

Before using a number, confirm its row includes `subgraphId`, `timestamp`, and `queryHash`. Confirm a comparison or quantitative finding contains at least two distinct subgraph sources. If either check fails, report the evidence gap and do not rank or synthesize the values.

For `analyze_trends`, every entry in `findings[].points` must also carry `block` and a `days` snapshot index, and the series must be ordered by `days`. If a window returned fewer points than requested, relay the matching gap instead of implying full coverage.

If a tool returns an error or an explicit gap, relay that limitation. Do not replace it with remembered rates, inferred risk scores, or uncited market data.

For DEX rows, also require `poolAddress`, `windowStart`, and `windowEnd`. A non-null `crossDexWinner` requires qualifying cited Uniswap V3 and Curve rows on that same window.

## Output shape

Lead with the comparison conclusion, then show the ranked values, `asOf`, sources, and caveats. For `analyze_trends`, lead with the direction per protocol before the statistics, and keep the `points` series available as cited evidence. Label fixture output as fixture data when `DEMO_LIVE=0`; only describe results as live when the server is configured with `DEMO_LIVE=1` and succeeds.
