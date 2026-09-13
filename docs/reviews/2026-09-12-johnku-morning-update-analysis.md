# John Ku 更新分析 + 比賽進展報告（2026-09-12 深夜）

> 研究日期：2026-09-12 20:15 (Asia/Hong_Kong)
> 研究者：Neo Loop（morpheus 深度研究 + smith strict 審查）
> Quality Mode: strict (93) / Depth: L3 Deep Dive
> 基準：HEAD `24f7b34`（全部 gates 親自實測）

## 0. TL;DR

- johnku 自上次甩手（`a606de6`，09-12 02:48）後共 **18 commits**，分兩批：**13 commits**（11:22-12:55）完整實作 cross-venue USDC yield discovery；**5 commits**（19:17-19:44）收尾歸一化 + 文檔對齊。
- 他最新推的 5 個 commits 是「**probe 清理 + adapter citation window UTC day 歸一化 + docs 對齊**」：新增 `utcDayStart()` 讓 Uniswap/Curve 兩個 adapter 的 citation window 輸出整個 UTC 天，與我方前一 session 的 ranking 層 UTC-day bucket 互補、零檔案重疊、無衝突。
- **smith strict 審查 = 95/100 PASS**（≥93）：0 Critical / 0 High / 1 Medium（防禦性建議）。
- **比賽進展：系統已達可提交狀態** — 6 tools、4 live lending + 2 live DEX、gates 全綠。剩餘工作 = 錄 demo 影片 + 提交 ETHOnline（deadline 台北 9/14 00:00），**不是寫代碼**。

## 1. John Ku 最新 5 commits 結構化分析

| Commit    | 時間  | 類別                          | 實質內容                                                                                                                                                                                                                          |
| --------- | ----- | ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `1e69e05` | 19:17 | refactor（message 誤標 test） | 清理 `probe-yield-sources.ts`：移除未用 `succeeded`/`error` 變數、刪註解。零行為變更                                                                                                                                              |
| `d27eed9` | 19:24 | fix（核心）                   | 新增 `utcDayStart()`（`Math.floor(ts/86400)*86400`）；Uniswap + Curve adapter 的 `windowStart/windowEnd` 改為 containing UTC day；completeness filter 同步；測試 fixtures 改用邊界 timestamp（`day+86399`、`day-1`、`day+86500`） |
| `c9955a8` | 19:25 | docs                          | design/plan/prompts 對齊「Messari DEX schema + two-phase query」已驗證路徑；修正誤引的 Uniswap 官方 schema 連結                                                                                                                   |
| `da2b40c` | 19:25 | docs                          | README：live DEX 描述改為「09-12 已通過 exact-query probe，錄影前重跑」                                                                                                                                                           |
| `24f7b34` | 19:44 | docs                          | HANDOFF.md 重寫為 discover-yields-complete，checkpoint 指向 `da2b40c`                                                                                                                                                             |

**與我方（Chonwai）`44a57ae` 是否重複/衝突？→ 不重複、互補的兩層修復：**

```
我方 44a57ae（ranking 層）：yield-discovery.ts 的 windowKey() 按 UTC day 分桶
johnku d27eed9（data 層）：yield-client.ts 兩 adapter 產出的 citation window 直接歸一化為整 UTC 天
```

- 檔案零重疊（git diff 確認），無 merge conflict。
- 效果：live citations 現在顯示完全一致的 `2026-09-11T00:00:00Z → 2026-09-12T00:00:00Z` windows（probe 親測逐字吻合）。

## 2. John Ku 接手的完整工作清單（甩手至今）

**Batch 1 — johnku 09-12 11:22–12:55（13 commits）：cross-venue USDC yield discovery 從零到 Task 7**
design（`051a91a`）→ plan（`de60106`）→ contracts/schemas（`66d7d5a`）→ Uniswap adapter（`39d1e6d`）→ Curve adapter（`11f964b`）→ Curve 3-core-stablecoin 修正（`4f95009`）→ ranking/citations（`f4bc428`）→ facade（`a20dc42`）→ MCP `discover_yields` 暴露（`1f335c4`，工具 5→6）→ Grok 路由（`20cf570`）→ evals（`2d16163`）→ workflow 文檔（`8a986d1`）

**Batch 2 — Chonwai 16:59–19:24（~10 commits）：修復 + Task 8 收尾**
probe 腳本（`a745f67`）→ Uniswap 切 Messari schema（修 johnku batch 1 的 subgraph 選型錯誤）→ two-phase query 繞過 global snapshot timeout → 雙 DEX 翻 `live:true` → UTC-day bucket（`44a57ae`）→ handoff 註記

