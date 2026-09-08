# AskChing — Product Overview

> **「有咩唔識就 Ask Ching。」**  
> 一個 Grok-powered AI research agent，用自然語言即時查詢並分析多協議鏈上數據，背後由 The Graph 提供結構化 live data 支撐。

---

## 1. 一句話定位

AskChing 是一個 **AI 研究中間層**：你用自然語言問，Grok 決定查哪些 The Graph Subgraph，拿到 live 鏈上數據，再寫成有來源、有時間、有風險提示的 **cited research brief**。

**我們不是另一個 ChatGPT。** 我們是讓 AI agent 從「會查」變成「會答、會判斷」的基礎設施。

---

## 2. 問題痛點

| 痛點 | 現狀 | 影響 |
|------|------|------|
| **鏈上數據難查** | 區塊鏈上全是原始交易 log，像流水帳一樣沒有整潔報表 | 開發者/分析師要自己扒數據，慢、貴、重複 |
| **GraphQL 門檻高** | The Graph 雖然把數據整理成 Subgraph API，但要手寫 GraphQL 查詢 | 普通用戶/研究員難以上手 |
| **AI agent 沒可靠數據源** | LLM 沒有即時鏈上數據，只能「估」或用過期/假數據 | Agent 的分析缺乏可信度，輸出不可靠 |
| **單一協議視角** | 現有工具通常只查一個協議，無法跨協議比較 | 無法回答「哪個協議利率最高？」這種研究問題 |

### 一句話痛點

> The Graph 像圖書館索引——數據已經整理好了，但你需要知道怎麼問、問誰、怎麼讀。AskChing 是那個**識睇目錄、幫你寫摘要的研究員助手**（而且必須去圖書館攞真書，唔准亂編）。

---

## 3. 解決方案

AskChing 在 The Graph 數據之上疊加一層 **AI reasoning + multi-source synthesis**：

```
用戶自然語言提問
    ↓
Grok（xAI）理解意圖 → 決定查哪些 Subgraph
    ↓
The Graph Live Data → 多個 Subgraph 並行查詢
    ↓
數據對齊（單位、時間、schema 差異）
    ↓
Cited Research Brief（結論 + 數字 + 來源 + 風險 + 下一步）
    ↓
返回給用戶 / Cursor / Grok Bot
```

> ✅ **Live 已驗證：** 2026-09-08 用 `GRAPH_API_KEY` 執行 `DEMO_LIVE=1 pnpm live:smoke` 成功 — Compound V3 USDC supply APY 5.10%，Aave V3 3.62%（block 25932159），完整 citation 返回。詳見 `docs/engineering-spec.md` §5.4。

### 核心能力

| 能力 | 說明 | vs 官方 Subgraph MCP |
|------|------|---------------------|
| **Multi-subgraph fan-out** | 同一個問題，自動查多個協議的 Subgraph | 官方只查一個 endpoint |
| **Metric normalization** | 跨協議的單位對齊（APR vs APY、percent vs raw rate） | 官方不做對齊 |
| **Citation enforcement** | 每個數字必須帶 subgraphId + block + timestamp + queryHash | 官方只返回 raw JSON |
| **Gap detection** | 缺數據時明確標示缺口，不瞎估 | 官方不處理缺失 |
| **Research synthesis** | Grok 寫成有洞察的 brief，不只是 print 數字 | 官方不做解讀 |

---

## 4. 用戶旅程（User Journey）

### 4.1 Phase 1：Grok Bot 用戶（首發）

```
┌─────────────────────────────────────────────────┐
│  用戶在 Grok Bot 輸入自然語言問題               │
│  "邊個協議 USDC 供應利率最高？"                   │
└──────────────────────┬──────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────┐
│  AskChing SKILL 引導 Grok：                     │
│  1. 識別問題類型（compare / brief / risk）        │
│  2. 選擇對應 MCP tool                           │
│  3. 組裝參數（metric + protocols）               │
└──────────────────────┬──────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────┐
│  MCP Server 執行：                              │
│  1. Fan-out → 各 Subgraph live query            │
│  2. Normalize → 單位對齊 + 排名                  │
│  3. Cite → 每個數字帶完整來源                    │
│  4. Synthesize → Grok 寫 brief                  │
└──────────────────────┬──────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────┐
│  用戶收到 Research Brief：                      │
│  • 結論（3 句）                                 │
│  • 關鍵數字表（附 Subgraph id + block）          │
│  • As-of 時間                                   │
│  • 風險/缺口提示                                 │
│  • 建議的下一條 query                            │
└─────────────────────────────────────────────────┘
```

### 4.2 Phase 2：Cursor / Codex / Gemini 用戶（開放）

Grok Bot 驗證後，AskChing MCP Server 開放給其他 AI 工具：

| 工具 | 接入方式 | 用戶體驗 |
|------|----------|---------|
| **Cursor** | MCP Server config（`.cursor/mcp.json`） | 在 Cursor chat 中直接問鏈上問題 |
| **Codex** | MCP Server（stdio） | Codex agent 調用 research tools |
| **Gemini** | MCP Server 或 SKILL | Gemini 透過 tool-calling 使用 |
| **自建 Agent** | import `@askching/mcp-server` | 任何支援 MCP 的 agent framework |

### 4.3 用戶類型

