# Messari Lending Time-Series 可行性研究 + 非付費強化切入點

> 建立日期: 2026-09-11｜研究者: JARVIS Deep Research（L3 Deep Dive / strict）
> 目的: 驗證 P1「歷史時序分析」技術可行性；評估 x402 以外的非付費強化切入點
> 對應 Loop: `loop-historical-trend-analysis`

---

## 1. 核心結論（TL;DR）

1. **P1 歷史時序分析 —— 技術上完全可行 ✅**。Messari Lending Schema v3.1.0 原生提供 `MarketDailySnapshot` 與 `MarketHourlySnapshot` 實體，內含歷史 `rates`、`totalDepositBalanceUSD`、`totalBorrowBalanceUSD`、`totalValueLockedUSD`。無需 Substreams、無需自建 indexer。
2. **這正是我們目前最大的敘事缺口**：README/SKILL 都誠實標示「spot-only」，而 The Graph 的核心賣點之一就是「歷史數據可查」。補上即直接命中評審想看的東西。
3. **非付費強化切入點（x402 以外）** 依可行性排序：① 歷史時序（最高）② 標準化 schema 跨協議擴展（高）③ Subgraph MCP 互補敘事（高，零成本）④ Agent0/ERC-8004（中）⑤ GRC-20（低-中）⑥ Substreams（低，時間不足）。

---

## 2. Messari Lending Schema v3.1.0 — 時序能力實證

