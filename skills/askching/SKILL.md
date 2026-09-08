---
name: askching
description: Use when a user asks to compare supported DeFi markets, request a cited multi-subgraph research brief, or scan supported protocols for metric-based risk signals through the AskChing MCP.
---

# AskChing

## Overview

Use AskChing as the research tool layer. Treat its cited structured output as evidence, and keep unsupported claims visible as gaps.

## Choose a tool

| Request | Tool |
| --- | --- |
| Compare the same metric across two or more protocols | `compare_markets` |
| Synthesize a question into a cited brief | `research_brief` |
| Look for peer-relative metric changes | `risk_scan` |

The implementation supports `usdc_supply_apy` research across `aave-v3`, `compound-v3`, and `spark-lend`. `risk_scan` reports peer-relative spot signals and must not be described as historical analysis.

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
  "metric": "usdc_supply_apy",
  "protocols": ["aave-v3", "compound-v3", "spark-lend"]
}
```

## Evidence gate

Before using a number, confirm its row includes `subgraphId`, `timestamp`, and `queryHash`. Confirm a comparison contains at least two distinct subgraph sources. If either check fails, report the evidence gap and do not rank or synthesize the values.

If a tool returns an error or an explicit gap, relay that limitation. Do not replace it with remembered rates, inferred risk scores, or uncited market data.

## Output shape

Lead with the comparison conclusion, then show the ranked values, `asOf`, sources, and caveats. Label fixture output as fixture data when `DEMO_LIVE=0`; only describe results as live when the server is configured with `DEMO_LIVE=1` and succeeds.
