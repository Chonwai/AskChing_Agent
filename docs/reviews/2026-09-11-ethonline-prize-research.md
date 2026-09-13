# ETHOnline 2026 — The Graph Track 深度研究報告

> 建立日期: 2026-09-11｜研究者: JARVIS Deep Research（L3）
> 目的: 驗證參賽可行性、拆解獎項結構、分析過往得獎者、定位 AskChing 強化方向
> 對應 Loop: `loop-ethonline-strategy`

---

## 1. ETHOnline 2026 參與驗證 ✅

| 項目     | 內容                                              | 來源                         |
| -------- | ------------------------------------------------- | ---------------------------- |
| 活動名稱 | ETHOnline 2026（ETHGlobal 年度 async hackathon）  | ethglobal.com                |
| 形式     | **Async（線上，build from anywhere）**            | x.com/ETHGlobal              |
| 日期     | **Sep 4 – 16**                                    | x.com/ETHGlobal、web3voyager |
| 總獎金   | **$100K+**                                        | x.com/ETHGlobal              |
| 參賽門檻 | 線上註冊即可，全球開發者                          | ethglobal.com                |
| 提交要求 | demo video + repo + description（ETHGlobal 標準） | ethglobal.com                |

**✅ 結論：AskChing 完全可以參賽。** Async 形式讓分散的團隊（Chonwai + johnku2011）可以異地協作，Deadline 9/16（我們的 repo memory 記錄是 9/13 12:00 PM EDT 提交建議——需與官方最終確認，但 9/13 前提交是最安全策略）。

---

## 2. 獎項結構全表

### 2.1 The Graph 贊助（$15,000 總額）

