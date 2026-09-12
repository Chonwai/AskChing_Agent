# Loop State — Vercel 部署研究 + 執行

- **Task slug**: `vercel-deploy-research`
- **Goal (Done Contract)**: 回答用戶 3 個問題（MCP 工具數 / Vercel project 建立方式 Framework Preset / GitHub 串接 deploy 是否可行）+ 產出可執行的部署執行計畫 + 小步 commit 交付。部署動作本身（登入 Vercel、實際 push）可能需用戶參與，Loop 產出「可立即執行的計畫 + 必要的 repo 準備」。
- **Quality Mode**: `strict`（threshold 93）
- **Depth**: L3（deep mode + deep research）
- **Budget**: 4 sub-agents × 2 iterations max

## 已知事實（Neo 親自收集）

- **MCP 工具數**：6 個（`register.ts` 單一註冊來源）— `compare_markets` / `research_brief` / `risk_scan` / `analyze_markets` / `analyze_trends` / `discover_yields`。stdio + Streamable HTTP 雙傳輸。
- **vercel.json 已存在**：buildCommand `pnpm build`、installCommand `pnpm install --frozen-lockfile`、outputDirectory `public`、functions includeFiles 打包 workspace dist、rewrite `/mcp → /api/mcp`。
- **Framework Preset 答案（docs/deployment-vercel.md §3 已寫明）**：`Other`。不是 Next.js（會找 next build）、不是 Node（那是給 server.ts 監聽的）。Vercel 自動偵測。
- **api/mcp.ts**：正確的 `export default { fetch }` Web Standard shape + `config.runtime: nodejs` + `maxDuration: 60`（已修過 Bug 1/2/3）。
- **GitHub 串接**：repo `Chonwai/AskChing_Agent` 在 GitHub，public；Vercel Import Git Repository 流程適用。
- **Vercel CLI 已安裝**（/usr/local/bin/vercel），但 **`.vercel` 不存在** → 尚未 link 任何專案。
- **gates 全綠**：build 3/3、test 209/209、eval 27/27、smoke 6 tools、probe:protocols 4/4。
- **deadline**：ETHOnline 2026-09-13 12:00 PM EDT（台北 9/14 00:00）。

## 尚需研究

1. Vercel 2026 最新「Import Git Repository」流程與 GitHub 授權步驟（用戶問的 GitHub 串接）
2. pnpm monorepo 在 Vercel 上的打包注意事項（workspace dist、includeFiles、500 Cannot find module 風險）
3. MCP Streamable HTTP 在 Vercel serverless 的限制（stateless、冷啟動、SSE、GET/POST、60s timeout）
4. 部署後的驗證步驟（/api/health + tools/list + 6 tools）
5. 是否需要任何 repo 準備變更（例如 README badge、vercel.json 優化、根目錄處理）

---

## Loop 執行記錄（2026-09-13）

### Iteration 1 — DISCOVER（morpheus, deep research）✅

- **Q1 答案：6 個 MCP tools**（register.ts 單一註冊源）：compare_markets / research_brief / risk_scan / analyze_markets / analyze_trends / discover_yields
- **Q2 答案：Framework Preset = Other**（非 Node / 非 Next.js）；`vercel.json` 不加 framework（= 自動偵測）
- **Q3 答案：可以自動 deploy** — Vercel for GitHub 預設 push-to-deploy（main → production，branch → preview）
- 研究報告 20KB：Import Git 流程、pnpm monorepo 打包、Streamable HTTP 限制、驗證 checklist、readiness assessment

### Iteration 2 — PLAN（architect, strict）✅

- 產出 `docs/superpowers/plans/2026-09-13-vercel-deploy-plan.md`（Phase A-D）
- 但 Phase A 原建議 `vercel.json` 加 `"framework": "other"` — **被 smith 抓到是非法值**

### Iteration 3 — VERIFY（smith, strict）→ 92/100 REPAIRABLE

- **H1（High）**：`"framework": "other"` 是**非法** vercel.json property（官方 schema enum 無此值，additionalProperties:false → 會 fail build）。「Other」是 Dashboard project 設定，不是 vercel.json config。**現有 vercel.json（無 framework）反而是正確的**
- **M1（Medium）**：docs/deployment-vercel.md 三處 tools 數量漂移（5 vs 實際 6，漏 discover_yields）
- smith 實測：現有 vercel.json / api/mcp.ts / api/health.ts 全部正確通過（export shape / runtime / includeFiles / stateless transport）
- 其餘審查：includeFiles ✅、maxDuration ✅、env 建議 ✅、Phase C 驗證命令 ✅

### Iteration 4 — EXECUTE（Neo 執行 bounded repair，docs-only trivial）✅

- Commit `b1edb10`：M1 修復（docs 三處 5→6 tools）
- Commit `1a8bad3`：H1 修復（docs 加「framework: other 是非法 vercel.json value」警示）
- Commit `65d9168`：研究報告 `docs/reviews/2026-09-13-vercel-deploy-research.md`
- Commit `616e4c6`：執行計畫 `docs/superpowers/plans/2026-09-13-vercel-deploy-plan.md`
- 本 commit：Loop State + HANDOFF 更新

### Done Contract 檢查

- [x] 回答用戶 3 問題（6 tools / Other / GitHub 自動 deploy）
- [x] 產出可執行部署計畫（Phase B 用戶操作手冊 + Phase C checklist）
- [x] 小步 commit（5 commits，全 push）
- [x] gates 全綠（smith 實測：build 3/3、test 209/209、eval 27/27、smoke 6、vercel:probe OK）

### 待用戶操作

1. Vercel Dashboard Import `AskChing_Agent`（Framework Preset = Other）
2. 設 env：Production DEMO_LIVE=1 + GRAPH_API_KEY / Preview DEMO_LIVE=0
3. Deploy → 跑 Phase C checklist（health / tools-list-6 / rewrite / tools-call / 30d）
4. URL 回寫 README/HANDOFF/demo narrative
