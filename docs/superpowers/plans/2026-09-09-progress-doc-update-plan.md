# AskChing 開發進度文檔更新計畫

> 規劃員：architect（規劃部）｜Quality Mode: strict (93)｜Depth: L3 Deep Dive
> 日期：2026-09-09 ｜ 對應 Loop：loop-assess-blueprint-completion

## 0. 前置事實校準（Codebase Reality First）

| # | 驗證項 | 結果 | 影響 |
|---|--------|------|------|
| V1 | git commit 數 | 64 commits（audit 報告記載 33 是 audit 當下 snapshot） | audit 之後又新增 31 commits（showcase 文書批次） |
| V2 | johnku 缺口 1–4 | 已全部補齊（prompts / run script / copy / checklist） | 剩餘缺口只剩執行型 |
| V3 | Grok model ID | `DEFAULT_MODEL = "grok-4.6"`（index.ts:13），可被 `ASKCHING_LLM_MODEL` 覆寫 | §6.3 `MODEL = "grok-4"` 過時，需更新 |
| V4 | root scripts | `pnpm demo` / `demo:live` / `askching` / `live:smoke` | §6b `npm run demo --live` 語法過時，需校正 |

**規劃原則：**
1. audit report 是歷史 snapshot，不修改
2. `engineering-spec.md` 是 dev source-of-truth，所有最新狀態更新集中在此
3. `product-overview.md` 是對外視角，只更新交付物狀態與未來方向
4. 單一狀態來源：完成度明細以 audit report 為準，spec 放精簡摘要 + 連結

## 1. `docs/engineering-spec.md` 更新指令

### A-1. Header 進度註記（第 4–6 行）
過時內容「Phase 1b（Grok Orchestrator）為下一開發目標」→ 更新為：
```markdown
> 📌 **進度（2026-09-09）：** Phase 0 ✅（live smoke 3-source）/ Phase 1a ✅（compare_markets, research_brief, risk_scan）/ Phase 1b ✅（Grok Orchestrator：loop.ts + client.ts + CLI）/ Phase 2 ✅（Spark 第三 source + settled fan-out）/ Phase 3 ✅（README + Showcase 文書 + SKILL.md）。**Phase 4（錄影 + 提交）進行中**：4.3/4.4 ✅，4.1/4.2/4.5/4.6 待執行。
>
> 📊 **完成度：約 88%**（技術實作 100%、Phase 0–3 100%、Showcase 文書 100%、Phase 4 ~17%、Open Questions 75%）。完整審計見 `docs/reviews/2026-09-09-blueprint-completion-audit.md`。
```

### A-2. 新增「0d. 完成度摘要」節（TOC 更新）
放在 §0c Glossary 之後、§1 之前。精簡 3–4 行摘要 + 指向 audit，不複製矩陣：
```markdown
## 0d. 完成度摘要（2026-09-09）

| 區塊 | 狀態 |
|------|------|
| 技術實作（三 tools + Grok Orchestrator + 三源 fan-out） | ✅ 100% |
| Phase 0–3（live smoke → Grok → multi-source → 文書） | ✅ 100% |
| Showcase 文書（README / run script / ETHGlobal copy / checklist） | ✅ 100% |
| Phase 4（錄影 + 上傳 + repo 公開 + submit） | ⚠️ ~17%（僅 4.3/4.4） |
| Open Questions（Q1–Q4） | ⚠️ 75%（Q1 未實測） |

**總體：約 88%**。剩餘全為執行型任務（錄影、上傳、填表單、驗證），無核心程式碼風險。完整審計：`docs/reviews/2026-09-09-blueprint-completion-audit.md`。
```

### A-3. §2 Package 結構 — 移除全部 (TO BUILD)
| 現在 | 改成 |
|------|------|
| `index.ts  # Grok tool-calling loop (TO BUILD)` | `index.ts  # Grok CLI entry (DEFAULT_MODEL, env config)` |
| `loop.ts   # Core loop logic (TO BUILD)` | `loop.ts   # runGrokOrchestrator() — in-process tool loop` |
| `loop.test.ts  # Loop tests (TO BUILD)` | `loop.test.ts  # Loop tests (mock LLM)` |
| （缺 client.ts） | 新增 `client.ts  # OpenAI-compatible client` + `client.test.ts` |
| `demos/demo.ts  # One-click demo CLI (TO BUILD)` | `demos/demo.ts  # One-click demo CLI (✅)` |
| （缺 demos 說明） | `demos/prompts.md  # Demo A/B/C 三源 prompts（✅ 已定稿）` |

### A-4. §4 MCP Tools — 無需修改（已全部標 ✅）

### A-5. §5.4 移除「Phase 0 必須驗證」警示
→ 改為：
```markdown
**✅ 已驗證（2026-09-08）：** `DEMO_LIVE=1 pnpm live:smoke` 三源全回（Compound V3 4.6453% / Aave V3 3.6283% / Spark Lend 3.5419% @ blocks 25,933,794–795），field mapping 正確，完整 citation 返回。
```

