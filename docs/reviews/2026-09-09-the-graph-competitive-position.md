# AskChing The Graph 賽道競爭定位深度研究

研究員：morpheus（研究部）｜ 日期：2026-09-09｜ 純研究
對應 Loop：loop-assess-the-graph-competitive-position

## 1. 結論摘要

**我們做到了什麼：** 一個**證據優先（evidence-first）的 Grok-orchestrated research MCP**，在 The Graph 之上疊加「多源 fan-out + 指標正規化 + citation 強制 + 誠實缺口偵測 + Grok 推理」。技術實作 100% 完成，26 tests / 5 evals / 3 builds / MCP smoke 全綠。

**真正的優勝點（誠實評估）：** 不是「skills」或「MCP server」本身——那些確實容易做到。真正的區隔度在於**把「每個數字必須可溯源」變成結構性不變量**（Zod schema 強制，缺 citation 就 fail），以及**「拒絕捏造歷史」的誠實行為**（risk_scan 明說自己是 spot snapshot，不裝懂）。這是設計哲學，不是功能堆疊。

**誠實的弱點：** 範圍很窄（**單一 metric** `usdc_supply_apy`、**三個協議**、**同一 Messari schema**），所以「正規化」其實只是 filter，不是真正的跨 schema 對齊；`research_brief` 的「synthesis」是**模板字串插值**，不是真推理；**Grok Bot 沒有被包含在跨平台故事裡**（確認屬實）。

**一句話：** 我們贏在「證據紀律」與「誠實」，不是贏在「技術深度」或「AI 推理」。

## 2. 功能盤點

### 2.1 packages/shared

- `schemas.ts`：Zod Citation/MarketObservation/Comparison，citation 欄位強制
- `compare.ts`：compareObservations()，排序/排名/asOf/≥2 distinct subgraph/缺 citation throw
- `data-source.ts`：fixture/live 雙模式、Promise.allSettled settled fan-out、lastGaps
- `graph-client.ts`：自研 GraphGatewayClient，query Messari schema，filter USDC/LENDER/VARIABLE
- `source-config.ts`：Aave V3 / Compound V3 / Spark Lend 三 subgraph ID
- `fixtures.ts`：三源 fixture

### 2.2 packages/mcp-server

- `compare_markets`：多源比較 + 排名 + citation + asOf + timeframe caveat ✅
- `research_brief`：內部呼叫 compare_markets，模板包成 brief ⚠️ 模板插值
- `risk_scan`：peer-relative spot snapshot，明說無 time-series ✅ 誠實

### 2.3 packages/grok-orchestrator

- `loop.ts`：runGrokOrchestrator()，in-process tool-calling loop，直接 import MCP handler
- `client.ts`：OpenAIChatCompletionClient，預設 xAI Grok
- `index.ts`：CLI entry，讀 SKILL.md 當 system prompt，預設 grok-4.6
- `output.ts`：renderOrchestratorOutput()，debug trace

### 2.4 其他

- demos/：demo.ts / live-smoke.ts / prompts.md（Demo A/B/C 三源）
- evals/：cases.json（5 cases）/ run.ts / 3 contract tests
- skills/askching/：SKILL.md + agents/openai.yaml
- .claude/skills/ + .agents/skills/：symlink 已建立

### 2.5 驗證結果

```
pnpm test → 10 files, 26 tests PASS ✅
pnpm eval → 5/5 PASS ✅
pnpm build → 3/3 PASS ✅
pnpm mcp:smoke → mcp-smoke OK: askching (3 tools) ✅
```

## 3. The Graph 賽道應用

### 3.1 用了 The Graph 的什麼？

- Messari Standardized Subgraphs（Aave V3 / Compound V3 / Spark Lend）
- Graph Gateway（gateway.thegraph.com/api/subgraphs/id/{subgraphId}）
- 三個硬編碼 subgraph ID
- Live data（DEMO_LIVE=1 + GRAPH_API_KEY）

### 3.2 在 The Graph 之上加了什麼？

1. Multi-subgraph fan-out（Promise.allSettled）
2. Metric normalization（filter USDC/LENDER/VARIABLE，對齊 percent）
3. Citation enforcement（每個數字強制帶 subgraphId + block + timestamp + queryHash）
4. Gap detection（部分 source 失敗收集 lastGaps，要求 ≥2 cited source）
5. Ranking（compareObservations 排序）
6. Grok synthesis（orchestrator 讓 Grok 決定 tool 並寫 brief）

### 3.3 vs 官方 Subgraph MCP

