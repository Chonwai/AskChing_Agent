# AskChing — ETHOnline 2026 強化策略提案

> 建立日期: 2026-09-11｜狀態: proposed｜對應研究: `docs/reviews/2026-09-11-ethonline-prize-research.md`
> 目的: 回答「系統夠不夠強、分析值不值錢、如何讓 The Graph 評審 Wow」並給出可執行強化路徑

---

## TL;DR

AskChing 已具備 **真實競爭力**（evidence-first + 多 subgraph fan-out + Grok NL routing 正是 The Graph 官方推崇的 DeFi research agent 模式），但要**在 9/13 前最大化獲勝機率**，需要做三件事：

1. **敘事對齊官方風口**（零成本，立即做）：README/ETHGlobal copy 明確對齊 The Graph 的「AI agent economy」敘事
2. **補歷史時序分析**（中成本，最 wow）：從 spot-only 升級到 7d trend——「數據分析值錢」的直接證明
3. **策略性押注 Agent0/ERC-8004**（展示未來願景）：讓 AskChing 成為「研究 agent 生態的 agent」

---

## 1. 系統強度評估

### 1.1 我們做對了什麼（對齊官方）

The Graph 官方 Hackathon Resources 頁面明示「AI Tooling」track 的獲獎模式：

> 「a DeFi research agent that answers natural-language questions like *'which lending markets have the highest USDC supply APY right now?'* by querying Subgraphs through the Subgraph MCP」

**AskChing 完全命中這個模式**：Grok NL 輸入 → 跨協議 fan-out → cited research brief。這是官方認定的方向，不是自嗨。

### 1.2 我們缺什麼（對齊官方 = 補強方向）

| 官方熱點 | AskChing 現況 | 差距 |
|---|---|---|
| Subgraph MCP（官方推廣） | ✅ 自研 MCP + 支援官方 MCP 敘事 | 可更緊密 |
| Standardized Subgraphs（Messari） | ✅ 3 Messari subgraphs | 夠 |
| **Substreams（real-time stream）** | ❌ 未用 | 🔥 可補 |
| **Agent0 / ERC-8004（agent 經濟）** | ❌ 未用 | 🔥🔥 最 wow |
| **x402（agent 自主付費）** | ❌ roadmap | 🔥 敘事加分 |
| **GRC-20（知識圖譜）** | ❌ 未用 | 🔥 Cannes 贏家方向 |
| 歷史時序數據 | ❌ spot-only | 🔥 分析深度關鍵 |

---

## 2. 「分析值不值錢？」— 研究證據

**結論：值錢，而且是最值錢的。**

### 2.1 過往得獎者證據

| 獎項 | 得獎者 | 做的分析 |
|---|---|---|
| The Graph Dec 早期 | DeeJay's Unchained | **歷史價格/volume 趨勢分析** + 視覺化 |
| The Graph Sep 早期 | Kauri subgraph | 文件平台查詢工具 |
| Cannes GRC-20 Library | Cosmiq | AI 平台（prompts → web3 apps） |
| Cannes Hypergraph 1st | Hypermaps | **LLM mind-mapping（知識圖譜）** |
| Cannes Token API 1st | CCTUP | **跨鏈交易管理（數據分析）** |
| Cannes Token API 2nd | circules_subgraph | **代幣流動視覺化（數據分析）** |

**模式：The Graph 評審偏愛「把鏈上數據變成可理解洞察」的項目。** 純工具（查詢）不如「數據分析 → 洞察」值錢。AskChing 的 `analyze_markets`（yield/liquidity/evidence quality）已在正確方向，但**缺時間維度**。

### 2.2 為什麼歷史趨勢最 wow

- The Graph 的核心賣點之一就是**歷史數據可查**（區塊鏈不可變，subgraph 保存完整歷史）
- 目前 AskChing 的 `risk_scan`/`analyze_markets` 都誠實標示 spot-only——這是優點（誠實），但也意味著**沒用到 The Graph 的歷史數據能力**
- 展示「過去 7 天 APY 趨勢 + 流動性變化」= 直接證明 The Graph 歷史數據的價值 = 評審最想看到的
- 這也回應「數據分析值不值錢」：**跨協議 + 跨時間的比較分析**是 DeFi 研究員真正的需求

---

## 3. 強化提案（P0/P1/P2）

### P0 — 敘事與提交（零代碼，立即做）

