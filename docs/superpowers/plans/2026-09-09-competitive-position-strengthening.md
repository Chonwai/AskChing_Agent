# AskChing 賽道優勝點強化 + Grok Bot 跨平台補缺方案

> 規劃員：Neo（基於 morpheus 深度研究，architect 因網路/rate-limit 中斷，Neo 直接合成）
> 日期：2026-09-09｜ Quality Mode: strict (93)｜ Depth: L3
> 對應 Loop：loop-assess-the-graph-competitive-position
> 研究基礎：`docs/reviews/2026-09-09-the-graph-competitive-position.md`

## 0. 核心結論（回答用戶問題）

**我們做了什麼？** 一個**證據優先的 Grok-orchestrated research MCP**：多源 fan-out + 指標正規化 + citation 結構性強制 + 誠實缺口偵測 + Grok 推理。技術 100% 完成，26 tests / 5 evals / 3 builds / mcp-smoke 全綠。

**對 The Graph 應用了什麼？** Messari Standardized Subgraphs（Aave/Compound/Spark 三源）+ Graph Gateway + live data，之上加了 research layer。

**寫了什麼功能？** compare_markets / research_brief / risk_scan 三個 MCP tools + Grok orchestrator CLI + SKILL playbook + 跨平台 packaging。

**做了什麼擴充？** Spark 第三源、settled fan-out、debug trace、cross-platform symlink、npm publish-ready、mcp-smoke 測試。

**有什麼創新？** 🔴 Citation 結構性強制（schema 不變量）+ 誠實缺口（拒絕捏造）是真正 hard-to-copy；🟢 skills/MCP server 本身容易做到。

**別人為什麼給獎品？** 證據紀律 + 誠實行為 + 多源對照 + 乾淨可測試實作。這是設計哲學的勝利，不是技術深度的勝利。

**Grok Bot 在多平台嗎？** ❌ 目前**沒有**——cross-platform.md 只講 MCP server。**這是本方案要補的核心缺口。**

**這些做到了嗎？** 技術/文書 100% ✅；Phase 4 錄影+提交 ❌（P0 缺口）；Grok Bot 跨平台 ❌（P0 缺口）。

## 1. 強化方案 A：把「citation 強制 + 誠實缺口」講成核心賣點

### A1. README.md — 新增「Evidence-first by design」段落
在「Why AskChing」或「Status」之後加：
```markdown
## Evidence-first by design

AskChing treats provenance as a structural invariant, not a display option:

- Every returned number carries `subgraphId`, `block`, `timestamp`, and `queryHash`.
- A comparison without at least two distinct cited sources **fails closed** — no partial credit.
- `risk_scan` reports peer-relative spot signals and explicitly states it is **not** historical time-series analysis.

This means AskChing refuses to fabricate. When it cannot verify, it says so.
```

### A2. ethglobal-copy.md — 把 Long Description 的賣點從「synthesis」改為「evidence discipline」
- 現況強調 synthesis/normalization（會被質疑）
- 改成強調：**「Every number is traceable to a live subgraph. AskChing refuses to guess.」**

### A3. product-overview.md §7 競爭優勢表 — 加「Evidence invariant」列
在 Gap detection 後加一行：`| 證據不變量 | ✅ schema 強制，缺 citation 就 fail | ❌ raw JSON | ⚠️ 無 |`

### A4. showcase-run-script.md — Trust segment 加重「拒絕捏造」鏡頭
- 現有 §3 Trust behavior（1:55–2:25）已展示 risk_scan 誠實 gap ✅
- 加一句旁白強化：**「This is the product's core promise: AskChing would rather say 'I don't have that data' than invent an answer.」**

## 2. 強化方案 B：補 Grok Bot 跨平台缺口（P0，用戶最關心）

### 決策裁決：**補文件說明（快速）為主 + 標記 Grok-as-MCP 為 roadmap（不實作）**
理由：
- Hackathon 時間有限，實作 Grok-as-MCP（把 orchestrator 包成 MCP server）需要新增 transport + 測試，風險高
- 文件說明足以讓評審理解「MCP server 可被任何 MCP-compatible agent（含支援 MCP 的 Grok）使用」
- 誠實標記「Grok orchestrator 目前是 CLI，跨平台推理層是 roadmap」

