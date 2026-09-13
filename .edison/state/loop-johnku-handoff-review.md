# Loop State: johnku2011 交接審查 + discover_yields 完成

Goal: 完整理解 johnku2011 由昨天至今朝清晨的 13 commits，完成剩餘 Task 6-8（六個 MCP tools + Grok routing + evals/docs/live probes），以 hackathon 多次 commit 方式交付，更新 HANDOFF。
Started: 2026-09-12 13:00
Status: active
Quality Mode: strict (threshold 93)
Depth Level: L3 Deep Dive
Deadline context: ETHOnline 2026-09-13 12:00 PM EDT（台北 9/14 00:00）

## 時間線（已驗證）

- Chonwai 最後 commit: `a606de6`（09-12 02:48）
- johnku2011 接手: `051a91a`（09-12 11:31）→ `8a986d1`（09-12 12:55），共 **13 commits**，全部是 cross-venue USDC yield discovery batch
- johnku 訊息：「thx man, i am adding one function target to complete at a 4 sth」（目標 4 點前完成）
- 產出文件：`docs/superpowers/specs/2026-09-12-discover-yields-design.md` + `docs/superpowers/plans/2026-09-12-discover-yields.md`（Task 1-8）

## johnku 已完成（Task 1-5 + 部分 Task 8 docs）

- Task 1 ✅ `66d7d5a`: yield contracts + source registry（Uniswap V3 `4cKy6...` / Curve `3fy93...`，live:false + pending note）
- Task 2 ✅ `39d1e6d`: deterministic DEX fixtures + Uniswap V3 complete-day fee adapter（injected clock）
- Task 3 ✅ `11f964b` + `4f95009`: Curve daily-snapshot adapter + three-core-stablecoin composition fix
- Task 4 ✅ `f4bc428`: pure filtering, separate lending/LP rankings, calculations, risk flags, common-day gate, fail-closed
- Task 5 ✅ `a20dc42`: fixture/live DEX facade, Promise.allSettled partial failures, safe venue gaps, MarketDataSource integration
- docs/eval 部分：`2d16163` (evals cases) + `8a986d1` (SKILL.md/openai.yaml/README/prompts + probe-yield-sources 未見) — **待確認 probe:yields 是否已建**

## johnku 未完成（待我們接手）

- **Task 6** MCP handler + both transports（tools.ts/register.ts 六工具）— `1f335c4` 已 commit，但 HANDOFF 說 Task 6 是「Next action」，**需驗證實際狀態**
- **Task 7** Grok routing（loop.ts/loop.test.ts）— `20cf570` 已 commit，需驗證
- **Task 8 Step 4** credentialed DEX probes（probe:yields）+ live:true 翻轉 — **最關鍵、未完成**
- **Task 8 Step 6-8** full release gate + Grok smoke + handoff 更新 — 未完成

## 驗證時程（已驗證）

- `git log a606de6..HEAD` = 13 commits，全部 John Ku
- diff stat: 33 files, +2538/-23
- working tree clean, HEAD = `8a986d1` pushed to origin/main
- HANDOFF checkpoint = `a20dc42`，聲明「Next action: Task 6」

## DISCOVER 結論（morpheus 深度研究，2026-09-12）

- johnku 實際完成 **Task 1-7 + Task 8 docs/evals**（比 HANDOFF 宣稱超前 2 tasks）
- 已驗證 gates：build 3/3、test **206**(21 files)、eval **27/27**、mcp:smoke **6 tools**、http:smoke **6 tools**、vercel:probe OK、probe:protocols 4/4
- **唯一剩餘 = Task 8 Step 4-8**：
  1. `demos/probe-yield-sources.ts` 不存在 + package.json 無 `probe:yields`
  2. 兩 DEX 候選仍 `live:false`（注：`yield-sources.test.ts:10-25` pin live:false + LIVE_DEX=[]，翻轉需同步更新測試）
  3. 跑 probe 通過後才翻轉 live:true + 移除 pending notes（Task 8 唯一允許時機）
  4. full release gate + credentialed Grok smoke + HANDOFF 刷新
- morpheus 關鍵風險提示：
  - Curve `liquidityPoolDailySnapshots(first:1000)` 過寬，probe 零 eligible 時先懷疑分頁
  - Uniswap `first:100` 無分頁，probe 應印 pool 總數
  - 兩 venue 需同一 common complete UTC day 才有 crossDexWinner（demo 彩排前先跑 probe）
  - `fixture-live-consistency.test.ts:31-38` 已支援 live 翻轉（fixture 已涵蓋兩 venue）

