# AskChing — Handoff 文檔（給 johnku2011）

> **日期：** 2026-09-08（hackathon Day 4）
> **接手人：** johnku2011（John Ku）— 今晚接手開發
> **目前 HEAD：** `ce3e4d7`（已 push 到 origin/main）
> **提交截止：** 2026-09-13 12:00 PM EDT（台北 9/14 00:00）— 還有 **~5 天**

---

## 🎯 一句話現況

AskChing 的 **MCP research 層已完成**（compare / brief / risk / demo / 3-source fan-out 全部跑通並 live 驗證）。**唯一剩下的核心缺口是 Grok Orchestrator**（讓 Grok 自動決定查哪個 subgraph → 組 query → 寫 brief），這是賽道要求 "reasoning, decisions, automation" 的命脈，也是今晚最高價值的開發目標。

---

## ✅ 今天（9/8）完成的開發

| # | 功能 | Commit | 狀態 |
|---|------|--------|:---:|
| 1 | **Phase 0 live smoke** 驗證 | `0555678` | ✅ Aave 3.62% / Compound 5.10% |
| 2 | **smith code review**（John Ku 早期 code）| `e208658` | ✅ **93.15/100 PASS** |
| 3 | 修復 M1（graph-client 錯誤路徑測試）| `e3c6f57` | ✅ +3 tests |
| 4 | 修復 M2（schema 集中到 tools.ts）| `330c861` | ✅ |
| 5 | 修復 A4（docs 標 live 已驗證）| `0555678` | ✅ |
| 6 | **research_brief handler** | `74b80e9` | ✅ live E2E 驗證 |
| 7 | **demo CLI**（`npm run demo`）| `dc87dcd` | ✅ fixture + live |
| 8 | **risk_scan**（誠實 spot-snapshot 版）| `42b1f04` | ✅ |
| 9 | **settled fan-out**（`Promise.allSettled`）| `a53e4e7` | ✅ |
| 10 | **Spark Lend 第三 source** | `d74425e`, `b416ec0` | ✅ live **3.54%** |

### 測試驗證（全部綠）

```
pnpm test  → 16 tests passed ✅
pnpm build → all packages ✅
npm run demo → fixture 3 sources ✅
DEMO_LIVE=1 npm run demo:live → live 3 sources ✅
```

### Live 3-source Demo 結果（block 25932799）

| 排名 | 協議 | USDC Supply APY |
|:---:|------|:---:|
| 🥇 | **Compound V3** | **4.8573%** |
| 🥈 | Aave V3 | 3.6238% |
| 🥉 | Spark Lend | 3.5419% |

---

## 🗺️ 整體進度 vs 藍圖

| Phase | 內容 | 狀態 |
|:---:|------|:---:|
| Phase 0 | Live smoke validation | ✅ **完成** |
| Phase 1a | MCP tools（compare / research_brief / risk_scan / demo CLI）| ✅ **完成** |
| Phase 1b | **Grok Orchestrator** | ❌ **待開發（今晚目標）** |
| Phase 2 | 3 sources + settled fan-out | ✅ **完成** |
| Phase 3 | README 升級 + showcase + SKILL 更新 | ⏳ 待做 |
| Phase 4 | Demo video + submit | ⏳ 待做 |

---

## 🔥 今晚開發目標：Grok Orchestrator（Phase 1b）

### 為什麼最重要

賽道原文要求 "Do **meaningful work** with the data: **reasoning, decisions, automation**"。目前 `compare_markets` / `research_brief` 都是「查詢 + 模板」，還不是「Grok 理解問題 → 自動決定查哪個 subgraph」。Grok loop 是讓產品從「工具」變「agent」的關鍵，也是作品集敘事「Grok + Graph」的命脈。

### 兩個開發路徑（先本地，後真 Grok）

**路徑 A：本地 Ollama（免費、立即開始）**
```bash
brew install ollama
ollama serve &
ollama pull qwen3:8b   # 支援 tool calling 的本地模型
```
用 OpenAI-compatible endpoint：`http://localhost:11434/v1`

**路徑 B：真 Grok（需 XAI_API_KEY，demo 前才需要）**
```
xAI API: base_url="https://api.x.ai/v1", model="grok-4.6"
OpenAI-compatible，支援 function calling（tools / tool_calls）
```

### 架構（已在 engineering-spec §6 定義）

```
User NL prompt
  → LLM（Ollama 開發 / Grok demo）看 SKILL.md rules
  → 決定 tool call → compare_markets({ metric, protocols })
  → in-process import compareMarkets() from @askching/mcp-server/tools.js
  → LLM 收 structured result → 合成 brief
  → return
```

**關鍵點：** LLM client 用 OpenAI-compatible 抽象，換 `base_url` 就能從 Ollama 切到 Grok（無痛）。

### 檔案位置

- `packages/grok-orchestrator/src/index.ts` — 目前只有一行 stub
- 新建 `packages/grok-orchestrator/src/loop.ts`（核心 loop）+ `loop.test.ts`

### 最小可交付（DoD）

- ✅ `npm run askching` → 輸入自然語言 → 內部調 MCP tool → 輸出 cited brief
- ✅ fixture-mode unit test（Grok loop 測試用 mock LLM）
- ✅ Commit: `feat(grok): implement tool-calling orchestrator`

---

## 📦 今晚接手注意事項

### 環境（已完成）

- `.env` 已有 `GRAPH_API_KEY`（The Graph）
- `XAI_API_KEY` 目前空 — demo 前才需要，本地 Ollama 開發不需

### 常用指令

```bash
pnpm install       # 裝依賴
pnpm build         # build all
pnpm test          # 16 tests
pnpm eval          # 5 evals
npm run demo       # fixture demo（3 sources）
DEMO_LIVE=1 npm run demo:live   # live demo（需 GRAPH_API_KEY）
```

### 重要約定（hackathon 紀律）

1. **Start Fresh**：所有 commit 都在 9/8 之後，無 prior code — 保留此合規
2. **多次小 commit**，不 squash
3. 開發完核心功能後 **push 到 origin/main** 讓隊友同步
4. 每個功能補 **fixture-mode test**（不依賴網路）
5. 命名統一 **AskChing**（不是 AskChain）

---

## 📄 重要文檔（source of truth）

| 文檔 | 路徑 | 用途 |
|------|------|------|
| Product Overview | `docs/product-overview.md` | 宏觀定位、用戶旅程、競賽 narrative |
| Engineering Spec | `docs/engineering-spec.md` | 架構、API 契約、5-day roadmap、AC |
| Bootstrap Plan | `docs/superpowers/plans/2026-09-08-askching-bootstrap.md` | 原始 bootstrap 計畫 |
| Boot Design | `docs/superpowers/specs/2026-09-08-askching-bootstrap-design.md` | 原始設計 |
| Code Review | `docs/reviews/2026-09-08-johnku-bootstrap-review.md` | smith review 報告 |
| Demo prompts | `demos/prompts.md` | Demo 腳本 |

---

*此文檔由 Chonwai 於 2026-09-08 撰寫，供 johnku2011 接手開發。*
