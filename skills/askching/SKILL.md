---
name: askching
description: Use when a user asks to compare or analyze supported DeFi markets, request a cited multi-subgraph research brief, or scan supported protocols for evidence-first market signals through the AskChing MCP.
allowed-tools:
  - compare_markets
  - research_brief
  - risk_scan
  - analyze_markets
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

The implementation supports spot research across four metrics — `supply_apy`, `borrow_apy`, `tvl`, `utilization` — four assets — `USDC`, `USDT`, `DAI`, `WETH` — and six live protocols — `aave-v3`, `compound-v3`, `spark-lend`, `aave-v2`, `uwu-lend`, `zerolend`. `risk_scan` reports peer-relative spot signals and must not be described as historical analysis.

Pass the asset in natural language (e.g. "Compare USDT supply APY" → `asset: "USDT"`). The legacy metric alias `usdc_supply_apy` still works and is equivalent to `supply_apy` + `asset: "USDC"`.

For `analyze_markets`, choose one objective:

- `yield_opportunity`: rank current supply APY and include utilization context.
- `liquidity_stress`: rank utilization; below 80% is `info`, 80–90% inclusive is `watch`, and above 90% is `high`. TVL is scale context, never available liquidity.
- `evidence_quality`: report coverage, distinct sources, timestamp skew, gaps, and confidence without claiming protocol safety.

Every objective is spot research only. Preserve a requested historical timeframe as an explicit gap; never turn it into a forecast, risk score, trading instruction, or financial recommendation.

## Call pattern

1. Select the smallest tool matching the request.
2. Pass at least two protocols for a comparison.
3. Preserve the returned metric definition and unit.
4. Present every numeric market value with its protocol and source.
5. State the returned `asOf` time.
6. Carry `caveats` and source gaps into the answer.

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

## Evidence gate

Before using a number, confirm its row includes `subgraphId`, `timestamp`, and `queryHash`. Confirm a comparison or quantitative finding contains at least two distinct subgraph sources. If either check fails, report the evidence gap and do not rank or synthesize the values.

If a tool returns an error or an explicit gap, relay that limitation. Do not replace it with remembered rates, inferred risk scores, or uncited market data.

## Output shape

Lead with the comparison conclusion, then show the ranked values, `asOf`, sources, and caveats. Label fixture output as fixture data when `DEMO_LIVE=0`; only describe results as live when the server is configured with `DEMO_LIVE=1` and succeeds.
