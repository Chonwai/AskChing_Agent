# Loop State — 高加分範例實測 + Landing 整合

- **Task slug**: `high-value-examples-landing`
- **Goal (Done Contract)**: 實測兩個高加分功能（ETH staking 比較 / Stablecoin 解鎖）的發問範例，確認系統能否運行，並加到 Landing page + docs。gates 全綠、多步 commit、自動部署。
- **Quality Mode**: `strict`（threshold 93）
- **Depth**: L3

## 實測結果（2026-09-13，live mode）

### 🥈 Stablecoin（USDT）— 系統**現在就能運行** ✅

> Compare live USDT supply APY across Aave V3, Compound V3, and Spark Lend. Rank them and cite each source.

**實測輸出**：Spark Lend **3.3943%** 最高（Aave V3 3.1905%、Compound V3 3.1371%），3 個 cited subgraph sources + queryHash + asOf。
**關鍵**：4 個 live subgraph 早已索引 USDT/DAI → 多穩定幣支援大多已內建，`discover_yields` 的 USDC 鎖定才是剩下差異。

### 🥇 ETH staking — 系統**誠實 fail-closed** ✅（品牌加分）

> What is the current yield for staking ETH through Lido, compared to earning USDC yield on Compound?

**實測輸出**：明確回「**Lido ETH staking 是 coverage gap**」+ 完整引用 Compound USDC **3.490%**（subgraphId/queryHash）+ 補充「即使有 Lido 數字，兩者不等價（不同資產/風險/機制）」。
**關鍵**：這是 evidence-first 的最佳示範 — 寧願說無法引用，也不編造。`compare_staking`（Lido subgraph 已驗證 live）spec 已備好。

## 交付物

- `9c93e0c`：Landing page Try-it-now 加 USDT + ETH staking 兩個實測範例
- `089ac75`：docs/try-it.md 加 Demo 4（USDT 可用）+ Demo 5（ETH staking gap）

## 驗證

- ✅ Live landing page 含新範例（grep 2 matches）
- ✅ Gates：build 3/3、test 209/209、eval 27/27
- ✅ 全部 push，自動部署完成