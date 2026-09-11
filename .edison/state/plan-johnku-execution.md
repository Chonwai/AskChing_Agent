# 執行計畫：johnku2011 Handoff Audit → 收尾修復（architect 產出，2026-09-11）

> 來源：architect（規劃部）strict / L3 Deep Dive。此文件供 doc-review VERIFY 與 trinity EXECUTE 參照，非交付物。

## 1. 處置決策

**5 個 dirty files 全部還原為 HEAD 版本（`git checkout`）**：

- `README.md` / `demos/prompts.md` / `packages/mcp-server/src/mcp-smoke.ts` / `skills/askching/SKILL.md` / `skills/askching/agents/openai.yaml`
- 理由：HEAD（`9a3f592` code + `904a680` handoff）是 johnku 已驗證交付（7/7 驗證、clean 99/99）；dirty diff 是未完成回退（3-tool、格式倒退），無保留價值
- `.edison/state/loop-johnku-handoff-audit.md` 保留 untracked，**不 commit**

```bash
git checkout -- README.md demos/prompts.md packages/mcp-server/src/mcp-smoke.ts skills/askching/SKILL.md skills/askching/agents/openai.yaml
git status
pnpm test   # 預期 99/99
pnpm eval   # 預期 20/20
```

## 2. 工作項（P0/P1/P2）

### A. 修復 dirty files（P0，唯一前提）

- A1: 還原 5 dirty files → `pnpm test` 99/99、`pnpm eval` 20/20
- A2: 確認 `.edison/` 仍 untracked

### B. 補 johnku 批次缺口

- B1 (P2 可選): **Q1 lastGaps 覆寫** — `data-source.ts:94` 已在每次 fetch 時 `lastGaps.length = 0` 清空（no-op 重複清空無意義）。真正問題是：`packages/mcp-server/src/tools.ts:137-152` 的 `addLiveGaps()` 讀取 `lastGaps` 後**未立即 copy**，若 analysis 一次跑多個 metric，第二個 metric 的 `getObservations` 會清掉前一個 metric 的 gaps。修法：在 `addLiveGaps()` 開頭立即 `const snapshot = [...lastGaps]` 並用 snapshot 而非 live reference。補 `tools.test.ts`（非 data-source.test.ts）的多 metric 分析 gaps 保留測試 → `pnpm test` 100/100
- B2 (P1): Live utilization 驗證 — 跑 `ASKCHING_DEBUG=1 DEMO_LIVE=1 pnpm askching -- "Compare USDC supply APY across Aave, Compound and Spark"`（此為 `demos/prompts.md` 的 Demo A prompt，已定義），確認 utilization 由 Messari 欄位正常算出（需 GRAPH_API_KEY，HANDOFF 實證已見 utilization 90.72%）
- B3 (P0): mcp-smoke 不需改（HEAD 已含 4 tools）

### C. 比賽進展

- C1 (P0): **Grok 真實呼叫驗證** — `pnpm askching -- "Say hi"`（需 XAI_API_KEY）。`grok-4.6` model ID 可能 404 → fallback `grok-4` 並同步以下 3 處：① `.env`（`ASKCHING_LLM_MODEL=grok-4`）、② `.env.example`（同步改）、③ `docs/engineering-spec.md`（model reference）
- C2 (P0): Live data 驗證 — `pnpm live:smoke` + Demo A live 實測（需 GRAPH_API_KEY）。確認輸出含 asOf/source IDs，無 fixture 標籤
- C3 (P0): 錄 demo video 2-4 min（**純人力，不可委託**，9/12 前完成；建議納入 analyze_markets 20-30 秒）
- C4 (P0): 提交準備（repo public、README、ethglobal-copy、Topics、video 上傳）
- C5 (P1): Demo D/E 納入 run-script（若 C3 採用）
- C6 (P2): lastGaps 修復（與 Commit 2 合併，同 commit）
- C7 (P2): `~/.agents` + `~/.claude` SKILL.md 副本同步 4-tool 版

## 3. Commit 序列

```bash
# Commit 1（P0）修復 dirty files
git add README.md demos/prompts.md packages/mcp-server/src/mcp-smoke.ts skills/askching/SKILL.md skills/askching/agents/openai.yaml
git commit -m "fix: restore analyze_markets in docs and skill metadata"
# 驗證：pnpm test 99/99、pnpm eval 20/20

# Commit 2（P2 可選）lastGaps 修復（與 C6 同 commit）
git add packages/mcp-server/src/tools.ts packages/mcp-server/src/tools.test.ts
git commit -m "fix(mcp): snapshot live gaps per metric during analysis"
# 驗證：pnpm test 100/100

# Commit 3（P1）run-script 更新（若納入 analyze_markets demo）
git add docs/superpowers/plans/2026-09-09-showcase-run-script.md
git commit -m "docs: add analysis showcase segment to demo run-script"
```

## 4. 風險

| 風險                                         | 等級 | 緩解                                                                                                                                      |
| -------------------------------------------- | ---- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `grok-4.6` model ID 未驗證                   | 高   | 今天跑 C1；fallback `grok-4` 並同步 3 處（`.env` / `.env.example` / `docs/engineering-spec.md`）                                          |
| API keys 只在 `.env`                         | 中   | 確認 `.env` 存在、`.gitignore` 涵蓋                                                                                                       |
| 錄影是人力瓶頸                               | 高   | 9/12 前錄完、9/13 上午提交                                                                                                                |
| Live 子圖中途掛掉                            | 中   | 錄影前 live smoke；可降級 fixture 展示                                                                                                    |
| lastGaps 修復回歸                            | 低   | 2 行小改 + 測試把關                                                                                                                       |
| **A1 checkout 失敗 / dirty diff 有保留價值** | 低   | **Rollback：** 若 checkout 後發現誤刪，`git reflog` + `git checkout HEAD@{1} -- <file>` 找回；若 dirty diff 需保留，先 `git stash` 再還原 |

**依賴鏈：** A → C1 → C2 → C3 → C4（嚴格序列）；B/P1/P2 可與 C3/C4 平行。**Critical path = 人力錄影。**

## 4b. C4 提交準備明細（doc-reviewer M-4）

- [ ] `git status` 乾淨（`.edison/` untracked 除外）
- [ ] `pnpm build` 全綠（3 packages tsc）
- [ ] `pnpm test` 99/99（或 100/100 若含 Commit 2）
- [ ] repo 設 public（GitHub Settings）
- [ ] README Quick start 跑通（fresh clone 可執行）
- [ ] Topics: `the-graph` / `grok` / `mcp` / `defi` / `research`
- [ ] demo video 上傳 unlisted（YouTube/Loom）→ 貼入 ETHGlobal form
- [ ] `git push` main 同步 remote

## 5. 估時

- A 還原: 5-6 min｜B1: 20 min（P2）｜B2: 15 min｜C1: 15 min｜C2: 15 min｜C3: **2-4 hr（瓶頸）**｜C4: 1 hr｜C5/C6/C7: 1 hr
- **Code 部分約 1-1.5 hr 可完成；關鍵路徑在 C3 錄影**