| # | 動作 | 檔案 | 驗證 |
|---|---|---|---|
| P0-1 | README 加「The Graph AI agent economy」段，對齊官方案例敘事 | `README.md` | README 渲染 |
| P0-2 | ETHGlobal copy 強調 evidence-first + 官方 DeFi research agent 模式 | `docs/superpowers/specs/2026-09-09-ethglobal-copy.md` | copy 更新 |
| P0-3 | Demo video 加「為何 The Graph」段（30 秒） | run-script | video |

### P1 — 歷史時序分析（中成本，最 wow，hackathon 內可完成）

| # | 動作 | 檔案 | 驗證 |
|---|---|---|---|
| P1-1 | 新增 `trend_analysis` objective：多 block 查詢 supply_apy 歷史 | `packages/shared/src/analysis.ts` | 新 test |
| P1-2 | 輸出 7d 趨勢（slope + min/max + volatility） | `packages/shared/src/analysis.ts` | 新 test |
| P1-3 | MCP 註冊新 objective | `packages/mcp-server/src/tools.ts` | tools.test |
| P1-4 | Grok routing 支援 | `packages/grok-orchestrator/src/loop.ts` | loop.test |

> ⚠️ 需確認 Messari subgraph 是否支援多 block 歷史查詢（`markets(block: {number: N})`）。若支援，這是純加分項；若不支援，用 Substreams 或降級為「多時點 snapshot 比較」。

### P2 — 生態風口（高成本，看時間；最低成本是「敘事」）

| # | 動作 | 成本 | 加分 |
|---|---|---|---|
| P2-1 | **Agent0 Subgraph 查詢 demo**：AskChing 查 ERC-8004 agent registry，展示「研究 agent 生態」 | 高 | 🔥🔥🔥 |
| P2-2 | **x402 敘事**：demo 口頭說「未來 agent 自主付費查詢」（README roadmap） | 低 | 🔥🔥 |
| P2-3 | **GRC-20 願景**：brief 輸出未來可轉成知識圖譜結構 | 低 | 🔥 |
| P2-4 | Grok orchestrator 打包成 MCP server | 中 | 🔥🔥 |

---

## 4. 提交策略（最大化 The Graph 獲勝機率）

### 4.1 Track 選擇

| Track | 適合度 | 理由 |
|---|---|---|
| **AI Tooling or Use Case, From Scratch** | ✅✅✅ | first commit 9/8 > hackathon 開始 9/4，完全 From Scratch 合規；AI tooling 明確 |
| Composable or Standardized Graph Products | ⚠️ 備選 | 我們用了 Messari Standardized Subgraphs，但主要賣點是 AI tooling |

**主打 From Scratch，README 提及標準化 schema 作為加分。**

### 4.2 Finalist 獎項

- **確認**：ETHGlobal 每屆有官方 Finalist 制度（2025: Finalist Pack 含 perks + prizes）
- 2026 預期類似（Top teams 入選）
- **策略**：即使沒拿 The Graph sponsor prize，進 Top 10 Finalist 也有官方認可
- ⚠️ 具體名額/獎金待官方公佈確認

### 4.3 Demo 敘事升級

```
現在的敘事：Grok 自然語言 → 多 subgraph 比較 → cited brief
升級後敘事：AskChing 是 DeFi research agent——
  ① 自然語言問 DeFi 問題
  ② Grok 決定查哪些 subgraph（多源 fan-out）
  ③ 每個數字帶完整 provenance（subgraphId/block/timestamp/queryHash）
  ④ 誠實報告缺口（spot-only、缺資料）
  ⑤ 未來：研究整個 agent 經濟（ERC-8004）+ 自主付費（x402）
```

---

## 5. 執行計畫（至 9/13）

| 日期 | 任務 | 依賴 |
|---|---|---|
| 9/11（今天） | ✅ 研究報告 + 策略提案 commit；P0-1/P0-2 敘事更新 | 無 |
| 9/12 | P1 歷史時序分析（若 Messari 支援）或降級方案；C3 錄影 | P1 驗證 |
| 9/12 晚 | C4 提交準備（repo public、README、video 上傳） | C3 |
| 9/13 上午 | 最終提交（buffer） | 全部 |

---

## 6. 結論

**AskChing 夠強到「入圍」，但要「獲獎」需要補上 The Graph 2026 的風口敘事 + 歷史時序分析。**

- ✅ 已具備：evidence-first（獨特賣點）、多源 fan-out、NL routing、誠實 gap 報告
- 🔥 要補：歷史時序分析（最 wow）+ Agent0/x402/GRC-20 風口敘事（最對齊官方）
- 🏆 分析確實值錢：跨協議 + 跨時間的比較分析是 The Graph 評審最認可的價值
- 📋 Finalist：ETHGlobal 官方有 Finalist 制度（獨立於 sponsor prize），值得拼
