# AskChing Pre-Recording & Pre-Submission Checklist

> **用途：** 錄影前與提交前的最後檢查閘門。
> **依據：** `docs/superpowers/specs/2026-09-09-product-led-showcase-design.md`（AC 6 條 + Recording behavior）。
> **使用方式：** 每個 checkbox 確認後打勾；任一條未過 → 停在該階段，不要繼續。

---

## A. Pre-Recording（錄影前）

### A1. Build / Test / Eval 綠燈

- [ ] `pnpm install` 成功（Node ≥ 20）
- [ ] `pnpm build` 無錯誤（三 package 皆 build）
- [ ] `pnpm test` 全部通過（Vitest）
- [ ] `pnpm eval` 全部通過（固定行為檢查）

### A2. 環境與憑證就緒

- [ ] `.env` 存在（由 `.env.example` 複製）
- [ ] `XAI_API_KEY` 已填入
- [ ] `GRAPH_API_KEY` 已填入
- [ ] `ASKCHING_LLM_BASE_URL=https://api.x.ai/v1`
- [ ] `ASKCHING_LLM_MODEL` 設定為有效 model ID（`grok-4.6`；若呼叫失敗改用 `grok-4`）
- [ ] **Grok model 驗證：** 執行 `pnpm askching -- "Say hi"` 確認回覆正常
- [ ] **Live smoke 驗證：** 執行 `pnpm live:smoke`（DEMO_LIVE=1）確認三源可達、無 401

### A3. Fixture Rehearsal（≥ 3 次）

- [ ] `pnpm demo`（fixture mode）執行 Demo A，確認 ranked 三行 + asOf 正常
- [ ] `pnpm demo` 執行 Demo C，確認 risk gap 文字正常
- [ ] 完整逐字稿 dry-run ≥ 3 次（對照 `docs/superpowers/plans/2026-09-09-showcase-run-script.md`）
- [ ] 語速測試：每段時間戳與實際誤差 < 5 秒

### A4. 環境乾淨（無憑證入鏡）

- [ ] 關閉所有含 `.env`、API key、secret 的視窗 / tab / editor pane
- [ ] 終端機不顯示 `XAI_API_KEY=` / `GRAPH_API_KEY=` 值
- [ ] 錄影範圍確認：無通知、無桌面敏感檔案、無其他應用程式干擾
- [ ] 若使用 MCP client 畫面，確認 env 設定不會以明文顯示

### A5. 錄影規格

- [ ] 解析度 ≥ 720p（建議 1080p）
- [ ] 人類旁白（非 TTS）
- [ ] 終端字型大小可讀（≥ 16pt）
- [ ] 錄音測試：無爆音、無鍵盤/風扇雜音
- [ ] 中心段（Live workflow）畫面標註 **LIVE**（overlay 或旁白口頭標註）

---

## B. Pre-Submission（提交前）

### B1. 影片

- [ ] 影片長度 2–4 分鐘（target 2:55）
- [ ] 影片符合 AC：十秒內看懂產品與目標用戶
- [ ] 主結果含 3 個 live sources、ranked 可比數值、blocks、`asOf`
- [ ] Grok 角色與 The Graph 角色皆明確說明
- [ ] Risk 段明確區分「spot 證據訊號」與「無歷史資料」
- [ ] 影片無憑證、無未支援聲明、無交易動作、無捏造 citation
- [ ] 影片最後顯示 repo URL（`https://github.com/Chonwai/AskChing_Agent`）
- [ ] 影片已上傳至公開平台（YouTube / Loom），取得 shareable link

### B2. Repo 設定

- [ ] repo 為 **public**（`https://github.com/Chonwai/AskChing_Agent`）
- [ ] GitHub repo 已設定 **Description / About**（貼上 ETHGlobal Short Description）
- [ ] GitHub repo 已設定 **Topics**（`the-graph`, `grok`, `mcp`, `defi`, `research`）
- [ ] `.env` 不在 git 追蹤內（`.gitignore` 已涵蓋）
- [ ] 無 API key 被 commit 進 history
- [ ] 提交前最後檢查：`git status` 乾淨、`git push` 完成

### B3. README 驗證

- [ ] README Quick start（`pnpm install` → `cp .env.example .env` → `pnpm build` → `pnpm test` → `pnpm eval`）可完整跑通
- [ ] README 標明 fixture mode 預設、`DEMO_LIVE=1` 才 live
- [ ] README「Current scope」與「Why not just official Subgraph MCP?」段落與影片敘事一致
- [ ] README 無誇大聲明（無 trading / yield guarantee / historical analysis）

### B4. 無誇大聲明檢查

- [ ] 全 repo 搜尋無「trading bot」「execute trades」「guaranteed yield」等誤導字眼（除明確否定句）
- [ ] 無宣稱歷史時間序列分析（`risk_scan` 僅 spot snapshot）
- [ ] 無宣稱支援其他 metric（目前僅 `usdc_supply_apy`）
- [ ] 無宣稱支援其他 protocol（目前僅 aave-v3 / compound-v3 / spark-lend）

### B5. AC 6 條逐條核對（Spec Acceptance Criteria）

| # | AC | 核對方式 | 通過 |
| --- | --- | --- | --- |
| AC1 | Viewer understands product & target user within 10 seconds | 請 1–2 位非專案者觀看前 10 秒並複述 | ☐ |
| AC2 | Main result: 3 live sources, ranked comparable values, blocks, `asOf` | 回看影片 0:50–1:35 畫面 | ☐ |
| AC3 | Grok's role & The Graph's role both explicit | 回看影片 0:38–0:50（Grok）與 0:50–1:02（The Graph） | ☐ |
| AC4 | Risk segment distinguishes spot evidence vs unavailable history | 回看影片 2:10–2:25 | ☐ |
| AC5 | Recording 2–4 min, ≥720p, human narrated | 檢查影片 metadata | ☐ |
| AC6 | No credential, unsupported claim, trading action, invented citation | 全片重看 + 逐字稿比對 | ☐ |

### B6. 提交

- [ ] ETHGlobal 表單：貼上 Title（< 60 chars）
- [ ] ETHGlobal 表單：貼上 Short Description（< 280 chars）
- [ ] ETHGlobal 表單：貼上 Long Description（3–5 段）
- [ ] ETHGlobal 表單：填 Tech List（The Graph, xAI Grok, MCP, TypeScript, pnpm monorepo, Vitest）
- [ ] ETHGlobal 表單：填 Repo URL
- [ ] ETHGlobal 表單：填 Video URL（非 placeholder）
- [ ] 提交前最後一次 `git push` 確認遠端為最新

---

## C. 失敗即停（Fail-stop）

| 狀況 | 動作 |
| --- | --- |
| 任一 Pre-recording 項目未過 | 不開錄；先修復 |
| 任一 Pre-submission 項目未過 | 不提交；先修復 |
| 錄影中 live gateway / Grok model 失敗 | 停止錄影，修復後重錄該段 |
| 發現 fixture 輸出被當 live | 立即重錄 |

> **黃金規則：** 誠實 > 完美。任何不確定或未驗證的數字，寧可不展示，也不要捏造。