## PLAN（Task 8 收尾三部曲）

1. **EXECUTE-1**: trinity 建立 `probe-yield-sources.ts` + package.json `probe:yields` → commit `feat: add credentialed DEX yield source probe` + push
2. **EXECUTE-2**: 跑 probe（.env GRAPH_API_KEY）→ 若兩 candidate 都過：翻轉 live:true + 移除 notes + 更新 yield-sources.test.ts pin 測試 → commit `feat(shared): enable DEX sources after credentialed probe` + push；若任一失敗：照 plan source-feasibility condition 停止，不弱化 two-DEX criterion
3. **EXECUTE-3**: full release gate（test/build/eval/mcp:smoke/http:smoke/vercel:probe/probe:yields/git diff --check）+ Grok smoke → HANDOFF 刷新 commit
4. **VERIFY**: smith strict 審查 EXECUTE diff + measured score
5. **交付**: 報告 johnku 變更摘要 + 剩餘完成 + 比賽進展

## DECISION（2026-09-12 13:30 — uniswap-v3 subgraph schema 不相容）

**實測發現（credentialed probe）**：

- `4cKy6...`（johnku pin 的 uniswap source）是 **Messari DEX schema**：有 `liquidityPools` / `liquidityPoolDailySnapshots`，**無** `pools` / `poolDayData` / `feeTier`（introspection 證實）
- 但 johnku 寫的 `UniswapV3YieldAdapter`（yield-client.ts）用的是**官方 v3-subgraph schema**（`pools`/`poolDayData`）→ 註定不相容，probe 0 observations
- 官方 Uniswap V3 subgraph ID 全部 404（`5zvR...`/`8q1J...`/`ELnU...` 皆不存在於 gateway）
- **Messari uniswap-v3 實測可用**：`liquidityPoolDailySnapshots` 欄位與 Curve 同構（`dailySupplySideRevenueUSD`/`dailyVolumeUSD`/`totalValueLockedUSD`/`pool.inputTokens`），USDC/USDT 0.01% 池 TVL $33.2M、每日 feeRev ~$965-$1403、完整 snapshot 有 blockNumber

**決策**：把 `UniswapV3YieldAdapter` 改走 Messari schema（與 pin 的 `4cKy6...` 相容，與 Curve adapter 同構），**不換 subgraph ID**（設計文件允許「candidate fails → 換成通過 probe 的 indexed deployment」，但此處 source 本身可用，是 adapter schema 錯配；改 adapter 比換 ID 風險更低、且保留 johnku pin 的證據鏈）。注意 Messari 無 `feeTier` 欄位 → feeTier 變成 optional（`DexYieldObservationSchema` 已 optional? 需確認）。Uniswap 的多 feeTier 池用「不同 pool id」區分（Messari 每個 fee tier 是獨立 pool id）。

## VERIFY 結果（2026-09-12，edison-doc-reviewer）

- **Mode:** strict
- **Measured Score:** **94/100**
- **Threshold:** 93
- **Verdict:** **PASS**（Round 1）
- **Critical/High:** 0
- **Medium:** 3（皆 optional backlog，不 blocking）
  1. Uniswap queryHash 用 `"|"` 串兩段 query → 非 canonical（改 query 後 hash 漂移）
  2. pools/snapshots 無分頁（first:100 / first:1000 上限）
  3. `selectDexWindows` 用 `windowStart|windowEnd` 字串完全相等 → 浮點邊界可能誤判無 common day；建議 `Math.round(timestamp/86400)` UTC-day bucket 化
- **Low:** 4（gap 重複 edge、isPoolsQuery 依賴字串、probe 印 window、lending-only window fallback edge）

## 決策：是否修 Medium #3（windowKey UTC-day bucket）

- **背景**：live 下 Uniswap windowEnd 23:59:59 vs Curve 23:52:59 → 目前 crossDexWinner=null（spec 一致 fail-closed，但 demo 亮點受損）
- **修正**：`selectDexWindows` 以 `Math.round(timestamp/86400)` bucket 比較 common day
- **決策**：✅ 做（有助 demo crossDexWinner 展示 + 是 HANDOFF 已列的 next action；低風險小改動）

## Stage Round Counters