| 維度      | 官方 Subgraph MCP                 | AskChing               |
| --------- | --------------------------------- | ---------------------- |
| 定位      | discover schema + 查單一 subgraph | research layer         |
| 多源      | ❌ 單一 query                     | ✅ fan-out + normalize |
| Citation  | ❌ raw JSON                       | ✅ 結構強制            |
| Gap       | ❌ 不處理                         | ✅ 明確標示            |
| Reasoning | ❌ 無                             | ✅ Grok tool-calling   |
| 關係      | —                                 | 互補，非取代           |

> 誠實評估：官方 MCP 是「查詢介面」，我們是「研究層」。定位對，但「正規化」難度被高估（同 schema，filter 即可）。

## 4. 創新點 / 優勝點分析

### 🔴 Hard-to-copy（真正有區隔度）

| 創新點                 | 為什麼難複製                                        | 誠實評估            |
| ---------------------- | --------------------------------------------------- | ------------------- |
| Citation 結構性強制    | 不是 feature，是 schema 不變量——缺 citation 就 fail | ⭐⭐⭐⭐⭐ 最強     |
| Fail-closed + 誠實缺口 | risk_scan 明說「無 time-series，不裝懂」            | ⭐⭐⭐⭐⭐ 信任訊號 |
| Settled fan-out 語義   | Promise.allSettled 允許部分失敗、收集 gaps          | ⭐⭐⭐⭐ 工程決策   |
| Grok-orchestrated loop | AI 決定用哪個 tool，in-process 執行                 | ⭐⭐⭐ 但見弱點     |

### 🟢 Easy-to-copy（用戶擔心的點，確認屬實）

| 項目           | 為什麼容易                                       | 誠實評估        |
| -------------- | ------------------------------------------------ | --------------- |
| SKILL.md       | 就是一份 markdown playbook                       | ⭐ 用戶擔心正確 |
| MCP server     | 標準 stdio MCP server，薄 wrapper                | ⭐⭐ 模式不新   |
| The Graph 使用 | Messari subgraph + Graph Gateway 是標準做法      | ⭐⭐ 人人會     |
| 三個 tool      | research_brief 只是呼叫 compare_markets 再包模板 | ⭐⭐ 深度不足   |

### ⚠️ 被誇大的「創新」

| 聲稱                 | 實際                                         | 誠實評估    |
| -------------------- | -------------------------------------------- | ----------- |
| Synthesis 層         | conclusion 是硬編碼模板，非真推理            | ⚠️ 誇大     |
| Metric normalization | 三源同 schema，filter 即可                   | ⚠️ 誇大     |
| risk_scan            | 是 peer-relative spot snapshot，不是風險分析 | ⚠️ 名義偏大 |
| Grok Bot             | 是 CLI，不是 bot                             | ⚠️ 名義偏大 |

### 🏆 別人為什麼給我們獎品（最可能原因）

1. 證據紀律 — 每個數字可溯源，解決 AI agent 幻覺數據的真實痛點
2. 誠實行為 — 拒絕捏造歷史，強信任訊號
3. 多源對照 — 解決「單一協議視角」問題
4. 乾淨、可測試的實作 — 26 tests / 5 evals / clean build / MCP smoke

> 但誠實說：這些是「設計哲學」的勝利，不是「技術深度」的勝利。範圍窄、synthesis 薄。

## 5. Grok Bot 覆蓋分析（用戶最關心的點）

### 5.1 Grok Bot 是否包含在多平台部分？→ ❌ 沒有

- docs/cross-platform.md 全文只講 @askching/mcp-server，完全沒提到 grok-orchestrator 或 Grok Bot
- packages/grok-orchestrator/ 是 CLI（pnpm askching），不是 MCP server
- loop.ts 是 in-process import MCP handler，不走 stdio MCP transport

### 5.2 Grok Bot 是否真的能跨平台用？→ ❌ 只在 CLI

- Grok orchestrator：CLI，需 XAI_API_KEY，in-process 執行，非 MCP client
- 跨平台故事：只涵蓋 MCP server（基礎設施層），不含 Grok 推理層
- Grok 推理：只在 CLI 展示，無法在 Cursor/Claude/Codex 中「用 Grok 推理」

### 5.3 關鍵缺口（用戶擔心屬實）

> 跨平台部分（cross-platform.md）只講 MCP server 接入，沒有明確講 Grok Bot 如何跨平台。

### 5.4 一個重要 nuance

MCP server 本身可以被任何 MCP-compatible agent 使用（包括支援 MCP 的 Grok）。所以「Grok 推理」理論上可以疊在任何平台的 MCP server 上。但實際實作（grok-orchestrator）是 CLI + in-process，沒有走 MCP transport，所以這個「理論上」沒有被實作證明。

