# AskChing 分析/投資功能深化研究 + $10K Staking 實測報告

> 研究日期：2026-09-13 ｜ 研究者：Neo Loop（morpheus deep research + Neo 實測 probes）
> Quality Mode: strict (93) / Depth: L3

## 0. 用戶問題直接回答

### Q1：一萬美金 USDC vs ETH staking 哪個收益最大？

**AskChing 實測回答（dogfooding，live mode）**：

| 選項                          | 最高年化                                  | 數據源                                             | 狀態                             |
| ----------------------------- | ----------------------------------------- | -------------------------------------------------- | -------------------------------- |
| **USDC lending**              | **Compound V3 3.601%**                    | aave-v3/compound-v3/spark-lend/aave-v2（cited）    | ✅ 已涵蓋                        |
| **USDC DEX LP**               | Uniswap V3 DAI/USDC 4.63%（歷史 fee APR） | uniswap-v3（cited）                                | ✅ 已涵蓋                        |
| **ETH staking (Lido)**        | **2.315% APR**                            | Lido 官方 subgraph `Sxx812Xge...`（現成 apr 欄位） | ⚠️ 數據可用但**未接入 AskChing** |
| **ETH staking (Rocket Pool)** | 未知                                      | 社群 subgraph ID 失效、Messari 版無 allocations    | ❌ 數據不可用                    |

**結論**：以當前數據，**USDC 放 Compound V3 lending（3.60%）或 Uniswap DAI/USDC LP（4.63% 歷史 fee APR）優於 Lido ETH staking（2.32%）**。但 AskChing 只給 cited 數據，不做預測/建議 — 這是產品定位（證據優先）。

### Q2：The Graph 功能涵蓋分析/投資嗎？能加什麼？

**已涵蓋**：跨協議比較、風險掃描、7d/30d 趨勢、收益發現、研究簡報 — 都是**分析**層面。

**未涵蓋**（也是機會）：ETH staking（Lido 數據可用！）、stablecoin 多資產、跨鏈。

---

## 1. ETH Staking 可行性（實測結論）

| 數據源              | Subgraph ID                                    | Live 實測                                        | 可用性                              |
| ------------------- | ---------------------------------------------- | ------------------------------------------------ | ----------------------------------- |
| **Lido 官方**       | `Sxx812XgeKyzQPaBpR5YZWmGV5fZuBaPdh7DFhzSwiQ`  | ✅ `apr: 2.315243197362587...`（block 25961308） | **✅ 完全可用（現成 APR）**         |
| **Messari lido**    | `F7qb71hWab6SuRL5sf6LQLTpNahmqMsBnnweYHzLGUyG` | ✅ protocols 查詢正常                            | ✅ 可用（但 generic schema 無 APY） |
| Rocket Pool 社群    | `S9ihna8D733WTEShJ1KctSTCvY1VJ7gdVwhUujq4Ejo`  | ❌ subgraph not found                            | ❌ ID 失效                          |
| Messari rocket-pool | `Dtj2HicXKpoUjNB7ffdBkMwt3L9Sz3cbENd67AdHu6Vb` | ❌ no allocations                                | ❌ 未索引                           |

**關鍵發現**：Lido 官方 subgraph **直接提供 `totalRewards.apr` 欄位**（oracle 每日回報），完全不用計算 — 接入成本極低。Rocket Pool 目前無可用源，需誠實標記 gap。

---

## 2. 可新增功能（依評審加分排序）

### 🥇 ETH Staking 比較（Lido vs Rocket Pool vs Lending）— 最加分

- **直接回答用戶剛問的問題**（$10K USDC vs ETH staking）
- 跨資產類別比較是 graph-lending-mcp **做不到的**（它只有 lending）→ 差異化護城河
- **最小可行改動**：Lido 官方 subgraph 註冊（現成 apr）+ 1 個 extractor + schema + `compare_staking` 或擴充 discover_yields
- 成本：中 ／ 風險：低 ／ 加分：🔥🔥🔥