| Stage                | Current Round | Max Rounds (strict) | Status         |
| -------------------- | ------------- | ------------------- | -------------- |
| DISCOVER             | 1             | -                   | complete       |
| PLAN                 | 1             | -                   | complete       |
| EXECUTE              | 3             | 4                   | complete       |
| VERIFY (code-review) | 1             | 4                   | ✅ PASS 94/100 |
| VERIFY (gates)       | 1             | -                   | complete       |

## Circuit Breaker

Consecutive fails: 3/3（已耗盡但 recovery 後成功）
Budget: 65%
Status: HEALTHY

---

## 追蹤：johnku 第二批 5 commits（19:17-19:44）+ 比賽收尾（20:15）

### 新事實（用戶提示「johnku 剛才又 push 了」，Neo 本 loop 覆核）

- johnku 在我方前一個 loop 完成後又推了 **5 commits**（`1e69e05` → `24f7b34`，09-12 19:17-19:44），已合入 origin/main：
  - `1e69e05` refactor(demo)：probe-yield-sources.ts 死代碼清理（message 誤標 "add live probe"，實際零行為變更）
  - `d27eed9` fix(shared)：新增 `utcDayStart()`，Uniswap + Curve adapter 的 citation window 歸一化為 containing UTC day（與我方 `44a57ae` ranking 層 UTC-day bucket **互補不衝突**——檔案零重疊）
  - `c9955a8` / `da2b40c` / `24f7b34` docs：design/plan/README/prompts 對齊 verified Messari DEX query path；HANDOFF 重寫為 discover-yields-complete
- 我方前一 session 的修復 batch（`a745f67` → `44a57ae` 等 9-10 commits）與之合流，HEAD = `24f7b34`。

### 本 loop 的 DISCOVER / PLAN / VERIFY（deep + strict）

- **DISCOVER（morpheus，20:00）**：johnku 5 commits 逐個拆解；接手工作清單（Batch 1: 13 commits yield discovery Task 1-7；Batch 3: 5 commits 收尾）；比賽進展 = 可提交狀態；風險 R1 probe flakiness 🔴 / R2 checkpoint 落後 🟡 / R3 Math.round-vs-floor 🟡（0 實際風險）。
- **PLAN（architect，20:05）**：`docs/superpowers/plans/2026-09-12-competition-finish-line.md` — Phase 0 凍結驗證 → Phase 1 錄影 → Phase 2 提交 → Phase 3 可選小修（F1 checkpoint / F2 windowKey floor / F3 correction log）。
- **VERIFY（smith，20:10）**：gates 逐項實測（build 3/3、test 209/209、eval 27/27、smoke 6、probe:protocols 4/4、probe:yields 2/2 且 readings 逐字吻合）→ **Measured Score 95/100 PASS**（0 Critical / 0 High / 1 Medium 防禦性 M-1: windowKey round→floor）。
- **決策**：✅ 交付分析報告；比賽收尾計畫存檔；HANDOFF 更新 checkpoint/commit history；F2（windowKey floor）建議提交後再做（不擋提交）。

### 交付物

- `docs/reviews/2026-09-12-johnku-morning-update-analysis.md` — johnku 更新分析 + 比賽進展報告
- `docs/superpowers/plans/2026-09-12-competition-finish-line.md` — 收尾執行計畫
- 本 loop state 更新 + HANDOFF 更新

---

## Phase 3 小修完成（2026-09-13，2 commits）

- **F2（`11aff9b`）**：`windowKey` 的 `Math.round` → `Math.floor`，與 adapters 的 `utcDayStart` 一致。測試 fixtures 皆整 UTC 午夜 → 行為不變，209/209 全綠。
- **F1 + F3（`a5a8cd5`）**：HANDOFF checkpoint 前進至 `11aff9b`；correction log 追加 F2 說明 + R1 probe flakiness 重跑指示。
- **Gates 全綠**：build 3/3、test 209/209 (21 files)、eval 27/27、mcp:smoke 6 tools、probe:protocols 4/4。
- **Live 驗證**：`probe:yields` 首跑 0/2（R1 gateway 暫態，已知 flakiness）→ 重跑 **2/2 OK**（readings 與 HANDOFF 逐字吻合：UNI USDC/DAI TVL $1.22M APR 4.63%、Curve 3pool TVL $154.47M APR 0.17%，window 皆 `2026-09-11T00:00:00Z → 2026-09-12T00:00:00Z`）。
- **Phase 3 完成。** 下一步：用户轉向 Vercel 部署研究（新 Loop 或直接研究）。錄影前務必重跑 probe（R1）。
