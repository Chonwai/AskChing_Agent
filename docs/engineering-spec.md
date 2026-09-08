# AskChain — Engineering Spec & Development Plan

> AskChain 是一個 Grok-orchestrated research MCP over The Graph。  
> 本文檔定義技術架構、API 契約、開發路線圖和驗收標準。

---

## Table of Contents

1. [系統架構](#1-系統架構)
2. [Package 結構](#2-package-結構)
3. [核心 Schema 定義](#3-核心-schema-定義)
4. [MCP Tools API 契約](#4-mcp-tools-api-契約)
5. [Graph Gateway Client](#5-graph-gateway-client)
6. [Grok Orchestrator](#6-grok-orchestrator)
7. [Data Source 層](#7-data-source-層)
8. [Evals 套件](#8-evals-套件)
9. [Development Plan（5 天 Roadmap）](#9-development-plan)
10. [Acceptance Criteria](#10-acceptance-criteria)
11. [Out of Scope](#11-out-of-scope)
12. [Risk Register](#12-risk-register)

---

## 1. 系統架構

```
┌──────────────────────────────────────────────────────────┐
│                    AskChain Stack                         │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │  Client Layer                                      │  │
│  │  • Grok Bot (Phase 1)                              │  │
│  │  • Cursor / Codex / Gemini (Phase 2)               │  │
│  │  • Any MCP-compatible agent                        │  │
│  └─────────────────────┬──────────────────────────────┘  │
│                        │ stdio (MCP protocol)             │
│  ┌─────────────────────▼──────────────────────────────┐  │
│  │  MCP Server (@askching/mcp-server)                 │  │
│  │  ┌──────────────┬──────────────┬────────────────┐  │  │
│  │  │compare_markets│research_brief│   risk_scan    │  │  │
│  │  └──────┬───────┴──────┬───────┴───────┬────────┘  │  │
│  │         │              │               │             │  │
│  │  ┌──────▼──────────────▼───────────────▼────────┐  │  │
│  │  │  Shared Layer (@askching/shared)              │  │  │
│  │  │  • compareObservations()                     │  │  │
│  │  │  • createMarketDataSource()                  │  │  │
│  │  │  • GraphGatewayClient                        │  │  │
│  │  │  • Zod schemas (Citation, Observation, etc.) │  │  │
│  │  └──────────────────┬───────────────────────────┘  │  │
│  └─────────────────────┼──────────────────────────────┘  │
│                        │                                 │
│  ┌─────────────────────▼──────────────────────────────┐  │
│  │  Data Layer                                        │  │
│  │  • The Graph Gateway (live) — API key required     │  │
│  │  • Fixtures (dev/test) — DEMO_LIVE=0              │  │
│  │  • Messari Standardized Subgraphs                  │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │  Orchestrator (@askching/grok-orchestrator)       │  │
│  │  • xAI Grok tool-calling loop                     │  │
│  │  • in-process import MCP handlers                 │  │
│  │  • Natural language → structured brief            │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │  Agent Playbook (skills/askching/SKILL.md)        │  │
│  │  • Thin, points to MCP verbs                      │  │
│  │  • Rules, not logic                               │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

### 關鍵設計原則

| 原則 | 說明 |
|------|------|
| **The Graph 是 load-bearing** | 拔掉 The Graph → AskChain 沒有意義 |
| **自研 MCP，不套殼** | 我們的 server 包含 normalization + citation + synthesis，官方 MCP 只是 dependency |
| **Fixture + Live 雙模式** | `DEMO_LIVE=0` 用 fixture（開發/測試），`DEMO_LIVE=1` 用 live Studio gateway |
| **Fail-closed** | 缺 credential / schema 錯誤 / 數據不足 → 明確報錯，不猜測 |
| **Citation 強制** | 每個數字必須帶 subgraphId + block + timestamp + queryHash，缺欄位就 fail |

---

## 2. Package 結構

```
AskChing_Agent/
├── packages/
│   ├── shared/                    # @askching/shared
│   │   └── src/
│   │       ├── schemas.ts         # Zod: Citation, MarketObservation, Comparison
│   │       ├── compare.ts         # compareObservations()
│   │       ├── data-source.ts     # createMarketDataSource(env)
│   │       ├── graph-client.ts    # GraphGatewayClient
│   │       ├── source-config.ts   # LIVE_SOURCES[]
│   │       └── fixtures.ts        # MARKET_FIXTURES
│   ├── mcp-server/                # @askching/mcp-server
│   │   └── src/
│   │       ├── index.ts           # MCP server registration (stdio)
│   │       ├── tools.ts           # compareMarkets() handler
│   │       └── tools.test.ts      # Handler tests
│   └── grok-orchestrator/         # @askching/grok-orchestrator
│       └── src/
│           ├── index.ts           # Grok tool-calling loop (TO BUILD)
│           ├── loop.ts            # Core loop logic (TO BUILD)
│           └── loop.test.ts       # Loop tests (TO BUILD)
├── evals/
│   ├── cases.json                 # Eval case definitions
│   └── run.ts                     # Eval runner
├── demos/
│   ├── live-smoke.ts              # Live fixture smoke test
│   ├── demo.ts                    # One-click demo CLI (TO BUILD)
│   └── prompts.md                 # Demo prompt scripts
├── skills/
│   └── askching/
│       └── SKILL.md               # Agent playbook (thin)
├── docs/
│   ├── product-overview.md        # Product overview (this suite)
│   └── engineering-spec.md        # This document
└── .edison/state/                 # Loop state tracking
```

---

## 3. 核心 Schema 定義

所有 schema 定義在 `packages/shared/src/schemas.ts`，使用 Zod 做 runtime validation。

### 3.1 MarketMetric

```typescript
const MarketMetricSchema = z.enum(["usdc_supply_apy"]);
// Future: "eth_supply_apy", "usdc_pool_liquidity", etc.
```

### 3.2 ProtocolSlug

```typescript
const ProtocolSchema = z.enum(["aave-v3", "compound-v3"]);
// Future: "morpho-aave-v3", "spark", "fluid"
```

### 3.3 Citation（核心）

```typescript
const CitationSchema = z.object({
  value:        z.number().finite(),        // 數值
  unit:         z.literal("percent"),       // 單位（目前只支持 percent）
  protocol:     ProtocolSchema,             // 協議
  subgraphId:   z.string().min(1),          // Subgraph ID（必填）
  deploymentId: z.string().min(1).optional(), // Deployment ID
  block:        z.number().int().nonnegative().optional(), // Block number
  timestamp:    z.string().datetime(),      // ISO 8601 timestamp
  queryHash:    z.string().min(1)           // SHA-256 of the GraphQL query
});
```

**Validation rule**: 缺少任何必填欄位 → Zod parse 直接 fail，不允許無來源數字。

### 3.4 MarketObservation

```typescript
const MarketObservationSchema = CitationSchema.extend({
  metric:   MarketMetricSchema,   // 指標類型
  rateType: z.literal("variable") // 利率類型
});
```

### 3.5 Comparison（MCP 輸出）

```typescript
const ComparisonSchema = z.object({
  metric:  MarketMetricSchema,           // 指標
  asOf:    z.string().datetime(),        // 最新數據時間
  rows:    z.array(ComparisonRowSchema).min(2), // 排名結果（≥2 行）
  caveats: z.array(z.string()),          // 風險/缺口提示
  sources: z.array(ComparisonSourceSchema).min(2) // 來源列表（≥2 個）
});
```

---

## 4. MCP Tools API 契約

### 4.1 `compare_markets`（✅ 已實作）

**Input:**

```json
{
  "metric": "usdc_supply_apy",
  "protocols": ["aave-v3", "compound-v3"],
  "timeframe": "24h"  // optional, currently ignored with caveat
}
```

**Output:**

```json
{
  "metric": "usdc_supply_apy",
  "asOf": "2026-09-08T12:00:00.000Z",
  "rows": [
    {
      "rank": 1,
      "value": 4.25,
      "unit": "percent",
      "protocol": "aave-v3",
      "subgraphId": "JCNWRypm7...",
      "deploymentId": "...",
      "block": 21100100,
      "timestamp": "2026-09-08T12:00:00.000Z",
      "queryHash": "sha256:..."
    },
    {
      "rank": 2,
      "value": 3.14,
      "unit": "percent",
      "protocol": "compound-v3",
      "subgraphId": "AwoxEZbi...",
      ...
    }
  ],
  "caveats": [],
  "sources": [
    { "protocol": "aave-v3", "subgraphId": "...", ... },
    { "protocol": "compound-v3", "subgraphId": "...", ... }
  ]
}
```

**Validation rules:**
- `rows` ≥ 2（至少兩個 cited observations）
- `sources` ≥ 2（至少兩個 distinct subgraphId）
- 每個 row 必須有完整的 citation 欄位
- 單位不同的 observations 不會被放在同一個 comparison 裡

### 4.2 `research_brief`（🔨 TO BUILD）

**Input:**

```json
{
  "question": "Compare USDC supply APY across Aave V3 and Compound V3",
  "protocols": ["aave-v3", "compound-v3"]  // optional, auto-detected from question
}
```

**Output:**

```json
{
  "brief": {
    "conclusion": "Aave V3 offers higher USDC supply APY (4.25%) vs Compound V3 (3.14%) as of block 21100100.",
    "keyFigures": [
      { "protocol": "aave-v3", "metric": "usdc_supply_apy", "value": 4.25, "source": "..." },
      { "protocol": "compound-v3", "metric": "usdc_supply_apy", "value": 3.14, "source": "..." }
    ],
    "asOf": "2026-09-08T12:00:00.000Z",
    "risks": ["APY definitions may differ between protocols"],
    "suggestedFollowUp": "Check if these rates have changed in the last 24 hours"
  },
  "sources": [...],
  "caveats": [...]
}
```

**實作方式:** `research_brief` 內部呼叫 `compare_markets`，然後用模板把結果包成 brief 結構。不是獨立的查詢邏輯。

### 4.3 `risk_scan`（🔨 TO BUILD — 後期）

**Input:**

```json
{
  "protocols": ["aave-v3", "compound-v3"],
  "assets": ["USDC"],
  "window": "7d"
}
```

**Output:**

```json
{
  "scan": {
    "findings": [
      {
        "protocol": "compound-v3",
        "metric": "usdc_supply_apy",
        "change": -0.5,
        "severity": "low",
        "note": "USDC supply APY decreased 0.5% over 7d"
      }
    ],
    "gaps": ["No time-series data available for risk_scan in bootstrap slice"]
  },
  "sources": [...]
}
```

---

## 5. Graph Gateway Client

`packages/shared/src/graph-client.ts` — 自研 client，**不是**官方 Subgraph MCP。

### 5.1 設計

```typescript
class GraphGatewayClient {
  constructor({ apiKey, fetchImpl })
  async getUsdcSupplyApy(source: SubgraphSource): Promise<MarketObservation>
}
```

### 5.2 Query 模板

```graphql
query AskChingUsdcSupplyApy {
  markets(first: 100) {
    inputToken { symbol }
    rates { rate side type }
    indexLastUpdatedTimestamp
  }
  _meta {
    deployment
    block { number timestamp }
  }
}
```

### 5.3 Error Handling

| 情況 | 處理 |
|------|------|
| HTTP 非 200 | throw `The Graph request for {protocol} failed with HTTP {status}` |
| GraphQL errors | throw + 串接 error messages |
| No data | throw `returned no data` |
| No USDC rate | throw `returned no USDC lender rate` |
| No timestamp | throw `returned no source timestamp` |

### 5.4 Live Sources

| Protocol | Network | Subgraph ID | Schema |
|----------|---------|-------------|--------|
| Aave V3 | Ethereum mainnet | `JCNWRypm7FYwV8fx5HhzZPSFaMxgkPuw4TnR3Gpi81zk` | Messari lending |
| Compound V3 | Ethereum mainnet | `AwoxEZbiWLvv6e3QdvdMZw4WDURdGbvPfHmZRc8Dpfz9` | Messari lending |

**⚠️ Phase 0 必須驗證：** 用 `GRAPH_API_KEY` 跑 `DEMO_LIVE=1 pnpm live:smoke`，確認兩個 subgraph 的 USDC rate 欄位存在。

---

## 6. Grok Orchestrator

`packages/grok-orchestrator/` — Phase 1 核心缺口。

### 6.1 設計

```
User NL prompt
    ↓
Grok (xAI API) — system prompt includes SKILL.md rules
    ↓
Grok decides tool call → compare_markets({ metric, protocols })
    ↓
In-process: import compareMarkets() from @askching/mcp-server
    ↓
Grok receives structured result
    ↓
Grok synthesizes brief (conclusion + key figures + risks)
    ↓
Return to user
```

### 6.2 架構決策：In-process Import vs. Stdio Pipe

| 方案 | 優點 | 缺點 | 決定 |
|------|------|------|------|
| **In-process import** | 快、簡單、同一個 Node process | 不走 MCP stdio | ✅ **選這個** — hackathon 時間有限 |
| Stdio pipe | 更 "MCP 標準" | 需要 fork/pipe MCP server、debug 複雜 | ❌ v2 再說 |

### 6.3 Grok API Config

```typescript
// xAI API — Grok 4.6 or latest
const XAI_API_BASE = "https://api.x.ai/v1";
const MODEL = "grok-4";  // or latest available

// System prompt includes SKILL.md content
// Tools: [compare_markets, research_brief]
```

### 6.4 Fixture Mode for Development

```typescript
// DEMO_LIVE=0 → use fixture data (no API calls)
// DEMO_LIVE=1 + XAI_API_KEY → live Grok + live Graph
```

---

## 7. Data Source 層

`packages/shared/src/data-source.ts`

### 7.1 雙模式

```typescript
function createMarketDataSource(env: AskChingEnvironment): MarketDataSource
  // env.DEMO_LIVE !== "1" → fixture mode (no network)
  // env.DEMO_LIVE === "1" → live mode (requires GRAPH_API_KEY)
```

### 7.2 Fan-out 策略（Phase 2 改為 settled）

**目前（Phase 1）：** `Promise.all` — 任一 source 失敗 → 全部失敗
**Phase 2 改為：** `Promise.allSettled` — 至少 2 個 cited 存活即可出結果，其餘標 gap

```typescript
// Phase 2 pseudo
const results = await Promise.allSettled(
  sources.map(s => client.getUsdcSupplyApy(s))
);
const successful = results
  .filter(r => r.status === "fulfilled")
  .map(r => r.value);

if (successful.length < 2) {
  throw new Error("Need at least 2 cited sources for comparison");
}
// Return successful results + caveats for failed ones
```

---

## 8. Evals 套件

`evals/cases.json` + `evals/run.ts`

### 8.1 現有 Cases（5 條）

| ID | 測試內容 |
|----|---------|
| `compare-default-order` | 兩源比較，預設順序 |
| `compare-reversed-order` | 反轉順序結果一致 |
| `compare-as-of` | 結果包含 asOf |
| `compare-citations` | 每個 row 有完整 citation |
| `compare-timeframe-gap` | timeframe 參數產生 caveat |

### 8.2 Phase 2 新增 Cases（3-5 條）

| ID | 測試內容 |
|----|---------|
| `brief-output` | research_brief 輸出含 conclusion + keyFigures |
| `settled-fan-out` | 單一 source 失敗仍出結果 + gap caveat |
| `gap-detection` | 缺數據時明確標示 |
| `three-source-compare` | 3 sources 排名正確 |
| `risk-scan-basic` | risk_scan 輸出含 findings |

---

## 9. Development Plan

### Phase 0 — Live Smoke Validation（Day 0，2hr）🔴 Critical

| # | 任務 | 檔案 | AC |
|---|------|------|-----|
| 0.1 | 取得 `GRAPH_API_KEY`（Subgraph Studio） | `.env` | ✅ key 存在 |
| 0.2 | 執行 `DEMO_LIVE=1 pnpm live:smoke` | terminal | ✅ 兩個 source 都返回 JSON |
| 0.3 | 驗證 USDC rate 欄位存在（`rates[].side === "LENDER" && type === "VARIABLE"`） | 輸出 JSON | ✅ 至少一個 rate per source |
| 0.4 | 若 schema 不通 → 修 `graph-client.ts` field mapping | `graph-client.ts` | ✅ live smoke pass |
| 0.5 | 記錄 live evidence artifact（截圖/JSON） | docs/ | ✅ |

**⛔ Phase 0 失敗 → 不進入 Phase 1，先修 schema。**

---

### Phase 1 — Grok Orchestrator（Day 1-2）🔥 Highest Priority

| # | 任務 | 檔案 | AC |
|---|------|------|-----|
| 1.1 | Grok tool-calling loop（in-process import MCP handlers） | `grok-orchestrator/src/loop.ts` | ✅ 輸入 NL → 輸出 tool call + result |
| 1.2 | `research_brief` handler 實作（compare → brief template） | `mcp-server/src/tools.ts` | ✅ 回傳 brief JSON 而非 error |
| 1.3 | `npm run demo` standalone CLI（fixture mode default, `--live` flag） | `demos/demo.ts` + `package.json` | ✅ `npm run demo` 跑通 |
| 1.4 | Grok loop fixture-mode unit test | `grok-orchestrator/src/*.test.ts` | ✅ `pnpm test` 綠 |
| 1.5 | Commit: `feat(grok): implement tool-calling orchestrator` | git | ✅ |

**晚間驗收**：`DEMO_LIVE=1 npm run demo` → 輸入 "Compare USDC supply APY" → 拿到 cited brief

---

### Phase 2 — Multi-source + Settled Fan-out（Day 2-3）

| # | 任務 | 檔案 | AC |
|---|------|------|-----|
| 2.1 | 加第三 source（若 Phase 0 確認 Morpho/Spark schema 可用） | `source-config.ts` | ✅ 3 sources |
| 2.2 | Fan-out 改為 settled（`Promise.allSettled`） | `data-source.ts` | ✅ 單一 source 掛掉仍出結果 |
| 2.3 | 3 個新 eval cases | `evals/cases.json` + `run.ts` | ✅ 8/8 pass |
| 2.4 | Commit: `feat(shared): settled fan-out + third source` | git | ✅ |

---

### Phase 3 — README + Showcase + Doc Finalization（Day 3-4）

| # | 任務 | 檔案 | AC |
|---|------|------|-----|
| 3.1 | README 升級：Start Fresh 聲明 + track positioning + 安裝說明 + vs official MCP 對照 | `README.md` | ✅ 評審 10 秒懂 |
| 3.2 | Showcase page 完整更新（description + repo + video placeholder） | ethglobal.com | ✅ |
| 3.3 | SKILL.md 更新（反映 research_brief 已實作） | `skills/askching/SKILL.md` | ✅ |
| 3.4 | Commit: `docs: submission-ready README and showcase` | git | ✅ |

---

### Phase 4 — Demo Video + Submit（Day 4-5）

| # | 任務 | 說明 | AC |
|---|------|------|-----|
| 4.1 | 錄 demo video（2-4 min, ≥720p, 真人配音, live data） | 場景 A+B+C | ✅ |
| 4.2 | 上傳 video（YouTube unlisted） | URL | ✅ |
| 4.3 | 最終 live smoke（`DEMO_LIVE=1 npm run demo`） | terminal | ✅ green |
| 4.4 | 確認 git log 完整（不 squash） | `git log --oneline` | ✅ 多個 commits |
| 4.5 | 確認 repo 公開 + README 正常 | GitHub | ✅ |
| 4.6 | Update showcase + submit | ethglobal.com | ✅ |

---

## 10. Acceptance Criteria

### Per-Phase AC Summary

| Phase | Must-Have AC | Pass Criteria |
|-------|-------------|---------------|
| **Phase 0** | Live smoke pass with 2+ cited sources | JSON output with USDC rates |
| **Phase 1** | Grok loop produces cited brief from NL prompt | Brief has conclusion + numbers + sources |
| **Phase 1** | `research_brief` returns structured brief | Not "not-implemented" |
| **Phase 2** | 3 sources compared, settled fan-out works | Single failure doesn't kill comparison |
| **Phase 3** | README explains positioning in <10 seconds | "vs official MCP" table present |
| **Phase 4** | Demo video 2-4 min, live data, no AI voice | Human narrated, ≥720p |

### Final Submission AC

- [ ] Public GitHub repo with clean `git log`
- [ ] `README.md` with Start Fresh declaration
- [ ] `SKILL.md` (agent playbook)
- [ ] `npm run demo` works (fixture + live)
- [ ] `pnpm test` passes (all eval cases green)
- [ ] `pnpm build` passes (all packages)
- [ ] Demo video uploaded (2-4 min, ≥720p, human voice)
- [ ] Showcase page updated with repo URL + video URL
- [ ] Submit before 2026-09-13 12:00 PM EDT

---

## 11. Out of Scope

| 不做 | 原因 | 計畫 |
|------|------|------|
| 交易執行 / 自動下單 | 研究工具，不是交易工具 | v2.0+ |
| 自建 indexing pipeline | 用 The Graph 官方 | — |
| 華麗 UI / Dashboard | MVP 專注 CLI + MCP | v2.0+ |
| x402 付費 | 有餘力才做 | README roadmap |
| Standardized schema Composable track | 這次只打 AI tooling track | — |
| risk_scan 完整版 | 時間不夠，做最簡版 | v1.1 |

---

## 12. Risk Register

| ID | 風險 | 嚴重度 | 機率 | 緩解 | Owner |
|----|------|--------|------|------|-------|
| R1 | Live schema 不通（Messari 欄位與 mapping 不一致） | 🔴 Critical | Medium | Phase 0 驗證，失敗即改 mapping | Engineering |
| R2 | xAI API rate limit / timeout | 🔴 Critical | Medium | retry + fixture fallback for dev | Engineering |
| R3 | Demo 錄製時 live 環境掛 | 🟡 High | Medium | fixture fallback 錄製方案 | Demo Lead |
| R4 | Scope creep 導致做不完 | 🟡 High | High | 嚴格執行 Phase 順序，不加新功能 | PM |
| R5 | 第三 subgraph schema 不相容 | 🟡 Medium | Medium | Phase 0 併入驗證，不相容就不加 | Engineering |
| R6 | Track 定位被質疑 | 🟡 Medium | Low | README 明確 "AI orchestration layer" | PM |

---

*Document version: 1.0 — 2026-09-08*  
*Status: For team development and ETHOnline 2026 submission*
