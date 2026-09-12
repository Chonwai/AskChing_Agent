# AskChing — 部署成遠端 MCP Server（Vercel）

> 建立日期: 2026-09-12｜對應 Loop: `loop-vercel-mcp-deployment`
> 目的: 讓 AskChing 從「本機 stdio」升級為「雲端 Streamable HTTP」，任何支援遠端 MCP 的平台都能一行接入。

---

## 1. 為什麼要部署？

原本的 AskChing 只能透過 **stdio** 在本機被 MCP client 啟動（`node dist/index.js`）。這有三個限制：

| 限制 | 影響 |
|---|---|
| 每個使用者都要 clone repo + `pnpm build` | demo 時評審無法「真的用一下」 |
| 無法被雲端 agent 使用 | **Grok Bot**（雲端 VM）、ChatGPT Connectors、Claude Connectors 都連不上 |
| 無法截圖「多平台同時接入」 | 少了最有說服力的 demo 畫面 |

部署成遠端 MCP server 之後，接入只需要一行 URL。

---

## 2. 架構：同一個大腦，兩個傳輸層

```
                    packages/mcp-server/src/register.ts
                    （6 個 tools 的單一註冊來源）
                               │
              ┌────────────────┴─────────────────┐
              │                                  │
      index.ts (stdio)                    http.ts (Web 標準)
              │                                  │
   node dist/index.js                   ┌─────────┴─────────┐
   Cursor / Claude Desktop              │                   │
   Codex（本機）                 serve.ts              api/mcp.ts
   （本機子程序）                        │                   │
                              localhost:8787          Vercel Function
                              （開發 / demo）      https://<app>.vercel.app/api/mcp
                                                          │
                                          Claude / Cursor / VS Code /
                                          Codex / Gemini CLI /
                                          Grok Bot / ChatGPT
```

**關鍵設計**：工具註冊只有一份（`register.ts`），兩種傳輸層共用。這保證 stdio 與遠端永遠暴露完全相同的工具面。

**傳輸選擇**：使用 MCP SDK 的 `WebStandardStreamableHTTPServerTransport`（**Web 標準 `Request`/`Response`**），而不是 Node `http` 專用版本。因此同一份 handler 可掛在 Vercel Functions、Cloudflare Workers、Deno、Bun、Hono、Next.js route handler 上。

**無狀態（stateless）**：`sessionIdGenerator: undefined`。每個請求建立一組全新的 server + transport。這是 serverless 的必要條件——平台不保證同一個 process 存活到下一次請求。

---

## 3. Vercel 專案設定該怎麼選（重點）

> 這是「NodeJS？Next.js？還是 Other？」的答案。

### 3.1 一句話答案

**Framework Preset 選 `Other`。不是 Next.js，也不是 `Node`。**

理由：AskChing 不是前端框架專案，它是 **pnpm monorepo + `/api` 目錄函式**。
- 選 **Next.js** → Vercel 會找 `next build`，直接失敗
- 選 **Node** → 那是給 `server.ts` / `server.js` 進入點的（用自己的 HTTP server 監聽）
- 選 **`Other`** → Vercel 把 `/api/` 底下每個檔案部署成一個 Function ✅

實際上 Vercel 會**自動偵測**：repo 裡沒有 `next.config.*`、`vite.config.*` 等，
所以它本來就會選 `Other`。你只要**不要手動改掉**即可。

> ⚠️ **「Other」是 Dashboard project 設定，不是 `vercel.json` 的 property。**
> `vercel.json` 的 `framework` field **沒有 `"other"` 這個合法值**（官方 JSON schema
> enum 只有 `nextjs` / `node` / `vite` / `hono` … 等，`"other"` 不在其中，且頂層
> `additionalProperties: false`）。把 `"framework": "other"` 寫進 `vercel.json`
> 會在 schema 嚴格驗證的版本直接 fail build。正確做法：**在 `vercel.json` 不寫
> `framework`**（= 自動偵測 / Other），並在 Dashboard Project Settings 確認
> Framework Preset 顯示 `Other` 即可。

### 3.2 設定對照表

到 Vercel Project → **Settings → Build and Deployment**：

