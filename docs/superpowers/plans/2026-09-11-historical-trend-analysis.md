# AskChing v1.1 — Historical Trend Analysis 實作計畫

> 建立日期: 2026-09-11｜狀態: approved｜對應研究: `docs/reviews/2026-09-11-messari-timeseries-research.md`
> 目的: 把 AskChing 從 spot-only 升級為「會判趨勢」的研究 agent；補上最大敘事缺口

---

## 1. 問題陳述

AskChing 目前 4 個工具全部是**現況快照**：

- `compare_markets` — 現在哪個協議利率最高
- `research_brief` — 現在的研究摘要
- `risk_scan` — 現在的 peer-relative 訊號（明確標示 _not historical_）
- `analyze_markets` — 現在的收益率/流動性/證據品質判讀（明確標 spot-only）

**缺口**：無法回答 DeFi 研究員最基本的一類問題——「**過去 7 天 USDC 供應利率怎麼走？**」

The Graph 的核心價值正是「不可變鏈上歷史可查」。目前我們自願放棄了這 90% 的能力，並在文件中誠實標示 spot-only。補上時間維度 = 直接命中評審期待，也是對 `graph-lending-mcp` 的差異化（對手有 snapshots 但無趨勢洞察）。

---

## 2. 目標與非目標

**Goals**

- G1: 新增第 5 個 MCP 工具 `analyze_trends`，支援 `7d` / `30d` window
- G2: 每個協議輸出時間序列 + 趨勢統計（change / changePct / slopePerDay / direction / volatility / min / max）
- G3: 沿用證據不變量：每個數據點帶 `subgraphId`+`block`+`timestamp`+`queryHash`；每 finding ≥2 citations；fail-closed
- G4: Grok orchestrator 可由自然語言路由到此工具
- G5: Fixture + Live 雙模式皆可用

**Non-Goals**

- NG1: 不做預測/forecast（趨勢分析 ≠ 預測）
- NG2: 不做 custom UI/圖表（CLI/MCP 輸出）
- NG3: 不做 Substreams / 自建 indexer
- NG4: 不改動既有 4 個工具的行為（純新增）

---

## 3. 設計

### 3.1 三層敘事（工具定位）

| 工具                 | 回答什麼                           | 時間維度     |
| -------------------- | ---------------------------------- | ------------ |
| `compare_markets`    | 現在哪個協議利率最高？             | 現況快照     |
| `analyze_markets`    | 現在的收益率/流動性/證據品質如何？ | 現況判讀     |
| **`analyze_trends`** | **過去 7/30 天趨勢如何？**         | **時間序列** |

### 3.2 資料流

```
analyze_trends({ metric, asset, protocols, window })
  ↓
MarketDataSource.getHistory(metric, protocols, asset, days)
  ├─ fixture mode: MARKET_HISTORY_FIXTURES 過濾
  └─ live mode: GraphGatewayClient.getMarketHistory(source, metric, asset, days)
       └─ GET_MARKET_HISTORY_QUERY（嵌套 dailySnapshots）
  ↓
analyzeTrendSeries({ metric, asset, protocols, window, series, gaps })
  ↓
AnalyzeTrendsResult { summary, findings[], gaps[], asOf }
```

### 3.3 Schema（`packages/shared/src/schemas.ts` 新增）

```ts
export const TrendWindowSchema = z.enum(['7d', '30d']);

// 單一歷史數據點 = citation + days
export const TrendPointSchema = MarketObservationSchema.extend({
  days: z.number().int().nonnegative(),
});

export const TrendStatsSchema = z.object({
  latest: z.number(),
  earliest: z.number(),
  min: z.number(),
  max: z.number(),
  change: z.number(), // latest - earliest
  changePct: z.number(), // ((latest-earliest)/earliest)*100
  slopePerDay: z.number(), // 線性回歸斜率
  direction: z.enum(['rising', 'falling', 'flat']),
  volatility: z.number(), // 每日變化的標準差
});

export const TrendFindingSchema = z.object({
  severity: AnalysisSeveritySchema,
  protocol: ProtocolSchema,
  claim: z.string().min(1),
  calculation: z.string().min(1),
  stats: TrendStatsSchema,
  points: z.array(TrendPointSchema).min(2),
  citations: z.array(AnalysisCitationSchema).min(2),
  confidence: AnalysisConfidenceSchema,
  caveats: z.array(z.string()),
});

export const AnalyzeTrendsResultSchema = z.object({
  metric: MarketMetricIdSchema,
  asset: AssetSymbolSchema,
  protocols: z.array(ProtocolSchema).min(2),
  window: TrendWindowSchema,
  summary: z.string().min(1),
  findings: z.array(TrendFindingSchema).min(1),
  gaps: z.array(AnalysisGapSchema),
  asOf: z.string().datetime(),
});
```

**設計決策**：`TrendPoint` 繼承 `MarketObservationSchema` → 保留完整 citation 欄位（fail-closed 不變量自動套用）。

### 3.4 Graph 查詢（`graph-client.ts` 新增）

```graphql
query AskChingMarketHistory {
  markets(first: 100, orderBy: totalValueLockedUSD, orderDirection: desc) {
    inputToken {
      symbol
    }
    dailySnapshots(first: 31, orderBy: days, orderDirection: desc) {
      days
      timestamp
      blockNumber
      rates {
        rate
        side
        type
      }
      totalDepositBalanceUSD
      totalBorrowBalanceUSD
      totalValueLockedUSD
    }
  }
  _meta {
    deployment
    block {
      number
      timestamp
    }
  }
}
```

