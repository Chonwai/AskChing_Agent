# John Ku Night Commits 深度研究報告

研究日期：2026-09-09 01:30 (Asia/Hong_Kong)
研究員：morpheus (Research Dept)
Quality Mode: strict (93) / Depth: L3 Deep Dive

## 1. 結論摘要

John Ku 在 2026-09-08 21:16（`173be0e`）接手後至 09-09 00:37（`a901470`）完成 **10 個 commits / 16 檔案變更**，完整交付了 HANDOFF 指定的 Phase 1b「Grok Orchestrator」垂直切片：in-process MCP tool loop ＋ OpenAI-compatible client 與 CLI，並以三次小型修復將 demo/CLI 的環境載入與執行模式確定化。他接受並驗證了前次 handoff 交接的成果——live Graph 三源與真 Grok fixture 兩條路徑皆驗證通過。最後產出產品導向 showcase 設計 spec 指向比賽準備。驗證發現 **`pnpm build` 在乾淨環境首次執行會失敗**（缺 workspace symlink，`pnpm install` 後修復），且 **showcase deliverables 4 項中僅 spec 本身完成，其餘（run script、三源 prompts、ETHGlobal copy、checklist）全部未產出**。

## 2. Commit 逐項分析

### 第一批：Grok Orchestrator 垂直切片（22:33–22:39）

| SHA       | 類別 | 變更內容                                                                                                                           | Motivation                                                                    | 品質觀察                                                 |
| --------- | ---- | ---------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | -------------------------------------------------------- |
| `53dc3fa` | feat | `loop.ts`（212行 `runGrokOrchestrator`）＋ `loop.test.ts`（mock LLM）；mcp-server 新增 exports；vitest.config.ts 新增 source alias | 讓 Grok 自動決定查哪個 subgraph，符合賽道「reasoning, decisions, automation」 | ✅ ASKCHING_TOOLS 定義 3 工具、maxTurns=4、test 驗證完整 |
| `0c71cd0` | feat | `client.ts`（OpenAI-compatible）＋ `client.test.ts`；`index.ts` CLI（54行）；`.env.example` 新增環境變數                           | OpenAI-compatible 抽象讓 Ollama→Grok 無痛切換                                 | ✅ baseUrl 正規化、apiKey 可選、503 錯誤含 body          |
| `ce1c4d3` | docs | README + SKILL.md 更新為三工具 + Grok CLI                                                                                          | 文件與程式碼同步                                                              | ✅ 措辭謹慎，明列限制                                    |
| `e4b765d` | docs | HANDOFF.md 全面重寫（checkpoint 格式）                                                                                             | 記錄 Grok slice 完成                                                          | ✅ 結構化交接；⚠️ 刪除舊 roadmap 細節                    |

### 第二批：Demo 環境確定性修復（00:20–00:30）

| SHA       | 類別 | 變更內容                                                    | Motivation             | 品質觀察                   |
| --------- | ---- | ----------------------------------------------------------- | ---------------------- | -------------------------- |
| `183c1e9` | fix  | 新增 demo-env-config.test.ts；scripts 加 --env-file=.env    | tsx 預設不載 root .env | ✅ config-as-code 守護     |
| `616897c` | fix  | test 擴充要求 askching 也含 --env-file=.env；直接 node 執行 | CLI 憑證載入路徑修正   | ✅ 移除 pnpm 間接層        |
| `3391bc5` | fix  | pin demo=DEMO_LIVE=0、demo:live/live:smoke=DEMO_LIVE=1      | 確保 demo 模式確定性   | ✅ env prefix 覆寫正確搭配 |

### 第三批：Handoff 記錄與 Showcase 設計（00:23–00:37）

| SHA       | 類別 | 變更內容                                                            | Motivation                        | 品質觀察                             |
| --------- | ---- | ------------------------------------------------------------------- | --------------------------------- | ------------------------------------ |
| `4cf0845` | docs | HANDOFF.md 更新：記錄 live Graph 3 sources + real Grok fixture 驗證 | 記錄兩條已驗證路徑                | ✅ 驗證敘述具體（含 block numbers）  |
| `d569d31` | docs | Implementation HEAD → 3391bc5；記錄確定性 demo 模式                 | Next action 轉向比賽準備          | ✅ 目標清晰                          |
| `a901470` | docs | 新增 showcase design spec（63行）：4 段敘事、AC 6 條                | 把「準備 showcase」變成可執行設計 | ✅ 10 秒理解原則、trust segment 設計 |

## 3. 驗證證據

| 驗證項     | 結果                                                         |
| ---------- | ------------------------------------------------------------ |
| git status | ✅ clean                                                     |
| HEAD       | `a87f253`（origin/main = `a901470`）                         |
| pnpm test  | ✅ 8 files / 21 tests PASS                                   |
| pnpm eval  | ✅ 5/5 PASS                                                  |
| pnpm build | ⚠️ 首次失敗 → `pnpm install` 後 PASS（缺 workspace symlink） |

## 4. Handoff 接受事項

| 交接事項                   | 狀態                                                  |
| -------------------------- | ----------------------------------------------------- |
| Phase 1b Grok Orchestrator | ✅ 完成                                               |
| 先本地後真 Grok 切換       | ✅ 完成                                               |
| pnpm askching 可跑         | ✅ 完成                                               |
| fixture-mode test          | ✅ 完成                                               |
| 多次小 commit              | ✅ 遵守                                               |
| live Graph 三源路徑        | ✅ 驗證通過（3 sources @ blocks 25,933,794–795）      |
| 真 Grok + fixture tools    | ✅ 驗證通過（選 tool、cite 3 sources、label fixture） |
| 誠實風險定位               | ✅ 接受 spot-snapshot 設計                            |

## 5. 對比賽進展

- **技術垂直切片已完成**：MCP 三工具 + 三源 fan-out + Grok orchestrator + CLI，測試 21/21、eval 5/5
- **Showcase 設計已 ready**：4 段敘事 + 6 條可測量 AC
- **剩餘全為內容產出**：run script、三源 prompts、ETHGlobal copy、checklist、錄影
- **不再有核心程式碼風險**

## 6. 風險與缺口

| #   | Deliverable             | 狀態      | 風險                                                                         |
| --- | ----------------------- | --------- | ---------------------------------------------------------------------------- |
| 1   | 錄影 run script         | ❌ 未產出 | -                                                                            |
| 2   | 三源 demo prompts       | ❌ 未完成 | prompts.md 仍為兩源、Demo C 仍寫「Until risk_scan is implemented」（已過時） |
| 3   | ETHGlobal copy          | ❌ 未產出 | -                                                                            |
| 4   | Pre-recording checklist | ❌ 未產出 | -                                                                            |
| 5   | Build 環境可重現性      | ⚠️        | 乾淨 clone 需先 pnpm install                                                 |
| 6   | Grok model ID           | ⚠️        | grok-4.6 為硬編碼未驗證                                                      |

## 7. 建議下一步

1. **更新 demos/prompts.md 為三源版**（5 分鐘）— showcase deliverable #2 + 錄影輸入
2. **修復 build 可重現性**（高優先）— 確認 README 涵蓋
3. **產出 run script + 錄影**（最高時間成本）— 依 spec 4 段敘事
4. **產出 ETHGlobal copy**（deadline 前必做）
5. **產出 pre-recording checklist**（按 spec AC 展開）