**來源**：[messari/subgraphs `schema-lending.graphql`](https://github.com/messari/subgraphs/blob/master/schema-lending.graphql)（v3.1.0）

### 2.1 `MarketDailySnapshot`（每日快照）— 主力數據源

```
type MarketDailySnapshot @entity @dailySnapshot {
  id: Bytes!              # { market address }{ # of days since epoch }
  days: Int!              # 距 Unix epoch 的天數 ← 排序鍵
  protocol: LendingProtocol!
  market: Market!
  blockNumber: BigInt!
  timestamp: BigInt!

  # ── 歷史利率（關鍵！）──
  rates: [InterestRate!]  # rate / side(LENDER|BORROWER) / type(VARIABLE|STABLE|FIXED)

  # ── 歷史餘額（可算 utilization / TVL）──
  totalDepositBalanceUSD: BigDecimal!
  totalBorrowBalanceUSD: BigDecimal!
  totalValueLockedUSD: BigDecimal!
  inputTokenBalance: BigInt!
  inputTokenPriceUSD: BigDecimal!

  # ── 每日活動 ──
  dailyDepositUSD / dailyBorrowUSD / dailyWithdrawUSD / dailyRepayUSD / dailyLiquidateUSD
  dailyActiveUsers / dailyActiveDepositors / dailyActiveBorrowers / dailyActiveLiquidators
  dailySupplySideRevenueUSD / dailyProtocolSideRevenueUSD / dailyTotalRevenueUSD
}
```

### 2.2 `MarketHourlySnapshot`（每小時快照）— 更細粒度

同一組欄位但以 `hours` 為鍵，`hourlyDepositUSD` 等。**可用於「24h 變化」分析**。

### 2.3 查詢路徑（兩種）

**路徑 A — 嵌套查詢（推薦，一次 query 拿多日資料）：**

```graphql
query AskChingMarketHistory {
  markets(first: 100, orderBy: totalValueLockedUSD, orderDirection: desc) {
    inputToken {
      symbol
    }
    dailySnapshots(first: 30, orderBy: days, orderDirection: desc) {
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

**路徑 B — 直接查 snapshot 實體（需 market id）：**

```graphql
query {
  marketDailySnapshots(first: 30, orderBy: days, orderDirection: desc, where: { market: "0x..." }) {
    days
    timestamp
    rates {
      rate
      side
      type
    }
    totalDepositBalanceUSD
  }
}
```

**決定：採路徑 A**，因為我們現有的 `GET_MARKETS_QUERY` 已用 `markets(first: 100)` + JS 端按 `inputToken.symbol` 過濾，改成嵌套查詢是最小改動，且一次 query 覆蓋所有協議。

### 2.4 風險與已知限制（誠實標注）

| 風險             | 說明                                                                                                 | 緩解                                                                                                                                                |
| ---------------- | ---------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `rates` 可能為空 | 已知部分 subgraph 的 `marketDailySnapshots.rates` 未填充（Messari issue #1500 Abracadabra Arbitrum） | ① 先用 `totalBorrowBalanceUSD/totalDepositBalanceUSD` 推導 utilization（**絕大多數情況下都有值**）② rates 為空時轉 explicit gap（fail-closed 原則） |
| Snapshot 數量    | `first: N` 需 ≤1000；7d/30d 足夠                                                                     | 用 `first: window days + buffer`                                                                                                                    |
| 時區 / days 語義 | `days` = 距 Unix epoch 天數，UTC                                                                     | 直接使用 `days` 排序、`timestamp` 顯示                                                                                                              |
| 三源不同步       | 各協議 snapshot 生成時間可能差幾小時                                                                 | citation 帶各自 `blockNumber`+`timestamp`；報告 timestamp skew                                                                                      |

**驗證結論：技術可行，且有明確的 fail-closed 退路。**

---

## 3. 為何這是最高價值的補強

| 面向                            | 說明                                                                                                                                                                  |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **對齊 The Graph 核心價值**     | The Graph 賣點 = 「不可變鏈上歷史，可查」。spot-only 等於只用了他們能力的 10%                                                                                         |
| **對齊評審期待**                | 過往得獎者（DeeJay's Unchained = 歷史價格/volume 趨勢）證明「時間維度」是得獎關鍵                                                                                     |
| **差異化 vs graph-lending-mcp** | 對手有 `dailySnapshots` tool（19 tools 之一），但**沒有趨勢統計**（slope / volatility / direction）與 **citation 化的趨勢洞察**。我們可做「有計算、有信心的趨勢判讀」 |
| **敘事升級**                    | 從「AskChing 答現況」→「AskChing 判趨勢」——這是研究員真正的需求，也是評審 10 秒測試的 Wow 點                                                                          |
| **技術深度展示**                | 線性回歸斜率、波動率、方向判讀 + fail-closed gap = 展示工程深度                                                                                                       |

---

## 4. 非付費強化切入點分析（x402 以外）

> 用戶已判定 x402（agent 自主付費）時間不足。以下為不含付款的替代切入點，依 **價值 × 可行性** 排序。

### 4.1 切入點總表

| #   | 切入點                                        | 價值   | 可行性（距 9/13）                 | 是否需付款 | 建議                  |
| --- | --------------------------------------------- | ------ | --------------------------------- | ---------- | --------------------- |
| ①   | **歷史時序趨勢分析**                          | 🔥🔥🔥 | ✅ 高（純 Subgraph 查詢）         | ❌         | **本輪實作**          |
| ②   | **標準化跨協議擴展**（3 → 6+ protocols live） | 🔥🔥   | ✅ 高（PROTOCOL_REGISTRY 已是 6） | ❌         | 低優先（demo 3 個夠） |
| ③   | **Subgraph MCP 互補敘事**                     | 🔥🔥   | ✅ 零成本（文件）                 | ❌         | 已部分完成            |
| ④   | **Agent0 / ERC-8004 查詢**                    | 🔥🔥🔥 | ⚠️ 中（需 API key + 新 schema）   | ❌         | 敘事優先，實作次要    |
| ⑤   | **GRC-20 知識圖譜輸出**                       | 🔥🔥   | ⚠️ 中（SDK 成熟度未知）           | ❌         | 願景敘事              |
| ⑥   | **Substreams real-time**                      | 🔥     | ❌ 低（需自建 pipeline）          | ❌         | 僅敘事                |

### 4.2 為何「歷史時序」是最佳切入點

1. **零付款依賴**：純 Subgraph GraphQL 查詢，用現有 `GRAPH_API_KEY` 即可
2. **架構改動最小**：沿用 `GraphGatewayClient` + `MarketDataSource` + `analysis.ts` 引擎模式
3. **與既有工具互補而非重複**：`compare_markets`（現況比較）、`analyze_markets`（現況判讀）、`analyze_trends`（歷史趨勢）——三層敘事完整
4. **直接消滅最大弱點**：README 目前明寫「not historical time-series analysis」與「spot-only」。補上即可刪掉這些 caveat，敘事從「誠實承認不足」變成「完整交付」
5. **強化差異化**：graph-lending-mcp 有 dailySnapshots 但無**趨勢統計洞察**（斜率、波動、方向）+ 無 citation 化的趨勢證據

### 4.3 Agent0/ERC-8004：可行的非付費切入點（P2）

- The Graph 已部署 Agent0 Subgraphs（5-8 鏈），單一 GraphQL schema 索引 ERC-8004 agent registry
- 查詢 `agents(first: N) { id registrationFile { name } reputation }` 等
- **不需付款**（只需 Graph API key）
- **價值**：可做「AskChing 研究 agent 經濟」的 demo——但需驗證實際 endpoint（Subgraph ID）與 schema
- **建議**：列為 P2，以「敘事 + roadmap」呈現；若時間允許再實作

### 4.4 Substreams：不建議（時間不足）

- Substreams 適合「平台級大規模數據攝取」，非單一 agent 查詢
- 需自建 pipeline + 儲存層，與「hackathon 單週」不相容
- The Graph 官方明確說：「If the goal is to let an agent query existing protocol data on demand, Subgraphs are the right starting point」
- **建議**：僅在 roadmap 敘事提及

---

## 5. 實作建議（本輪）

**新增第 5 個 MCP 工具：`analyze_trends`**

| 項目       | 設計                                                                                                         |
| ---------- | ------------------------------------------------------------------------------------------------------------ |
| Input      | `{ metric, asset, protocols[], window: "7d"\|"30d" }`                                                        |
| 數據源     | `MarketDailySnapshot`（嵌套於 `markets` query）                                                              |
| 每協議輸出 | 時間序列 points + 趨勢統計（latest / change / changePct / slopePerDay / direction / volatility / min / max） |
| 證據       | 每個 point 帶 `subgraphId`+`block`+`timestamp`+`queryHash`；每 finding ≥2 citations；fail-closed             |
| 缺口       | rates 為空 → explicit gap；snapshot 不足 → explicit gap                                                      |
| 敘事       | 「AskChing 不只答現況，還會判趨勢——每個數據點都可追溯到鏈上區塊」                                            |

**與既有工具的關係（三層敘事）：**

| 工具                 | 問題                               | 時間維度     |
| -------------------- | ---------------------------------- | ------------ |
| `compare_markets`    | 現在哪個協議利率最高？             | 現況快照     |
| `analyze_markets`    | 現在的收益率/流動性/證據品質如何？ | 現況判讀     |
| **`analyze_trends`** | **過去 7/30 天趨勢如何？**         | **時間序列** |

---

## 6. 來源清單

| 事實                                                                                                         | 來源                                                                                                                            |
| ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| Messari Lending Schema v3.1.0（MarketDailySnapshot / MarketHourlySnapshot / rates / totalDepositBalanceUSD） | [messari/subgraphs schema-lending.graphql](https://github.com/messari/subgraphs/blob/master/schema-lending.graphql)             |
| DailySnapshots 提供歷史 rollup                                                                               | [The Graph Blog - graph-lending-mcp](https://thegraph.com/blog/community-builder-queried-defi-lending-protocols-subgraphs-mcp/) |
| rates 可能為空的已知問題                                                                                     | [messari/subgraphs issue #1500](https://github.com/messari/subgraphs/issues/1500)                                               |
| Substreams vs Subgraphs 適用場景                                                                             | [The Graph Blog - graph-lending-mcp](https://thegraph.com/blog/community-builder-queried-defi-lending-protocols-subgraphs-mcp/) |
| Agent0 / ERC-8004 Subgraphs                                                                                  | [The Graph Docs - Agent0](https://thegraph.com/docs/en/subgraphs/existing-subgraphs/agent0/)                                    |

---

## 7. 不確定性標記

| 項目                                                                                         | 狀態                                                                                                               |
| -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| 三個 live subgraph（Aave V3 / Compound V3 / Spark Lend）的 `dailySnapshots.rates` 是否都填充 | ⚠️ **需 live 實測**（fixture 模式無法驗證）。已知部分 Messari subgraph 的 rates 為空 → 實作必須有 utilization 退路 |
| `markets { dailySnapshots }` 嵌套查詢在 Gateway 的效能                                       | ⚠️ 低風險（first: 30 足夠小）                                                                                      |
| 7d window 對應的 snapshot 數量（可能因協議暫停而 <7）                                        | ⚠️ 需 explicit gap 處理                                                                                            |