**Batch 3 — johnku 19:17–19:44（5 commits）：見 §1** — probe 清理 + adapter UTC-day 歸一化 + 文檔對齊 + HANDOFF 重寫

## 3. 比賽進展評估（The Graph track：Best AI Tooling / AI Use Case, $5K）

### 加分點（已驗證事實）

- 工具面：**6 tools**（`discover_yields` 新增，stdio + HTTP 雙傳輸都註冊）
- 數據面：**4 live lending protocols + 2 live DEX venues**（Uniswap V3 + Curve，Messari schema）
- 敘事面：從「lending APY 比較」升級為「**cross-venue USDC 收益發現**」（lending + DEX fee APR 分開排名 + `crossDexWinner`），直接命中 AI Use Case demo 價值
- 差異化維持：evidence-first（citation enforcement / fail-closed / explicit gaps）對 `graph-lending-mcp`（「問得到 vs 信得過」）

### Gates（HEAD `24f7b34` 親自實測）

| Gate                   | 結果                                           |
| ---------------------- | ---------------------------------------------- |
| `pnpm build`           | 3/3 packages ✅                                |
| `pnpm test`            | 209/209 (21 files) ✅                          |
| `pnpm eval`            | 27/27 ✅                                       |
| `pnpm mcp:smoke`       | 6 tools ✅                                     |
| `pnpm probe:protocols` | 4/4 ✅                                         |
| `pnpm probe:yields`    | 2/2 ✅（uniswap eligible=2, curve eligible=1） |
| 工作區                 | clean ✅                                       |

### 還缺什麼（按關鍵度）

1. **Demo 影片**（Required，2-4 min、≥720p、真人配音、live data）— **最大缺口**
2. **ETHOnline 正式提交**（deadline 台北 9/14 00:00，編排當下剩 ~28h）
3. Nice-to-have（不 blocking）：換鏈擴展、Uniswap/Curve 查詢分頁

## 4. 風險評估（smith strict 審查結論）

| #   | 風險                                                                | 等級 | 狀態                                                                                     |
| --- | ------------------------------------------------------------------- | ---- | ---------------------------------------------------------------------------------------- |
| R1  | DEX probe flakiness：gateway 暫態抖動（首跑 0/2 FAIL、重跑 2/2 OK） | 🔴   | 錄影前重跑緩解；README 已寫明                                                            |
| R2  | `Math.round` (ranking) vs `Math.floor` (adapter) 取整不一致         | 🟡   | **0 實際風險**（production windowStart 全為午夜 → round==floor）；防禦性裂縫，提交後統一 |
| R3  | `1e69e05` commit message 誤導（稱 add probe 實為 lint）             | 🟢   | 無功能影響，HANDOFF correction log 註記                                                  |
| R4  | HANDOFF checkpoint 落後（`da2b40c` vs HEAD `24f7b34`）              | 🟢   | 本次交付即更新                                                                           |

**smith 逐維度分數**：CR-D1 正確性 97 / D2 完整性 100 / D3 可維護性 90 / D4 架構一致性 90 / D5 測試覆蓋 96 / D6 文檔準確性 90 / D7 安全性 99 → **加權 95/100 PASS**

## 5. 下一步行動（deadline 台北 9/14 00:00）

完整執行計畫：`docs/reviews/2026-09-12-competition-finish-line-plan.md`（Phase 0 凍結 → Phase 1 錄影 → Phase 2 提交 → Phase 3 可選小修）。核心結論：

1. **凍結代碼** — gates 全綠，除非 probe 失敗或錄影發現 bug 不再動 `packages/`
2. **錄 demo 影片**（今晚最高優先）— 依 demo-narrative 6-tool 版走向，開錄前 5 分鐘重跑 probe
3. **提交 ETHOnline** — 影片完成即交，不壓 deadline
4. **可選小修**（<30 min）— HANDOFF checkpoint 更新、`Math.round`→`Math.floor` 統一
5. **明確不做** — 換鏈、分頁、重構

**一句話總結**：johnku 接手了完整的 yield discovery 新功能（13 commits）+ 收尾歸一化（5 commits），與我方修復互補無衝突；項目處於可提交狀態，剩餘工作是**錄影 + 提交**，而非寫代碼。
