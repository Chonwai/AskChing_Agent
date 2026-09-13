# Loop State — Staking 分析回答 + The Graph 功能深化研究

- **Task slug**: `staking-analysis-thegraph-depth`
- **Goal (Done Contract)**: (1) 用 AskChing 實際回答「一萬美金 USDC vs ETH staking 哪個收益最大」並產出誠實分析；(2) 深度研究 The Graph MCP 還能加什麼「分析/投資相關」功能，評估對評審的加分；(3) 產出建議報告 + 多步 commit。
- **Quality Mode**: `strict`（threshold 93）
- **Depth**: L3

## 已知事實（AskChing 現有能力）

- 6+1 工具：compare_markets / analyze_markets / analyze_trends / research_brief / risk_scan / discover_yields / get_info
- 4 live lending protocols（aave-v3/compound-v3/spark-lend/aave-v2）+ 2 DEX（uniswap-v3/curve）
- **只支援 ethereum-mainnet + USDC 為主**（discover_yields 鎖 USDC/chain）
- **無 ETH staking 數據**（Lido/Rocket Pool 等 liquid staking 未涵蓋）
- **無「投資建議」意圖** — 產品定位是 research software，明示「not a forecast/trading bot/transaction executor」
- 用戶問題：「一萬美金 staking，USDC vs ETH 哪個收益最大？」、「The Graph 分析/投資功能能加什麼讓評審覺得更強？」

## 待執行

1. 用 AskChing live 回答（dogfooding）：USDC 各協議 supply APY + DEX yield
2. 誠實標註 ETH staking 不在覆蓋範圍（fail-closed 精神）
3. 深度研究：The Graph 上 ETH staking（Lido/Curve stETH）subgraph 是否可用
4. 研究可新增功能：ETH staking yield、stablecoin vs ETH 比較、portfolio 視角等
5. 產出評審加分評估報告

---

## Loop 執行結果（2026-09-13）

### DISCOVER：dogfooding 回答 $10K staking 問題

- **USDC leg**（AskChing live 實測）：
  - Lending 最高 = Compound V3 **3.601%**（cited: aave-v3/compound-v3/spark-lend/aave-v2）
  - DEX LP 最高 = Uniswap V3 DAI/USDC **4.63%** 歷史 fee APR（cited）
  - 完整 citations + formulas + risk flags，無交易建議
- **ETH staking leg**：AskChing 誠實 fail-closed（Lido/Rocket Pool 不在覆蓋範圍 → 標 explicit gap，非 0 收益，不編造數字）

### RESEARCH（morpheus deep research）

- **Lido 官方 subgraph 實測 live**：`Sxx812Xge...` → `totalRewards.apr = 2.315%`（block 25961308），現成 APR 不需計算
- **Rocket Pool 不可用**：社群 ID `S9ihna8D7...` gateway 找不到；Messari `Dtj2HicXK...` no allocations
- 評審加分排序：ETH staking > stablecoin 解鎖 > 跨鏈；投資建議不建議（evidence-first 是護城河）
- 對比 graph-lending-mcp：AskChing 的「深度+信任」軸無對手

### DECISION（Neo 自主，deadline 極近）

**不壓線實作 ETH staking**（單源會破 ≥2 sources 品牌 invariant + 動 adapter 風險高）：

- 產出完整實作 spec：`docs/superpowers/specs/2026-09-13-compare-staking-design.md`
- 加 Demo H prompt（$10K 問題作為誠實 fail-closed demo 素材）
- 研究報告：`docs/reviews/2026-09-13-staking-analysis-thegraph-depth.md`

### 交付物（2 commits 已 push）

- `29fc937`：研究報告（$10K staking 分析 + The Graph 功能深度）
- `14f341c`：compare_staking spec + Demo H prompt

### 給用戶的最終回答

1. **$10K USDC vs ETH staking**：以當前 cited 數據，USDC（Compound 3.6% / Uniswap LP 4.63%）> Lido staking（2.32%）。但 AskChing 只給數據不給建議。
2. **The Graph 分析功能**：已涵蓋（比較/風險/趨勢/收益發現/簡報）；ETH staking 是最高加分的新功能，Lido 數據已驗證可用，spec 已備好，deadline 後實作。

---

## 補齊 VERIFY 閘門（2026-09-13，用戶要求 review 剛做的工作）

### smith strict 審查批次（5539606..HEAD）

- **Measured Score: 94/100 PASS**（threshold 93）— 0 Critical / 0 High / 1 Medium / 1 Low
- 批次性質：docs + state only（4 files, +278 lines, **零代碼變更**），gates 全綠
- **smith 親測驗證**（非 mirror）：Lido `totalRewards.apr`=2.315% @ block 25961308 ✅、Rocket Pool 社群 ID 失效 ✅、Messari rocket-pool no allocations ✅、Messari lido live ✅、`TotalReward.blockTime` 欄位 introspection 確認 ✅、probe:protocols 4/4 ✅
- **F-M1（Medium）**：spec citation 結構漏了 `timestamp`（required）→ 修：加 `TotalReward.blockTime` → ISO datetime
- **F-L1（Low）**：Demo H 需錄影前重跑 probes → 修：加 caveat

### 修復 commit

- `9e008f8`：docs — apply smith review fixes

### 最終結論

批次通過 strict 審查，無代碼缺失（本來就是 docs-only）。用戶疑問的「未經 Neo Agent Network」— 確實之前缺 VERIFY，現已補齊。完整講解見對話回覆。