## 6. 藍圖 vs 現狀對照

### 6.1 engineering-spec §9 Development Plan

| Phase                            | 承諾                | 現狀          | 完成度 |
| -------------------------------- | ------------------- | ------------- | ------ |
| Phase 0 — Live Smoke             | 三源 live 驗證      | ✅ 已驗證     | 100%   |
| Phase 1 — Grok Orchestrator      | loop + client + CLI | ✅ 已實作     | 100%   |
| Phase 2 — Multi-source + Settled | 三源 + allSettled   | ✅ 已實作     | 100%   |
| Phase 3 — README + Showcase      | 文書                | ✅ 已定稿     | 100%   |
| Phase 4 — Video + Submit         | 錄影 + 提交         | ⚠️ 僅 4.3/4.4 | ~17%   |

### 6.2 product-overview §6.4 五個差異

| 差異                    | 承諾                   | 現狀             | 誠實評估           |
| ----------------------- | ---------------------- | ---------------- | ------------------ |
| 1. Opinionated SKILL.md | Grok 作業程序          | ✅ 有，但薄      | ⚠️ 容易複製        |
| 2. Synthesis 層         | structured brief       | ✅ 有，但模板    | ⚠️ 誇大            |
| 3. Multi-subgraph 對照  | 橫向比較               | ✅ 完整          | ✅ 真              |
| 4. xAI 敘事鎖死         | Grok 做 reasoning core | ✅ 預設 grok-4.6 | ⚠️ model ID 未實測 |
| 5. x402 付 query        | Agent 自己付 Graph     | ❌ 未做          | ⚠️ 未兌現          |

### 6.3 藍圖承諾 vs 實際（關鍵落差）

| 藍圖承諾                        | 實際             | 落差                   |
| ------------------------------- | ---------------- | ---------------------- |
| Grok Bot 聊天介面（Phase 1）    | CLI              | 名義 vs 實作落差       |
| research_brief synthesis        | 模板插值         | 深度落差               |
| risk_scan 風險分析              | spot snapshot    | 名義落差（但誠實標示） |
| metric normalization 跨協議對齊 | 同 schema filter | 難度落差               |

## 7. 誠實缺口診斷（評審最可能質疑的點）

### 🔴 P0（最致命）

1. Demo Video 未錄製 + 未提交 — Phase 4 是唯一未完成的大塊，submission 硬性門檻
2. Grok Bot 不在跨平台故事裡 — 旗艦功能（AI 推理）沒被證明可跨平台

### 🟡 P1（會被挑戰）

3. 單一 metric — 整個產品只有 usdc_supply_apy
4. 三協議同 schema — 「正規化」難度被高估
5. synthesis 是模板 — research_brief conclusion 是硬編碼字串
6. Grok model ID 未實測 — grok-4.6 未以真實 API 驗證
7. risk_scan 名義偏大 — 是 spot snapshot，不是風險分析

### 🟢 P2（次要）

8. Build 可重現性未驗證
9. Repo 公開性未實測
10. x402 未做（stretch，可接受）

### 評審最可能問的 3 個問題

1. 「這跟官方 Subgraph MCP 差在哪？」→ 多源 + citation + 誠實缺口 + Grok。但「正規化」會被質疑（同 schema）。
2. 「你的 Grok 推理怎麼跨平台？」→ 答不出來，因為 Grok orchestrator 是 CLI，不在跨平台故事裡。
3. 「這是不是只是 skills + MCP wrapper？」→ 核心區隔是 citation 結構性強制 + 誠實缺口，不是 skills。但需要被講清楚。

## 8. 建議（如何強化優勝點 / 補缺口）

### 🔴 立即（P0，影響 submission）

1. 錄製並提交 Demo Video — 唯一硬性門檻
2. 在 cross-platform.md 補 Grok Bot 段落 — 明確說明「Grok 推理層如何跨平台」

### 🟡 強化優勝點（P1）

3. 把「citation 結構性強制」講成核心賣點 — 真正 hard-to-copy
4. 把「誠實缺口」講成信任差異化 — risk_scan 拒絕捏造歷史
5. 補一個「跨 schema 正規化」的真實案例 — 加不同 schema 協議（如 Morpho）
6. 驗證 grok-4.6 model ID

### 🟢 補缺口（P2，若時間允許）

7. 加第二個 metric（如 eth_supply_apy）
8. 把 research_brief synthesis 從模板升級為真推理
9. 驗證 build 可重現性 + repo 公開性
