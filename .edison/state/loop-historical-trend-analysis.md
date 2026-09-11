# Loop State: historical-trend-analysis（歷史時序分析強化 + 深度規劃）

## Goal（Done Contract）

- **用戶可見行為**：AskChing 新增 `analyze_trends` MCP 工具，能回答「過去 7 天 USDC 供應利率趨勢」——從 spot-only 升級到真實時間序列分析
- **必須通過的驗證**：
  - `pnpm test` 全綠（含新增 trend tests）
  - `pnpm eval` 全綠（含新增 trend eval cases）
  - `pnpm build` 全綠（3 packages）
  - `pnpm mcp:smoke` 顯示 5 tools
  - 產出研究報告 + 實作計畫 + 差異化分析文件
- **Quality Mode**: strict (threshold 93)
- **Depth Level**: L3 Deep Dive
- **Minimum Pass Score**: 93
- **約束條件**：
  - 沿用既有架構（METRIC_REGISTRY、citation enforcement、fail-closed、explicit gaps）
  - Fixture + Live 雙模式都要能用
  - 每個 commit 必須小而完整（hackathon 風格，不堆大量 code 才 commit）
  - 不破壞既有 4 tools
- **Budget**: iterations ≤ 6

## Stage Round Counters

| Stage | Current Round | Max Rounds (Stop Rule) | Status |
|---|---|---|---|
| DISCOVER（Messari 時序研究） | 1 | 2 (strict) | active |
| PLAN（實作計畫 + 差異化） | 1 | 2 (strict) | active |
| EXECUTE（代碼 + 文件 commits） | 0 | 2 (strict) | pending |
| VERIFY（code review + test） | 0 | 2 (strict) | pending |

## Iterations

### Iteration 0 - Init
- DISCOVER 核心成果：Messari Lending Schema v3.1.0 確認 `MarketDailySnapshot` / `MarketHourlySnapshot` 實體存在
  - 關鍵欄位：`days`, `timestamp`, `blockNumber`, `rates: [InterestRate!]`, `totalDepositBalanceUSD`, `totalBorrowBalanceUSD`, `totalValueLockedUSD`, `dailySupplySideRevenueUSD`
  - 查詢路徑：`markets { dailySnapshots(first: N, orderBy: days, orderDirection: desc) { ... } }`
  - 結論：**P1 歷史時序分析技術完全可行**
- 非付費切入點研究：Substreams / Agent0(ERC-8004) / GRC-20 的可行性評估

### Iteration 1 - DISCOVER + PLAN（docs）
- `fddd0aa` docs: Messari 時序可行性研究
- `c1f570e` docs: 實作計畫（11-commit hackathon 序列）

### Iteration 2 - EXECUTE（trinity，開發部）
- 9 個 commits：`455048e` schemas → `477653e` fixtures → `b496b32` graph query → `9384628` data source → `35f0186` trend stats → `5675adf` MCP tool → `c47b9ed` orchestrator → `245654a` evals → `a03c8fb` docs
- 實作內容：`analyze_trends`（第 5 個 MCP 工具），7d/30d window，趨勢統計（least-squares slope / direction / volatility / changePct），TrendPoint 繼承 citation 不變量，fail-closed，explicit gaps
- Live 實證（trinity，真實 GRAPH_API_KEY）：3 subgraph × 7d/30d × 4 metrics 全部回應；發現 aave-v3 USDC 2026-09-05 曾達 ~99.98% utilization（12.5687% rate）→ 7d change -72.34%，正確判 `high`

### Iteration 3 - VERIFY（Neo 獨立驗證；smith dispatch 被網路阻斷）
- smith（品管部）dispatch 2 次皆 `net::ERR_NETWORK_CHANGED`（proxy 切換）→ Circuit Breaker：改由 Neo 親自獨立驗證（Neo 未參與開發，仍符合 Maker ≠ Checker）
- Neo 實證：
  - 4 gates 獨立重跑：build 3/3 Done ✅ / test **151 passed (14 files)** ✅ / eval **23/23** ✅ / mcp:smoke **5 tools** ✅
  - fail-closed 由 schema 強制：`TrendFindingSchema.citations.min(2)`、`points.min(2)`、`AnalyzeTrendsResultSchema.protocols.min(2)` ✅
  - `computeTrendStats` 為真實最小平方回歸 + population stddev（非硬編碼）✅
  - graph-client rates 缺失 → `skipped += 1; continue;` 並在 gap message 回報 skipped 數（非靜默丟棄）✅
  - window shortfall → 真產生 explicit gap（`analyze.ts:361-372`）✅
  - 測試完整性：`trend.test.ts` 149 個斷言，含 schema 拒絕測試、fixture 完整性、direction 編碼 → **無造假** ✅
- Neo 評分（CR-D1..D7，排除 N/A 的 D3）：約 **96/100** ≥ threshold 93 → **PASS**

### Iteration 4 - 補強（Neo）
- `60634c7` docs(demos): Demo F 歷史趨勢 prompt + 修正 Demo C 的 risk_scan 敘事

## 最終結論

**PASS — Done Contract 全數滿足。** AskChing 從 spot-only 升級為「會判趨勢」：
- 第 5 個 MCP 工具 `analyze_trends`（7d/30d，slope/direction/volatility/changePct）
- 三層敘事完整：compare_markets（現況）→ analyze_markets（現況判讀）→ analyze_trends（歷史趨勢）
- 最大敘事缺口（spot-only）已補；差異化 vs graph-lending-mcp 成立（趨勢洞察 + citation 化證據）
- 12 個 hackathon commits；4 gates 全綠

**殘留 Medium（非阻斷，已記錄供後續獨立審查）**：
1. Live 極端統計（-72.34%）的敘事風險 → demo 須強調「描述性非預測」
2. `lastGaps` 為 live data source 共享可變狀態（carry-over，未來 multi-call 工具仍脆弱）
3. Fixture 歷史僅涵蓋 supply_apy + utilization（borrow_apy/tvl trend 路徑僅 live 驗證）
4. `flat` 判定用 0.5% 相對帶（若偏好絕對帶需重新校準）

## Circuit Breaker

- Consecutive fails: 0/3（smith 網路錯誤屬 transient，非內容失敗）
- Budget used: 40%
- Status: HEALTHY（Loop 完成）