### 🥈 Stablecoin 解鎖（USDC → USDT/DAI/USDS）

- **純 code 改動、零新 subgraph**（4 個 live subgraph 早已索引這些資產）
- 讓 compare/analyze/discover 支援多種穩定幣
- 成本：低 ／ 風險：低 ／ 加分：🔥🔥

### 🥉 跨鏈（Base/Arbitrum）

- 9/12 研究說最高 ROI，但 deadline 近、風險高（踩過 uniswap 選型坑）
- 成本：高 ／ 風險：高 ／ 加分：🔥🔥🔥 但可能來不及

### ❌ 投資/交易建議 — 不建議

- 維持 research-only 定位是 evidence-first 品牌核心資產
- ETHGlobal 評審標準明確含 research assistants — 不需變交易 bot
- 給「買 ETH」建議會模糊 citation 責任邊界

---

## 3. 評審加分評估

### The Graph track 評審標準（ethglobal.com 官方）

1. **The Graph 是 load-bearing**：✅ 已滿足（subgraph 唯一數據源）
2. **Consume live data**：✅ 已滿足
3. **Do meaningful work**（reasoning/decisions/NL interface）：✅ 已是 NL research assistant
4. **Open-source + demo video**：✅（video 是衝刺重點）

### 差異化 vs graph-lending-mcp（官方 showcase）

|       | graph-lending-mcp                     | AskChing                                                                    |
| ----- | ------------------------------------- | --------------------------------------------------------------------------- |
| Scope | 19 tools / 90 deployments / 15 chains | 7 tools / 6 live sources / ethereum-mainnet                                 |
| 優勢  | **廣度**                              | **深度 + 信任**：citation enforcement、fail-closed、explicit gaps、趨勢分析 |

**推測**：加廣度追 90 protocols 永遠追不贏；但 **graph-lending-mcp 沒有 evidence-first、沒有 staking/跨資產比較、沒有趨勢分析** — 「研究者可信度」這條軸 AskChing 沒有對手。加 ETH staking 是往「跨資產研究深度」再推一步。

---

## 4. 務實建議（deadline 台北 9/14 00:00）

| 優先  | 任務                         | 成本 | 風險     | 加分                    |
| ----- | ---------------------------- | ---- | -------- | ----------------------- |
| **1** | ETH staking（Lido 官方 apr） | 中   | 低       | 🔥🔥🔥 直接回答用戶題目 |
| **2** | stablecoin 解鎖（USDT/DAI）  | 低   | 低       | 🔥🔥                    |
| 3     | 跨鏈                         | 高   | 高       | 可能來不及              |
| ❌    | 投資建議                     | —    | 品牌風險 | 不建議                  |

**驗證過的零件清單**（ETH staking 最小可行）：

```
1. source-config 註冊 lido-ethereum → Sxx812XgeKyzQPaBpR5YZWmGV5fZuBaPdh7DFhzSwiQ（官方，直接 apr）
2. graph-client 加 1 個 extractor（走現有 switch(descriptor.extractor) 模式）
3. schema 擴充：staking observation（asset=ETH, metric=staking_apr, citation 繼承）
4. compare_staking 或擴充 discover_yields
5. fixtures + eval cases
6. demo video 用「$10K 放哪」當故事線
```

---

## 5. 資訊來源

- [Messari Subgraphs deployment CSV（lido/rocket-pool ID）](https://github.com/messari/subgraphs)
- [Lido Subgraph Docs（官方 subgraph ID + totalRewards apr）](https://docs.lido.fi/integrations/subgraph/)
- [graph-lending-mcp（官方 showcase）](https://github.com/PaulieB14/graph-lending-mcp)
- [The Graph Blog — Community Builder 90 Protocols](https://thegraph.com/blog/community-builder-queried-defi-lending-protocols-subgraphs-mcp/)
- [ETHGlobal ETHOnline 2026 The Graph prize](https://ethglobal.com/events/ethonline2026/prizes/the-graph)