| 設定項 | 應該填什麼 | 為什麼 |
|---|---|---|
| **Framework Preset** | `Other`（自動偵測） | 我們只有 `/api` 函式 + 靜態檔，沒有前端框架 |
| **Root Directory** | **留空**（= repo 根） | `api/`、`vercel.json`、`pnpm-workspace.yaml` 都在根目錄 |
| **Build Command** | `pnpm build`（或用 Override 留空，讓 `vercel.json` 決定） | `vercel.json` 已指定 `buildCommand` |
| **Output Directory** | `public` | `vercel.json` 已指定；**不可留空**（見 §3.4） |
| **Install Command** | `pnpm install --frozen-lockfile` | `vercel.json` 已指定；Vercel 會從 `pnpm-lock.yaml` 自動偵測 pnpm |
| **Node.js Version** | **20.x 或 22.x** | 根 `package.json` 的 `engines.node` 是 `>=20`；建議 22 LTS |

到 **Settings → Environment Variables**：

| 變數 | Production | Preview | 說明 |
|---|---|---|---|
| `DEMO_LIVE` | `1` | `0` | Production 走真數據；Preview 用 fixture 保持穩定 |
| `GRAPH_API_KEY` | `<your key>` | 可留空 | 只有 `DEMO_LIVE=1` 時需要 |

> 💡 **不需要**設定 `XAI_API_KEY`。Grok orchestrator 是 CLI，不參與遠端 MCP 服務。
> 少一個 secret 在雲端，就少一個外洩面。

### 3.3 為什麼不用 `Node` preset 或 `server.ts`

Vercel 也支援「零設定 Node server」——在根目錄放 `server.ts`／`server.js`，
Vercel 偵測到 `server.listen()` 就把整個專案變成一個 Function，接管所有路由。

我們**刻意不走這條路**：
- 一旦 Vercel 偵測到 `server.ts`，它會接管**所有**路由，`/api/*` 反而可能被蓋掉，行為變得不明確
- `api/` 形式可以 per-route 設定（我們用 `maxDuration: 60`、`memory: 1024`）
- `api/` 是 Vercel 的慣例寫法，除錯資源最多

`packages/mcp-server/src/serve.ts` 仍然是**本機**與**常駐部署**（Railway / Fly / Docker）用的入口，不會被刪。

### 3.4 ⚠️ 兩個已修正的部署坑（重要）

這兩點在 2026-09-12 的複核中發現並修好，若你自己重寫部署檔請務必注意：

| # | 坑 | 症狀 | 修正 |
|---|---|---|---|
| 1 | **`/api` 函式匯出格式錯誤** | 請求 **hang 到 timeout** | 必須是 `export default { fetch(request) { ... } }`。裸的 `export default handler`（純函式）會被當成 Node.js `(req, res)` handler，而它永遠不會呼叫 `res.end()` |
| 2 | **Output Directory 落回 repo 根目錄** | 整個 repo（含 `docs/`、`package.json`）被**當靜態檔公開** | Vercel 的 `Other` preset 規則：有 `public/` 就用它，沒有就用 `.`。所以**必須有 `public/`**，並在 `vercel.json` 明寫 `outputDirectory` |

兩個坑都已由 `pnpm vercel:probe` 斷言保護，無法回歸。

---

## 4. 部署到 Vercel（實際步驟）

### 4.1 前置

- Vercel 帳號
- GitHub repo（本 repo）
- （可選，live 模式）The Graph Studio 的 `GRAPH_API_KEY`

### 4.2 部署

```bash
# 方式 A：CLI
npm i -g vercel
vercel            # 首次：link project
vercel --prod     # 部署到 production
```

```bash
# 方式 B：Dashboard
# vercel.com/new → Import Git Repository → 選擇本 repo → Deploy
```

repo 內已備妥：

| 檔案 | 作用 |
|---|---|
| `api/mcp.ts` | MCP endpoint（`/api/mcp`，另以 rewrite 提供 `/mcp`） |
| `api/health.ts` | 免憑證的 metadata endpoint（`/api/health`） |
| `vercel.json` | `buildCommand: pnpm build`、`includeFiles` 打包 workspace `dist/`、`/mcp` rewrite |

