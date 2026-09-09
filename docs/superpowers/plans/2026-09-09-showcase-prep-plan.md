# AskChing Showcase 執行計畫 (v1.0)

> **日期：** 2026-09-09
> **目標：** 依 showcase design spec 產出全部 Showcase 交付物，準備錄影並提交 ETHOnline 2026。
> **深度模式：** L3 Deep Dive (Quality Mode: strict 93)

---

## 1. 目標與 Done Contract

**目標：** 將 AskChing 從「技術垂直切片完成」推進至「比賽錄影與提交就緒」。Hackathon 時間壓力下，以最小變更優先（Prompts），最高時間成本集中（Run Script），確保在 2 小時內完成所有文書交付。

### Done Contract

- [ ] `demos/prompts.md` 包含三源（Aave/Compound/Spark）且 Demo C 邏輯正確
- [ ] `docs/superpowers/plans/2026-09-09-showcase-run-script.md` 產出完整 2:55 逐字稿與畫面動作
- [ ] `docs/superpowers/specs/2026-09-09-ethglobal-copy.md` ETHGlobal 所需 Title / Description / Tech List
- [ ] `docs/superpowers/specs/2026-09-09-pre-recording-checklist.md` Pre-recording 勾選清單
- [ ] 所有 Phase 有獨立 git commit（hackathon 風格）

---

## 2. Phase 拆解

### Phase A：Prompts 定稿 (10 分鐘)
變更點最少，直接決定 Demo C 的敘事誠實度。

| 任務 | 產出檔案 | 驗收標準 |
| --- | --- | --- |
| Demo A 三源改寫 | `demos/prompts.md` | protocols 改為 `["aave-v3", "compound-v3", "spark-lend"]` |
| Demo C 誠實 Gap 改寫 | `demos/prompts.md` | 移除「Until risk_scan is implemented」過時字句，改寫為 spot-snapshot 誠實描述 |
| Locked Sources 表加 Spark Lend | `demos/prompts.md` | 新增 Spark Lend 行（ID: `GbKdmBe4ycCYCQLQSjqGg6UHYoYfbyJyq5WrG35pv1si`） |
| As-of 語句 | `demos/prompts.md` | 加入「Every result must state `asOf` block timestamp.」 |

### Phase B：Run Script (1–1.5 小時)
最高時間成本，精確對齊 Spec 的 4 段敘事。

| 段落 | 時間 | 逐字稿重點 | 畫面動作 |
| --- | --- | --- | --- |
| 1. Problem | 0:00–0:20 | DeFi rates 分散在不同 subgraph，難以比較 | 展示雜亂的 subgraph 視窗 vs AskChing CLI |
| 2. Workflow | 0:20–1:55 | Watch Grok choose the tool... Fan out to 3 live subgraphs... | 執行 Prompt A → 展示 3 citations + asOf |
| 3. Trust | 1:55–2:25 | AskChing refuses to fabricate history... | 執行 Prompt C (risk_scan) → 展示誠實 gap |
| 4. Close | 2:25–2:55 | Not search — reasoning over evidence | README 架構圖 + GitHub repo URL |

**產出檔案：** `docs/superpowers/plans/2026-09-09-showcase-run-script.md`

### Phase C：ETHGlobal Copy (20 分鐘)

| 項目 | 內容 |
| --- | --- |
| Title | AskChing: Grok-Reasoning Agent for Multi-Subgraph DeFi Research |
| Short | A cited research agent that compares live DeFi metrics across multiple The Graph subgraphs using Grok. |
| Long | See §6.1 |
| Tech Stack | TypeScript, The Graph (Subgraphs), xAI Grok, Model Context Protocol (MCP) |
| Repo | `https://github.com/Chonwai/AskChing_Agent` |
| Video | `[Placeholder for 2-3 min demo]` |

**產出檔案：** `docs/superpowers/specs/2026-09-09-ethglobal-copy.md`

### Phase D：Checklist (20 分鐘)

Pre-recording + Pre-submission 勾選清單，依 Spec AC 6 條展開。

**產出檔案：** `docs/superpowers/specs/2026-09-09-pre-recording-checklist.md`

### Phase E：Build 可重現性提示 (5 分鐘，可選)

在 README 加粗 `pnpm install` 前置說明。

---

## 3. 依賴關係

```
Phase A（prompts）→ Phase B（run script 需使用定稿 prompts）
Phase C（copy）= 可與 B 並行
Phase D（checklist）= 可與 B 並行
Phase E（README）= 最後微調
```

## 4. 風險與 Mitigation

| 風險 | Mitigation |
| --- | --- |
| Grok model ID `grok-4.6` 未驗證 | 錄影前先執行 test，切換至 grok-4 若失敗 |
| Graph subgraph 延遲 | `pnpm demo` (fixture mode) 作為 backup |
| 錄影雜音/語速 | 至少 3 次 Dry-run |

## 5. Maker ≠ Checker

- **Maker (Trinity):** 所有文件產出
- **Checker (smith/edison-doc-reviewer):** 審查 prompts（subgraph ID 正確性）、run script（無誇大/交易字眼）、ETHGlobal copy（準確性）