### B1. docs/cross-platform.md — 新增「Grok 推理層」段落（§9）
在 §8 驗證後新增：
```markdown
## 9. Grok 推理層（Roadmap）

AskChing 的 MCP server 可被**任何 MCP-compatible agent**（Claude、Cursor、Codex、支援 MCP 的 Grok）使用。

Grok orchestration（`@askching/grok-orchestrator`）目前是 **CLI**（`pnpm askching -- "..."`），
以 in-process 方式呼叫 AskChing tools。讓 Grok 推理層以 **MCP server 形式**跨平台可用的實作已列入
roadmap——屆時任何 MCP-compatible agent 都能直接呼叫 Grok 驅動的 AskChing 推理，而不只是工具層。

### 現況 vs roadmap
| 層 | 現況 | Roadmap |
|----|------|---------|
| MCP server（工具層） | ✅ 跨平台可用（本文件 §3-§7） | — |
| Grok orchestrator（推理層） | CLI + in-process | MCP server 化，跨平台可用 |
```

### B2. README.md — 「Ask Grok」段落加一句跨平台說明
```markdown
> Grok 推理層目前為 CLI。讓它成為 MCP server 的實作已列入 roadmap，屆時任何 MCP-compatible agent
> 都能直接呼叫 Grok 驅動的 AskChing 推理。MCP 工具層現在就已跨平台可用（見 `docs/cross-platform.md`）。
```

### B3. product-overview.md §4.2 Phase 2 — 調整「Grok Bot 驗證後」措辭
現況暗示 Grok Bot 已跨平台 → 改為誠實：
```markdown
Grok 推理層（CLI）驗證後，AskChing MCP Server 開放給其他 AI 工具；Grok 推理層的 MCP server 化
列為 roadmap。
```

## 3. 強化方案 C：誠實修正被誇大的創新

### C1. research_brief「synthesis」誠實標示
- `docs/engineering-spec.md` §4.2：加註「實作方式：內部呼叫 compare_markets，模板包裝（非 LLM synthesis）」
- `docs/product-overview.md` §3 核心能力表：「Research synthesis」→「Structured brief（模板包裝，Grok 版本為 LLM synthesis）」

### C2. risk_scan 命名描述誠實化
- 已在 spec §4.3 標「誠實 spot-snapshot 版」✅
- `SKILL.md` 已標「peer-relative spot signals, not historical analysis」✅
- 保持現狀（已誠實），不需改

## 4. 優先序（P0/P1/P2）

| 優先 | 項目 | 產出 |
|------|------|------|
| 🔴 P0 | 錄影 + 提交（Phase 4） | demo video + YouTube upload + ethglobal submit |
| 🔴 P0 | Grok Bot 跨平台定位（B1/B2/B3） | cross-platform.md §9 + README + product-overview |
| 🟡 P1 | citation/誠實賣點放大（A1/A2/A3/A4） | README + ethglobal-copy + product-overview + run-script |
| 🟡 P1 | 誠實修正 synthesis 描述（C1） | engineering-spec + product-overview |
| 🟢 P2 | 加第二 metric / 跨 schema 案例 | 若時間允許 |

## 5. Done Contract（驗收標準）

- [ ] cross-platform.md §9 新增「Grok 推理層（Roadmap）」段落，說明 MCP server 可被任何 MCP-compatible agent（含 Grok）使用
- [ ] README 加「Evidence-first by design」段落 + Grok 跨平台說明
- [ ] product-overview §3 核心能力表誠實標示 synthesis（模板包裝）+ §4.2 Grok roadmap
- [ ] ethglobal-copy Long Description 賣點改為 evidence discipline
- [ ] engineering-spec §4.2 加 synthesis 實作方式註記
- [ ] showcase-run-script Trust segment 加「拒絕捏造」旁白
- [ ] 每個變更獨立小 commit（hackathon 風格）
