# AskChing — ETHOnline 2026 Submission Copy

> **用途：** 本文件內容可直接複製貼上 ETHGlobal 提交表單。
> **特性：** 精確描述已實作功能；不包含任何未實作能力或誇大聲明。

---

## Title

AskChing: Grok-Reasoning Agent for Multi-Subgraph DeFi Research

**字數檢查：** 63 chars（> 60 chars 限制 → ⚠️ 需縮短）

### Shortlisted Titles（< 60 chars）

| Title | Length | 說明 |
| --- | --- | --- |
| AskChing: Multi-Subgraph DeFi Research Agent | 44 | ✅ 推薦 |
| AskChing: Grok DeFi Research Agent | 34 | ✅ 精簡 |
| AskChing: Cited DeFi Research Agent | 35 | ✅ 強調證據 |

**標題規則：** 避免「Trading」「Yield」「Bot」字眼；強調 research + evidence。

---

## Tagline / Short Description

AskChing is a cited research agent that compares live DeFi lending metrics across multiple The Graph subgraphs using Grok.

**字數檢查：** 122 chars（< 280 chars ✅）

### 備選

| 版本 | Length | 說明 |
| --- | --- | --- |
| Ask one DeFi research question, get a normalized cross-protocol answer with citations back to live subgraphs. | 109 | ✅ |
| A Grok-orchestrated research MCP that fans out across live subgraphs and returns evidence-traceable DeFi comparisons. | 117 | ✅ |

---

## Long Description（3–5 段）

**段落結構：Problem → Solution → How it works → Tech → Future**

### Paragraph 1 — Problem

> DeFi lending rates are scattered across protocol-specific subgraphs, each with its own schema, metric definitions, and units. Comparing USDC supply APY across Aave, Compound, and Spark means writing queries by hand and trusting whatever numbers you can line up. There is no easy way to verify that two "APY" values actually mean the same thing.

### Paragraph 2 — Solution

> AskChing is a cited research agent that answers one natural-language DeFi research question and returns a ranked, normalized comparison across multiple live The Graph subgraphs. Evidence is not a display option — it is a structural invariant: every number is traceable to a live subgraph, and AskChing refuses to guess. It is research software, not a trading bot: it never executes transactions and never guesses a metric it cannot cite.

### Paragraph 3 — How it works

> Ask a question like "Compare live USDC supply APY across Aave V3, Compound V3, and Spark Lend." Grok reads the request, selects an AskChing research tool, and the agent fans out to three live Ethereum subgraphs using the Messari lending schema. Observations sharing the same metric definition and unit are ranked, and the answer carries the subgraph, block, query hash (the same query is run against each source, so the hash is the same across sources), and an explicit as-of time for each source. If fewer than two sources come back with full citations, the comparison fails closed instead of returning a partial answer.

### Paragraph 4 — Tech

> Built with TypeScript in a pnpm monorepo: a shared normalization and evidence layer, an MCP server exposing `compare_markets`, `research_brief`, and `risk_scan` over stdio, and a Grok-orchestrated CLI that runs an OpenAI-compatible in-process tool-calling loop. All behavioral checks run under Vitest, and a deterministic fixture mode keeps the demo reproducible.

### Paragraph 5 — Future

> The next step is real historical time-series queries so the risk scan can assess trend, not just peer-relative spot signals. The evidence-first design — citation enforcement, explicit gaps, and normalization — is built to scale to more protocols and more metrics.

---

## Tech List

| Tech | 用途 |
| --- | --- |
| The Graph | Live subgraph fan-out（Aave V3 / Compound V3 / Spark Lend, Ethereum mainnet, Messari schema） |
| xAI Grok | Natural-language reasoning + tool selection + synthesis |
| Model Context Protocol (MCP) | `compare_markets` / `research_brief` / `risk_scan` over stdio |
| TypeScript | 全端型別安全 |
| pnpm monorepo | `packages/shared` / `packages/mcp-server` / `packages/grok-orchestrator` |
| Vitest | 行為測試（comparison/evidence/risk 邏輯） |
| Subgraph Studio | Live gateway 存取（`GRAPH_API_KEY`） |

---

## Repo URL

`https://github.com/Chonwai/AskChing_Agent`

---

## Video

```text
[Placeholder: 2–3 minute demo — see docs/superpowers/plans/2026-09-09-showcase-run-script.md for the script]
```

---

## 準確性規範（Submission Integrity）

本文件所有陳述皆對應已實作功能：

| 聲明 | 對應實作 |
| --- | --- |
| 三源 fan-out | `packages/shared/src/source-config.ts` — LIVE_SOURCES 三條 |
| Messari schema | 三 subgraph 皆使用 Messari lending schema |
| `compare_markets` / `research_brief` / `risk_scan` | `packages/mcp-server/src/tools.ts` |
| OpenAI-compatible in-process loop | `packages/grok-orchestrator/src/loop.ts` runGrokOrchestrator |
| 證據（subgraph/block/queryHash） | `compareObservations` + citation enforcement |
| Risk = spot snapshot，非歷史 | `riskScan` gaps 明確標示 |
| Evidence = structural invariant | `CitationSchema` 缺欄位即 fail + `compareObservations` 少於 2 源即 fail |
| research software, 非 trading bot | README + 本文件皆明示 |