### 4.3 環境變數

到 Vercel Project → Settings → Environment Variables（詳見 §3.2 對照表）：

| 變數 | 值 | 說明 |
|---|---|---|
| `DEMO_LIVE` | `1` | 啟用真實 The Graph 查詢；未設或 `0` = fixture 模式 |
| `GRAPH_API_KEY` | `<your key>` | `DEMO_LIVE=1` 時必填 |

> ⚠️ **不要把 key 寫進 repo**。`.env` 已在 `.gitignore`。Vercel 環境變數只存在於平台端。
>
> 💡 建議同時部署 **兩個環境**：Production 設 `DEMO_LIVE=1`（真數據、demo 用），Preview 保持 `DEMO_LIVE=0`（fixture、穩定）。

---

## 5. 驗證部署

```bash
# 1) metadata（免憑證）
curl -s https://<app>.vercel.app/api/health | jq
# → {"name":"askching","version":"0.1.0","transport":"streamable-http","endpoint":"/api/mcp","live":true}

# 2) MCP 握手 + 工具清單
curl -s https://<app>.vercel.app/api/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | jq '.result.tools[].name'
# → analyze_markets / analyze_trends / compare_markets / discover_yields / research_brief / risk_scan
```

**部署前在本機先驗證 handler 邏輯**（`api/mcp.ts` 與 `api/health.ts` 會被真的載入，驅動真的 MCP 握手）：

```bash
pnpm vercel:probe
# → vercel-probe OK: api/mcp.ts and api/health.ts are deployable
```

> ⚠️ **這個 probe 驗什麼、不驗什麼**：
> - ✅ 驗證 handler 的**簽名語意與邏輯**（Vercel 用同一種 Web `Request`/`Response` 簽名）
> - ❌ **不驗證部署目標的模組解析與打包**。probe 経 `tsx` 執行，會做 `.js → .ts` 重映射並用本機 workspace symlink；Vercel 上 `@askching/shared` 與 `@modelcontextprotocol/sdk` 必須能從打包的 bundle 解析得到
> - 因此**唯一有效的部署後驗証是打 `/api/health` 與 `tools/list`**（見 §5 步驟 1–2）。若 bundle 少了相依模組，會是 §7 的 `500 Cannot find module` 而 probe 看不到。

---

## 6. 本機開發（不部署也能測遠端）

```bash
# 啟動本機 HTTP MCP server（預設 http://localhost:8787/api/mcp）
pnpm mcp:serve

# 另一個終端：端到端 smoke（initialize + tools/list + tools/call）
pnpm mcp:http:smoke
# → mcp-http-smoke OK: askching (6 tools, transport=streamable-http, findings=3)
```

`pnpm mcp:serve` 內建 `GET /health`，可先確認模式（live / fixture）。

---

## 7. 疑難排解

| 症狀 | 原因 | 解法 |
|---|---|---|
| `404` on `/api/mcp` | 函式未被偵測 | 確認 `api/mcp.ts` 存在且 `vercel.json` 的 `functions` 有 `api/*.ts` |
| `500 Cannot find module '@askching/shared'` | workspace `dist/` 未被打包 | 確認 `vercel.json` 的 `includeFiles` 涵蓋 `packages/shared/dist/**` 與 `packages/mcp-server/dist/**`，且 `buildCommand` 有跑 `pnpm build`。注意：本機 `pnpm vercel:probe` **無法**偵測此類失敗 |
| 工具回 `Need at least 2 cited sources ...` 且 `structuredContent` 缺席 | 未設 `GRAPH_API_KEY`，或 `DEMO_LIVE` 不為 `1` | 這**就是**憑證缺失在 MCP 表面的症狀——底層原因被 fail-closed 轉譯成證據不足。設定 `DEMO_LIVE=1` + `GRAPH_API_KEY` 後重新部署 |
| `405 Method Not Allowed` on GET | 預期行為 | 本 server 為 stateless JSON-only，只支援 POST（standalone SSE 與 session 終止不提供）；帶 `Allow: POST, OPTIONS` |
| 回應是 SSE 而非 JSON | client 設定了 `Accept: text/event-stream` 且強制串流 | 本 server 以 `enableJsonResponse: true` 回應 JSON；client 請帶 `Accept: application/json, text/event-stream` |
| 首次呼叫很慢 | serverless cold start + live Graph 查詢 | 可接受；demo 前先跑一次 `curl` 預熱 |
| 逾時 | Vercel `maxDuration` 限制 | `vercel.json` 已設 60s；若仍不足，考慮常駐部署（見 §9） |