### A-6. §6 標題「Phase 1 核心缺口」→「已實作」
```markdown
`packages/grok-orchestrator/` — **✅ 已實作（2026-09-08，commits 53dc3fa / 0c71cd0）**。含 loop.ts（212 行 runGrokOrchestrator，ASKCHING_TOOLS 3 工具、maxTurns=4）、client.ts（OpenAI-compatible）、index.ts（CLI entry）、loop.test.ts / client.test.ts。
```

### A-7. §6.2b 加「✅ 已實作」註記
`mcp-server` 已 export compareMarkets，orchestrator 直接 in-process import（與設計一致）。

### A-8. §6.3 Grok API Config — 更新 model ID 真實值
```typescript
// xAI API — 實際實作（packages/grok-orchestrator/src/index.ts:13,37）
const XAI_API_BASE = "https://api.x.ai/v1";
const DEFAULT_MODEL = "grok-4.6";  // 可被 ASKCHING_LLM_MODEL env 覆寫
// ⚠️ Q1 追蹤：grok-4.6 尚未以真實 xAI API 驗證（見 §13 Q1）
```

### A-9. §6.4 XAI_API_KEY 標為可選
表格加註「本地 LLM（Ollama）或 fixture 模式可省略；live Grok 模式必需」。

### A-10. §6b Demo CLI 指令校正為真實 scripts
```bash
# Fixture mode（預設，DEMO_LIVE=0 pinned）
pnpm demo -- "Compare USDC supply APY across Aave V3 and Compound V3"
# Live mode（DEMO_LIVE=1 pinned）
pnpm demo:live -- "Compare USDC supply APY"
# Grok orchestrator CLI（真 Grok tool-calling loop，需先 pnpm build）
pnpm askching -- "Compare USDC supply APY"
# 三源 live smoke
pnpm live:smoke
```

### A-11. §7.2 Fan-out — 無需修改（已標 ✅ settled）

### A-12. §8.2「Phase 2 新增 Cases」— 標記實際狀態
表格標題改為「Phase 2 目標 Cases（實作方式：unit tests）」+ 加註：
> **實際狀態：** `evals/cases.json` 維持 5 條；settled fan-out、三源排名、gap detection 由 unit tests 覆蓋（pnpm test 21/21）。如需完整 eval 覆蓋可列為 v1.1 改善，不阻擋 submission。

### A-13. §9 Development Plan — Phase 標完成狀態
| 標題 | 改成 |
|------|------|
| Phase 0 | `### Phase 0 — Live Smoke Validation ✅ 已完成（6/6）` |
| Phase 1 | `### Phase 1 — Grok Orchestrator ✅ 已完成（5/5）` |
| Phase 2 | `### Phase 2 — Multi-source + Settled Fan-out ✅ 已完成（4/4）` |
| Phase 3 | `### Phase 3 — README + Showcase + Doc Finalization ✅ 已完成（4/4）` |
| Phase 4 | `### Phase 4 — Demo Video + Submit 🔄 進行中（2/6：4.3/4.4 ✅，4.1/4.2/4.5/4.6 待執行）` |

### A-14. §10 Acceptance Criteria — 勾選已完成項
- Final Submission AC：已完成 ✅（repo/log/README/SKILL/demo/test/build）打勾；未完成 ❌（video/upload/showcase page/submit）保留未勾

### A-15. §13 Open Questions — 標記狀態
| ID | 問題 | 狀態 |
|----|------|------|
| Q1 | Grok model ID | ⚠️ 部分決定 — grok-4.6 未以真實 API 驗證（checklist A2 fallback 流程已定義） |
| Q2 | 配音 | ✅ 已決定 — 真人旁白 |
| Q3 | 第三 source | ✅ 已決定 — Spark Lend |
| Q4 | Description 長度 | ✅ 已決定 — 備選 <60 chars（弱驗證） |

## 2. `docs/product-overview.md` 更新指令

### B-1. §5.2 交付物表 — Demo Video 標記
`Demo Video` 行：`2-4 分鐘 live demo` → `2:55 run script 已就緒，尚未錄製（Phase 4）`

### B-2. §8 未來方向
「Hackathon 交付 v1.0（...均已實作）」→ 更新為「v1.0 技術 + 文書 100% 交付（三 tools、Grok Orchestrator、三源、showcase 文書）；剩餘 Phase 4 錄影 + 提交。後續方向包括開放 Cursor/Codex/Gemini 接入、x402 agent payment、Standardized schema 等。」

### B-3. version 註記
`Document version: 1.2 — 2026-09-08` → `Document version: 1.3 — 2026-09-09（進度更新：Phase 0-3 完成，Phase 4 進行中，總體 88%）`

## 3. Done Contract（驗收標準）

- [ ] engineering-spec header 反映 Phase 0–3 完成、Phase 4 進行中
- [ ] engineering-spec §0d 完成度摘要存在且與 audit 一致
- [ ] 全部 `(TO BUILD)` 標記移除
- [ ] §6 Grok Orchestrator 標記已實作 + model ID 更新
- [ ] §9 Phase 0–3 標完成、Phase 4 標剩餘
- [ ] §13 Open Questions 狀態更新
- [ ] product-overview §5.2/§8/version 更新
- [ ] 每項更新獨立小 commit（hackathon 風格）