**Metric 提取（複用 `MetricDescriptor.extractor`）**：

- `rates` → 從 snapshot.rates 取 LENDER/VARIABLE（supply_apy）或 BORROWER/VARIABLE（borrow_apy）
- `tvl` → snapshot.totalValueLockedUSD
- `utilization` → snapshot.totalBorrowBalanceUSD / snapshot.totalDepositBalanceUSD × 100

**Fail-closed 退路**：rates 為空的 snapshot → 跳過該點並記 gap（explicit gap，不編造）。

### 3.5 DataSource 介面擴展（`data-source.ts`）

```ts
export interface MarketDataSource {
  getObservations(...): Promise<MarketObservation[]>;
  getHistory(                             // 新增
    metric: MarketMetric | MarketMetricId,
    window: TrendWindow,
    protocols?: readonly ProtocolSlug[],
    asset?: string
  ): Promise<TrendSeries[]>;              // 每協議一條 series
}
```

### 3.6 分析引擎（`analysis.ts` 新增）

`analyzeTrendSeries(input): AnalyzeTrendsResult`

趨勢統計演算法：

- `latest` / `earliest`：按 `days` 排序後首尾
- `change` / `changePct`
- `slopePerDay`：最小平方線性回歸（x = days, y = value）
- `direction`：|slopePerDay| < 閾值（相對值的 0.5%）→ `flat`；> 0 → `rising`；< 0 → `falling`
- `volatility`：每日差異的標準差
- `confidence`：≥3 源 + 0 gaps + 每協議 ≥5 點 → high；否則 medium
- `severity`：依 direction + changePct（大幅變動 → watch/high）
- **caveats 固定包含**：「Historical trend is descriptive, not a forecast.」

---

## 4. Commit 序列（hackathon 風格，小步提交）

| #   | Commit message                                         | 內容                                 | 驗證                           |
| --- | ------------------------------------------------------ | ------------------------------------ | ------------------------------ |
| 1   | `docs: research Messari lending timeseries capability` | 研究報告                             | ✅ done                        |
| 2   | `docs: plan historical trend analysis tool`            | 本計畫                               | file exists                    |
| 3   | `feat(shared): add trend analysis schemas`             | schemas.ts + schema test             | `pnpm test`                    |
| 4   | `feat(shared): add market history fixtures`            | fixtures.ts                          | `pnpm test`                    |
| 5   | `feat(shared): add market history query`               | graph-client.ts                      | `pnpm test`                    |
| 6   | `feat(shared): add history data source method`         | data-source.ts + test                | `pnpm test`                    |
| 7   | `feat(shared): compute trend statistics`               | analysis.ts + test                   | `pnpm test`                    |
| 8   | `feat(mcp): expose analyze_trends tool`                | tools.ts + index.ts + test           | `pnpm test` + `pnpm mcp:smoke` |
| 9   | `feat(orchestrator): route trend analysis`             | loop.ts + test                       | `pnpm test`                    |
| 10  | `test(evals): add trend analysis cases`                | evals/cases.json + run.ts            | `pnpm eval`                    |
| 11  | `docs: document analyze_trends and update narrative`   | README + SKILL.md + engineering-spec | docs                           |

---

## 5. 風險與緩解

| 風險                                       | 等級  | 緩解                                                       |
| ------------------------------------------ | ----- | ---------------------------------------------------------- |
| `dailySnapshots.rates` 在某 subgraph 為空  | 🟡 中 | utilization 退路 + explicit gap（fail-closed）             |
| Live 模式無法在無 key 環境驗證             | 🟡 中 | fixture 模式完整覆蓋；live 留待有 key 時 `pnpm live:smoke` |
| Snapshot 數量 < window                     | 🟢 低 | explicit gap；以實際點數計算                               |
| 破壞既有 4 tools                           | 🟢 低 | 純新增；跑完整 `pnpm test` + `pnpm eval` 把關              |
| 工具數量增加致 SKILL.md/evals 契約測試失敗 | 🟡 中 | 同步更新 `evals/skill-contract.test.ts` 期望值             |

---

## 6. 驗收標準

- [ ] `pnpm build` 全綠（3 packages）
- [ ] `pnpm test` 全綠（含新增 trend tests）
- [ ] `pnpm eval` 全綠（含新增 trend eval cases）
- [ ] `pnpm mcp:smoke` 顯示 **5 tools**（含 `analyze_trends`）
- [ ] `analyze_trends` 在 fixture 模式回傳 ≥2 protocols 的趨勢 findings
- [ ] 每個 finding ≥2 citations；rates 缺失時有 explicit gap
- [ ] Grok `ASKCHING_TOOLS` 含 `analyze_trends` 且可路由

---

## 7. 差異化說明（vs graph-lending-mcp）

| 面向     | graph-lending-mcp               | AskChing v1.1                                 |
| -------- | ------------------------------- | --------------------------------------------- |
| 歷史數據 | dailySnapshots tool（原始快照） | ✅ 趨勢統計洞察（slope/direction/volatility） |
| 證據     | raw snapshot                    | ✅ citation 化的每個數據點 + fail-closed      |
| 缺口處理 | 無                              | ✅ explicit gaps（snapshot 不足/rates 空）    |
| 定位     | 「問得到歷史」                  | 「**信得過趨勢**」                            |