來源：[The Graph on X](https://x.com/graphprotocol/status/2095595183282749896)

| Track                                         | 獎金    | 條件                                                                                                                                                         |
| --------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Composable or Standardized Graph Products** | **$5K** | 組合 ≥2 個 The Graph 產品，或建立在標準化 schema 上（如 Messari Standardized Subgraphs）                                                                     |
| **AI Tooling or Use Case, From Scratch**      | **$5K** | The Graph 作為 load-bearing；AI tooling 直接針對 The Graph 產品/AI Suite，或 agent/app 用 The Graph（Subgraphs / Subgraph MCP / Substreams）作為區塊鏈數據源 |
| **AI Tooling or Use Case (Continuity)**       | **$5K** | 同上，但允許沿用既有項目                                                                                                                                     |

**我們打的是第 2 項（From Scratch）**，而 AskChing 的「first commit 2026-09-08」恰好是 hackathon（Sep 4）開始後——**完全合規**。✅

### 2.2 官方 Finalist 獎項

來源：[ETHOnline 2025 Finalists](https://ethglobal.com/events/ethonline2025/prizes)

- **ETHGlobal 官方每屆都有 Finalists 獎項**：Finalists 可 mint「ETHOnline Finalists Pack」（有各種 perks 和 prizes）
- ETHOnline 2026 預期有類似的官方 Finalist 制度（**Top teams 入選 finalist → 可獲官方獎項與認可**）
- 2025 的 Finalists 頁面顯示這是**獨立於贊助商獎項的官方表揚**，通常包含 10 隊左右的 Top 10
- ⚠️ 2026 具體 Finalist 名額與獎金需以官方公佈為準（未在搜尋中取得具體數字，標記不確定）

### 2.3 總 prize pool

- ETHOnline 2026: **$100K+**（多贊助商累計）
- 對比：ETHGlobal NYC 2026: $225K+；ETHGlobal Cannes: The Graph 單獨 $10K

---

## 3. 過往得獎者分析（The Graph track）

### 3.1 The Graph 官方 hackathons（早期）

| 項目                            | 做什麼                                                     | 得獎原因                      | 來源                                          |
| ------------------------------- | ---------------------------------------------------------- | ----------------------------- | --------------------------------------------- |
| DeeJay's Unchained Transactions | 0x Exchange 交易數據 subgraph + 歷史價格/volume 趨勢視覺化 | **數據分析 + 歷史趨勢視覺化** | thegraph.com/blog/december-hackathon-winners  |
| Kauri subgraph (Rahul Bishnoi)  | 技術文件平台 subgraph + query UI                           | 實用工具 + 乾淨 UI            | thegraph.com/blog/september-hackathon-winners |

### 3.2 ETHGlobal Cannes 2026（The Graph Foundation 主辦）

來源：[Outposts - Cannes Winners](https://outposts.io/article/ethglobal-cannes-hackathon-winners-announced-ab98f1c9-2eea-42c2-807a-465797956d12)

| Category                                   | 得獎者            | 做什麼                            |
| ------------------------------------------ | ----------------- | --------------------------------- |
| **GRC-20-ts Library**（$1000）             | Cosmiq            | AI 平台，從 prompts 建 web3 apps  |
| **Hypergraph Framework**（1st $3000）      | Hypermaps         | LLM mind-mapping tool（知識圖譜） |
| Hypergraph Framework（2nd $2000）          | Livus             | 健康數據所有權平台                |
| **Graph Token API/Subgraphs**（1st $2500） | CCTUP             | 跨鏈交易管理                      |
| Graph Token API/Subgraphs（2nd $1500）     | circules_subgraph | 信任基礎的代幣流動視覺化          |

**關鍵洞察：Cannes 的得獎者高度集中在「知識圖譜（GRC-20/Hypergraph）」與「AI + Graph 數據」**。這與 The Graph 2025-2026 的官方方向完全一致。

### 3.3 得獎者共同特徵

1. **Live data 是硬要求**：得獎項目都展示了真實、即時的鏈上數據（不是 mock）
2. **AI + 結構化數據的結合**：不只查數據，而是用 AI 把數據變成洞察/工具
3. **視覺化/交互性**：即使 CLI 工具也有清晰的 UI 或視覺化（趨勢圖、mind-map）
4. **敘事對齊 The Graph 官方方向**：GRC-20、Agent0、AI agent economy——得獎者都踩在 The Graph 正在推的風口上
5. **數據分析是核心**：DeFi 利率比較、TVL 追蹤、交易趨勢——**分析型項目明顯更受青睐**

---

## 4. The Graph 生態熱點（2025-2026）

### 4.1 Agent0 Subgraphs（ERC-8004）— 🔥 最新最熱

來源：[The Graph Blog - Agent0](https://thegraph.com/blog/agent0-subgraphs-live-erc-8004-agent-economy/)

- **ERC-8004 Trustless Agents 標準**（MetaMask/EF/Google/Coinbase 作者共同制定）：Identity / Reputation / Validation 三個 on-chain registries
- The Graph 已在 **5-8 條鏈**（Ethereum / Base / Polygon / BNB / Monad）部署 Agent0 Subgraphs
- 單一 GraphQL schema 索引所有 ERC-8004 agent：identity、capabilities（MCP tools、x402 payment）、reputation、feedback
- 官方說法：**「The first piece of dedicated agent infrastructure on The Graph — the foundation for a much larger surface of agent-native data products coming over the next year」**

### 4.2 x402 — Agent 自主付費查詢

- x402 讓 agent 用 wallet 直接付費查詢 Subgraphs（pay-as-you-go，fractions of a cent）
- The Graph 支持 x402 + ERC-8004 組合：**agent 用 ERC-8004 身份 + x402 付費 + MCP 查詢**
- 官方 blog 明示案例：「**By leveraging MCP Skills to query Subgraphs, agents can identify the best trade opportunities**」

### 4.3 GRC-20 Knowledge Graph

來源：[GIP-0020](https://github.com/graphprotocol/graph-improvement-proposals/blob/main/grcs/0020-knowledge-graph.md)、[Wikipedia](https://en.wikipedia.org/wiki/The_Graph)

- **GRC-20** = The Graph 的知識圖譜標準（2025 推出），號稱「知識圖譜界的 ERC-20」
- 統一框架提升跨 dApp 的互操作性、可組合性
- Cannes 得獎者（Cosmiq / Hypermaps）全部建立在此方向

### 4.4 The Graph 官方 Hackathon Resources

來源：[The Graph Hackathon Resources](https://thegraph.com/blog/hackathon-resources/)

官方明示「AI Tooling」track 的獲勝模式（**這幾乎是我們的路線圖**）：

> 「(1) a DeFi research agent that answers natural-language questions like _'which lending markets have the highest USDC supply APY right now?'_ by querying Subgraphs through the Subgraph MCP; (2) a trading or monitoring agent that reads live market and liquidity data from Subgraphs and pays per query with x402; (3) a governance assistant that summarizes DAO proposals and voting activity pulled from Subgraphs.」

也提到工具型案例：「(2) a cross-protocol MCP that fans one query across every protocol built to a shared standard schema, following the pattern of PaulieB's Lending MCP」

**→ AskChing 正在做的（Grok NL → 跨協議 fan-out → cited brief）正是官方認定的 DeFi research agent 模式！**

---

## 5. AskChing 競爭力評估

### 5.1 目前強度（4 tools + Grok orchestrator）

| 面向                     | 現況                                                   | 評分  |
| ------------------------ | ------------------------------------------------------ | ----- |
| Multi-subgraph fan-out   | ✅ 3 源 live（Aave/Compound/Spark），6 protocols       | ★★★★☆ |
| Citation enforcement     | ✅ 每數字帶 subgraphId+block+timestamp+queryHash       | ★★★★★ |
| NL → tool routing        | ✅ Grok orchestrator 自動選工具                        | ★★★★☆ |
| 分析深度                 | ✅ analyze_markets（yield/liquidity/evidence quality） | ★★★★☆ |
| MCP 標準                 | ✅ stdio MCP server，跨平台                            | ★★★★★ |
| **Agent0/ERC-8004 整合** | ❌ 未做                                                | —     |
| **GRC-20 知識圖譜**      | ❌ 未做                                                | —     |
| **x402 付費查詢**        | ❌ 未做（README roadmap 有列）                         | —     |
| **歷史數據趨勢**         | ❌ risk_scan/analyze 明確標 spot-only                  | —     |
| **視覺化/UI**            | ❌ 純 CLI/MCP                                          | —     |

### 5.2 競爭力評估

**結論：AskChing 在「AI Tooling or Use Case, From Scratch」track 有真實競爭力（尤其 citation + evidence-first 是獨特賣點），但要在 The Graph 評審面前「Wow」，需要補上 2-3 個生態風口級亮點。**

差距分析：

1. **對齊官方風口（最關鍵）**：The Graph 2026 砸重資源在 Agent0（ERC-8004）+ x402 + GRC-20。評審是 The Graph 的人，他們想看的是「用新基礎設施做出新東西」。AskChing 目前只用了「最基礎」的 Subgraphs（雖然符合 load-bearing）。
2. **分析深度**：目前是 spot snapshot（即時點）。The Graph 有完整的歷史數據能力（Substreams、Time Series），能做真正的趨勢分析——這是「數據分析比較值錢」的落點。
3. **敘事**：README 的 evidence-first 敘事很好，但缺「AI agent economy」的未來願景。

---

## 6. 強化方向建議（基於研究證據）

### P0 — 敘事與對齊（低 effort，高回報）

1. **README + ETHGlobal copy 更新**：明確對齊 The Graph 官方「DeFi research agent」案例敘事（引用官方資源頁）
2. **Demo video 加入「為何是 The Graph」段**：強調 load-bearing + 官方 MCP/SKILLs 生態
3. **提交時選對 track**：確認選「AI Tooling or Use Case, From Scratch」+ 附「Composable」跨 track 可能性評估

### P1 — 功能強化（中 effort，可 hackathon 內完成）

1. **歷史趨勢分析（time-series）**：用 Subgraph 的 `_meta.block.timestamp` + 多點查詢做「7d APY 趨勢」——解決目前「spot-only」的最大弱點，也是「數據分析值錢」的直接體現
2. **跨協議 stream 比較**：官方推薦的 cross-protocol fan-out 模式，我們已 80% 做到，可加「全協議掃描」模式
3. **Grok orchestrator 打包成 MCP server**：讓任何 MCP client 直接用 Grok 推理層（README roadmap 已列，實作後是「完整閉環」敘事）

### P2 — 生態風口（高 effort，看時間）

1. **Agent0 Subgraph 整合**：讓 AskChing 能查 ERC-8004 agent registry（agent 的 reputation/capabilities），變成「研究 agent 生態的 agent」——**這是 2026 最 Wow 的點**
2. **x402 整合**：AskChing agent 自己付費查詢（demo 用「agent 自主付費」敘事）
3. **GRC-20 輸出**：research brief 輸出成 GRC-20 知識圖譜結構——對齊 Cannes 得獎者方向

### 分析 vs 工程：哪個值錢？

**研究證據顯示：數據分析型項目（DeFi 利率比較、流動性壓力、歷史趨勢、跨鏈 agent 數據）明顯更受 The Graph 評審青睐**。因為 The Graph 的核心價值就是「讓數據可用」，展示「數據分析出洞察」是對他們基礎設施價值的最佳證明。AskChing 已走對方向，**強化重點應放在「更深的數據分析」（歷史趨勢）+ 「對齊新基礎設施」（Agent0/GRC-20）**。

---

## 7. 來源清單

| 事實                                     | 來源                                                                                                                                                                                                                                                                |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ETHOnline 2026 async / Sep 4-16 / $100K+ | [X: ETHGlobal](https://x.com/ETHGlobal?lang=en)、[Web3Voyager](https://web3voyager.com/event/ethonline-2026)                                                                                                                                                        |
| The Graph $15K 三 track                  | [X: graphprotocol](https://x.com/graphprotocol/status/2095595183282749896)                                                                                                                                                                                          |
| The Graph track 詳細條件                 | [ETHOnline 2026 Prizes](https://ethglobal.com/events/ethonline2026/prizes)                                                                                                                                                                                          |
| Finalist Pack 制度                       | [ETHOnline 2025 Finalists](https://ethglobal.com/events/ethonline2025/prizes)                                                                                                                                                                                       |
| The Graph 早期 hackathon winners         | [December](https://thegraph.com/blog/december-hackathon-winners)、[September](https://medium.com/graphprotocol/the-graph-september-hackathon-winners-35397e9c5ddf)                                                                                                  |
| ETHGlobal Cannes winners                 | [Outposts](https://outposts.io/article/ethglobal-cannes-hackathon-winners-announced-ab98f1c9-2eea-42c2-807a-465797956d12)                                                                                                                                           |
| Agent0 Subgraphs (ERC-8004)              | [The Graph Blog](https://thegraph.com/blog/agent0-subgraphs-live-erc-8004-agent-economy/)、[Docs](https://thegraph.com/docs/en/subgraphs/existing-subgraphs/agent0/)、[Blockchain.News](https://blockchain.news/news/the-graph-agent0-subgraphs-erc-8004-ai-agents) |
| x402 + ERC-8004                          | [The Graph Blog - Onchain Agent Infra](https://thegraph.com/blog/onchain-agent-infrastructure/)                                                                                                                                                                     |
| GRC-20                                   | [GIP-0020](https://github.com/graphprotocol/graph-improvement-proposals/blob/main/grcs/0020-knowledge-graph.md)、[Wikipedia](https://en.wikipedia.org/wiki/The_Graph)                                                                                               |
| The Graph 官方 AI 案例                   | [Hackathon Resources](https://thegraph.com/blog/hackathon-resources/)                                                                                                                                                                                               |

---

## 8. 不確定性標記

| 項目                                         | 狀態                                                                                                                   |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| ETHOnline 2026 確切 deadline（9/13 vs 9/16） | ⚠️ 多來源顯示活動 Sep 4-16，提交 deadline 需至官方 dashboard 確認（我們 memory 記錄 9/13 12:00 PM EDT 建議為保守策略） |
| 2026 Finalist 具體名額/獎金                  | ⚠️ 未取得官方數字（2025 有 Finalist Pack 制度，2026 預期類似）                                                         |
| The Graph track 評審細節                     | ⚠️ 未取得具體 rubric（基於官方 blog 案例推斷）                                                                         |
| Agent0 Subgraph 的 live endpoint 可用性      | ⚠️ 需實測（5 鏈已部署，但 API key 需要）                                                                               |
| GRC-20 整合難度                              | ⚠️ 需看 SDK 成熟度（GRC-20-ts 已有 library）                                                                           |