---

## 8. 安全性

| 項目 | 現況 |
|---|---|
| 憑證 | `GRAPH_API_KEY` 只存在 Vercel 環境變數；`/api/health` 不回傳任何 key（測試已鎖定） |
| 日誌 | `ASKCHING_DEBUG` 只印 tool name + arguments，永不印 key 或 raw tool result |
| CORS | 目前 `Access-Control-Allow-Origin: *`（MCP client 非瀏覽器） |
| 認證 | **尚未實作 OAuth**。若要保護 endpoint，MCP SDK / `mcp-handler` 支援 `withMcpAuth` + RFC 9728 metadata |
| CORS | `Access-Control-Allow-Origin: *`，只開放 `POST, OPTIONS`（GET/DELETE 回 405） |
| 速率 | 未限流。公開 demo 建議加 Vercel Firewall 或 rate limit |

> ⚠️ **這是刻意的 hackathon 取捨，但它是真風險**：endpoint 公開、無認證、無限流，後面掛著一個**計費的** Graph API key。任何知道 URL 的人（包含訪客瀏覽器發出的跨域請求）都能驅動部署並消耗你的 Graph 配額與 Vercel invocation。
>
> - 對 demo：這是優點（評審可直接連）
> - **但若要把 endpoint 提交到公開 MCP registry 清單，請先加一道極低成本護欄**（單一 bearer token 檢查，或 Vercel Firewall rate limit），否則「公開」會從 demo 便利變成**長期暴露**。
> - 另：請勿用高配額或高權限的 key 部署公開 endpoint。

> ⚠️ **Hackathon 現況**：endpoint 目前公開、無認證。這對 demo 是優點（評審可直接連），但若要用於生產需加 OAuth（見 §10 Roadmap）。

---

## 9. 替代部署目標

同一份 `createAskChingHttpHandler()` 可移植到任何支援 Web `Request`/`Response` 的地方：

| 平台 | 方式 |
|---|---|
| **Cloudflare Workers** | 直接 `export default { fetch: handler }` |
| **Deno Deploy / Bun** | `Bun.serve({ fetch: handler })` |
| **Railway / Fly.io / Render** | 跑常駐 `node packages/mcp-server/dist/serve.js`（無 serverless 逾時限制） |
| **Docker** | `serve.js` 已自帶 `node:http` host |

> 若 Vercel 的 serverless 限制（冷啟動、60s 逾時）在 live 查詢下造成困擾，**常駐部署（Railway/Fly）是最穩的備案**——`serve.ts` 已可直接使用。

---

## 10. Roadmap

| 項目 | 優先級 | 說明 |
|---|---|---|
| OAuth（`withMcpAuth`） | P2 | 保護公開 endpoint |
| Rate limiting | P2 | 防止濫用 |
| Session 模式（stateful） | P3 | 目前刻意 stateless；若需要 server→client 推播再開 |
| Streaming（SSE）回應 | P3 | 目前用 JSON；長查詢可改 SSE 逐步回傳 |
| Hono 單一入口 | P3 | 若同時要 `/api/mcp` + 官網，可改用 Hono 統一 |

---

## 11. 相關文件

| 文件 | 用途 |
|---|---|
| `docs/platform-integration.md` | 各平台（Claude / Cursor / VS Code / Codex / Gemini CLI / Grok Bot / ChatGPT）接入設定 |
| `docs/improvement-blueprint.md` | 剩餘可改善項目藍圖 |
| `docs/superpowers/plans/2026-09-12-demo-narrative.md` | Demo 敘事腳本（遠端 MCP 橋段） |
| `packages/mcp-server/src/http.ts` | Web 標準 handler 實作 |
| `packages/mcp-server/src/serve.ts` | 本機／常駐主機 |
| `api/mcp.ts` | Vercel 入口 |