| 類型 | 需求 | AskChing 價值 |
|------|------|--------------|
| **DeFi 研究員** | 跨協議利率比較、TVL 追蹤 | Multi-source comparison + citations |
| **AI Agent 開發者** | 需要可靠鏈上數據源 | Reusable MCP infrastructure |
| **交易員** | 即時市場監控、風險掃描 | Live data + gap detection |
| **新用戶** | 不懂 GraphQL，想用自然語言問 | NL interface + Grok reasoning |

---

## 5. 產品形態

### 5.1 技術組件

```
┌─────────────────────────────────────┐
│         AskChing Stack              │
├─────────────────────────────────────┤
│  🧠 Grok Orchestrator              │  ← AI reasoning layer
│     (xAI tool-calling loop)         │
├─────────────────────────────────────┤
│  🔧 AskChing MCP Server            │  ← Reusable infrastructure
│     compare_markets                 │
│     research_brief                  │
│     risk_scan                       │
├─────────────────────────────────────┤
│  📊 Shared Layer                    │  ← Data normalization
│     schemas / compare / citations   │
│     graph-client / fixtures         │
├─────────────────────────────────────┤
│  🌐 The Graph (Live Data)          │  ← Load-bearing dependency
│     Subgraphs / Subgraph MCP        │
└─────────────────────────────────────┘
```

### 5.2 交付物

| 交付物 | 說明 | 受眾 |
|--------|------|------|
| `@askching/mcp-server` | MCP Server（stdio），暴露 research tools | 開發者 / AI 工具 |
| `@askching/grok-orchestrator` | Grok tool-calling demo CLI | 演示 / 開發者 |
| `skills/askching/SKILL.md` | Agent 操作手冊（薄 playbook） | AI agents |
| `evals/` | 行為驗證套件 | 開發者 / CI |
| Demo Video | 2-4 分鐘 live demo | 評審 |

### 5.3 刻意不做

| 不做 | 原因 |
|------|------|
| ❌ 炒幣 / 自動下單 | 我們是研究工具，不是交易工具 |
| ❌ 自建 indexing pipeline | 用 The Graph 官方基礎設施 |
| ❌ 華麗 Dashboard / UI | MVP 專注 CLI + MCP，不做 web app |
| ❌ 另一個 Subgraph MCP | 我們在官方之上加 orchestration layer |

---

## 6. 競賽定位（ETHOnline 2026）

### 6.1 賽道

**The Graph — Best AI Tooling or AI Use Case with The Graph (From Scratch)**  
獎金：$5,000（1st $2,500 / 2nd $1,500 / 3rd $1,000）

### 6.2 Positioning

> AskChing 不取代 The Graph 官方 Subgraph MCP；我們用它做數據層，上面加 Grok 作業程序同研究報告輸出，令 agent 由「會查」變成「會答、會判斷、裝進 Cursor 就用得」。

### 6.3 評審 10 秒測試

| 測試 | 預期結果 |
|------|---------|
| 拔走 The Graph → 產品還有意義？ | **沒有**（The Graph 是 load-bearing） |
| 拔走 Grok/SKILL 層 → 有明顯差？ | **有**（只剩 raw query，沒有 reasoning） |
| 換一條 follow-up 問題 → 打第二個 subgraph？ | **會**（multi-source fan-out） |
| 結果有 as-of 和來源？ | **有**（citation 結構強制） |

### 6.4 「五個可交貨的差異」（vs 官方 MCP）

1. **Opinionated SKILL.md** — Grok 的作業程序（幾時用 Graph、點揀 Subgraph、壞 schema 點辦）
2. **Synthesis 層** — 不止 print query，而是 structured brief（結論 + 數字 + 來源 + 風險）
3. **Multi-subgraph 對照** — 同一問題打多個 Subgraph 橫向比較
4. **xAI 敘事鎖死** — Grok 做 reasoning core，不是通用模型
5. **可選 stretch：x402 付 query** — Agent 自己付 Graph 查詢（時間夠先做）

---

## 7. 競爭優勢

| 維度 | AskChing | 官方 Subgraph MCP | 一般 DeFi Dashboard |
|------|----------|-------------------|---------------------|
| 數據來源 | The Graph (live) | The Graph (live) | 自建 / 延遲 |
| 多源對比 | ✅ fan-out + normalize | ❌ 單一 query | ⚠️ 人工切換 |
| AI reasoning | ✅ Grok tool-calling | ❌ 無 | ❌ 無 |
| Citation 結構 | ✅ subgraphId + block + ts | ❌ raw JSON | ⚠️ 部分 |
| Gap detection | ✅ 明確標示缺口 | ❌ | ❌ |
| 可重用性 | ✅ MCP + SKILL | ✅ MCP | ❌ 綁 UI |
| NL 接口 | ✅ 自然語言 | ❌ 需懂 GraphQL | ⚠️ 有限搜尋 |

---

## 8. 未來方向（Hackathon 後，簡述）

Hackathon 交付 **v1.0**（Grok Bot + MCP + compare_markets + research_brief）。後續方向包括開放 Cursor/Codex/Gemini 接入、x402 agent payment、Standardized schema 等。詳見 `docs/engineering-spec.md` §11 Out of Scope。

---

## 9. 團隊與貢獻

| 角色 | 職責 |
|------|------|
| **MCP Server + Normalization** | shared schemas、compare engine、graph-client、data-source |
| **Grok Orchestrator + SKILL** | tool-calling loop、SKILL.md、demo CLI |
| **Demo + Submission** | demo video、README、showcase page |

---

*Document version: 1.2 — 2026-09-08 (renamed AskChain → AskChing per team alignment)*  
*Status: For team alignment and ETHOnline 2026 submission*
