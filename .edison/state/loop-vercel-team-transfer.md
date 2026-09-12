# Loop State — Vercel 專案搬遷到付費 Team

- **Task slug**: `vercel-team-transfer`
- **Goal (Done Contract)**: 把 AskChing 專案從 free team（`chonwais-projects`）搬到付費 team（`chonwai-s-team`），搬遷後 endpoint 正常運作（6 tools、live:true）、GitHub 自動部署仍連接、env vars 完整保留、repo 內 `.vercel` 重新 link、docs 更新。
- **Quality Mode**: `strict`（threshold 93）
- **Depth**: L3（deep mode + deep research）
- **Budget**: 4 sub-agents × 2 iterations max

## 已知事實（Neo 收集）

- 目前 project：`chonwai-s-team` 與 `chonwais-projects` 兩個 scope
- 目前 .vercel/project.json：`orgId: team_v2abRpCSgrGDD0gJuE6MIJDN`（= chonwais-projects）
- Vercel CLI 59.16.0（fnm 路徑），`vercel move` 指令不存在（新版拿掉）
- CLI 有 `switch [scope]` 切換 scope、`-S/--scope` 指定 scope
- 部署現況：`https://askching.vercel.app`（alias），health live:true，6 tools
- GitHub 串接已連接（Chonwai/AskChing_Agent），push-to-deploy 生效
- Env：DEMO_LIVE（Prod=1 / Preview=0）、GRAPH_API_KEY（Prod secret）

## 待研究

1. Vercel project 跨 team 轉移的正確方法（Dashboard vs CLI）
2. 轉移後什麼保留 / 什麼失（env、domains、GitHub integration、deployments、alias）
3. 哪個 team 是 Pro 付費（需驗證 subscription）
4. 轉移後 `.vercel/project.json` 是否需更新、如何 re-link
5. 轉移後的驗證步驟（health/tools-list/自動部署）

---

## Loop 執行結果（2026-09-13）

### DISCOVER（morpheus deep research + Neo 實測）結論

**關鍵發現：不需要轉移！** Pro team（`chonwai-s-team`）上**已有** `ask-ching-agent` 專案：
- 連接**同一個 GitHub repo**（Chonwai/AskChing_Agent，repoId 1360369150）
- 已部署 3+ 次 production，health `live:true`，**6 tools 全數上線**
- env vars 完整（GRAPH_API_KEY + DEMO_LIVE，Production + Preview）
- 變更（`b2b88582`）由 johnku 推的 submission image 方向 docs

驗證事實：
- `chonwai-s-team` = **Pro** plan（`billing.plan: "pro"`），`chonwais-projects` = **hobby**
- `vercel move`/`transfer` CLI 指令**不存在** — 轉移只能 Dashboard（零 downtime）或 REST API
- CLI 有 `switch [scope]` 與 `-S/--scope`

### 決策：採用 Pro 專案 + 移除 free 重複專案

與其轉移 free 的 `askching`（會和 Pro 的 `ask-ching-agent` 撞 Git repo 連接），**直接採用 Pro 的 `ask-ching-agent` 為正式 endpoint**，刪除 free 重複。避免雙專案對同一 repo 雙重部署。

### EXECUTE

1. **Relink 本地**：`rm -rf .vercel` → `vercel link --project ask-ching-agent -S chonwai-s-team` → project.json 更新為 `{projectId: prj_qwpsIxxaUIVA3olZqFwh463qp7OH, orgId: team_iiPyJNncXORJs2IcOGq9Uykp}`（Pro）
2. **`.gitignore`**：vercel link 加入 `.vercel` + `.env*`（commit `0120e2f`，rebase johnku 的 `2b88582`）
3. **Canonicalize URL**：README/HANDOFF 的 endpoint 改為 `https://ask-ching-agent.vercel.app/api/mcp`（commit `87b9fa6`）→ push 自動觸發 Pro 部署 ✅（驗證 Building→Ready）
4. **移除 free 重複**：`vercel rm askching -S chonwais-projects --yes` → Success! Removed 1 project

### VERIFY（全部實測）

- ✅ Pro endpoint `https://ask-ching-agent.vercel.app/api/health` → `live:true`
- ✅ tools/list → **6 tools**（analyze_markets / analyze_trends / compare_markets / discover_yields / research_brief / risk_scan）
- ✅ compare_markets live call → cited data（compound-v3 supply 3.79%，block 25963035，queryHash）
- ✅ GitHub push-to-deploy → push `87b9fa6` 自動觸發 Pro 專案 build
- ✅ free 重複專案已刪除（`chonwais-projects` 下無 askching）
- ✅ gates：build 3/3、test 209/209、eval 27/27、vercel:probe OK

### 最終狀態

- **正式 endpoint**：`https://ask-ching-agent.vercel.app/api/mcp`（Pro team `chonwai-s-team`，GitHub 自動部署）
- 本地 `.vercel` 已 link 到 Pro 專案
- 下次 push 會自動部署到 Pro（不再有 free 重複）

### 用戶後續可選

- Dashboard 上確認 `ask-ching-agent` 專案設定（Node 版本等）
- 如需 custom domain（如 askching.xyz）→ Pro team Settings → Domains