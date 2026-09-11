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
                    （5 個 tools 的單一註冊來源）
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

## 3. 部署到 Vercel（3 步）

### 3.1 前置

- Vercel 帳號
- GitHub repo（本 repo）
- （可選，live 模式）The Graph Studio 的 `GRAPH_API_KEY`

### 3.2 部署

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

### 3.3 環境變數

到 Vercel Project → Settings → Environment Variables：

| 變數 | 值 | 說明 |
|---|---|---|
| `DEMO_LIVE` | `1` | 啟用真實 The Graph 查詢；未設或 `0` = fixture 模式 |
| `GRAPH_API_KEY` | `<your key>` | `DEMO_LIVE=1` 時必填 |

> ⚠️ **不要把 key 寫進 repo**。`.env` 已在 `.gitignore`。Vercel 環境變數只存在於平台端。
>
> 💡 建議同時部署 **兩個環境**：Production 設 `DEMO_LIVE=1`（真數據、demo 用），Preview 保持 `DEMO_LIVE=0`（fixture、穩定）。

---

## 4. 驗證部署

```bash
# 1) metadata（免憑證）
curl -s https://<app>.vercel.app/api/health | jq
# → {"name":"askching","version":"0.1.0","transport":"streamable-http","endpoint":"/api/mcp","live":true}

# 2) MCP 握手 + 工具清單
curl -s https://<app>.vercel.app/api/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | jq '.result.tools[].name'
# → analyze_markets / analyze_trends / compare_markets / research_brief / risk_scan
```

**部署前在本機先驗證**（同一份 serverless 檔案，同一種 Web 簽名）：

```bash
pnpm vercel:probe
# → vercel-probe OK: api/mcp.ts and api/health.ts are deployable
```

---

## 5. 本機開發（不部署也能測遠端）

```bash
# 啟動本機 HTTP MCP server（預設 http://localhost:8787/api/mcp）
pnpm mcp:serve

# 另一個終端：端到端 smoke（initialize + tools/list + tools/call）
pnpm mcp:http:smoke
# → mcp-http-smoke OK: askching (5 tools, transport=streamable-http, findings=3)
```

`pnpm mcp:serve` 內建 `GET /health`，可先確認模式（live / fixture）。

---

## 6. 疑難排解

| 症狀 | 原因 | 解法 |
|---|---|---|
| `404` on `/api/mcp` | 函式未被偵測 | 確認 `api/mcp.ts` 存在且 `vercel.json` 的 `functions` 有 `api/*.ts` |
| `500 Cannot find module '@askching/shared'` | workspace `dist/` 未被打包 | 確認 `vercel.json` 的 `includeFiles: "packages/**/dist/**"`，且 `buildCommand` 有跑 `pnpm build` |
| 工具回 `GRAPH_API_KEY is required` | 未設環境變數或 `DEMO_LIVE` 為 `0` | 設定 `DEMO_LIVE=1` + `GRAPH_API_KEY`，重新部署 |
| 回應是 SSE 而非 JSON | client 設定了 `Accept: text/event-stream` 且強制串流 | 本 server 以 `enableJsonResponse: true` 回應 JSON；client 請帶 `Accept: application/json, text/event-stream` |
| 首次呼叫很慢 | serverless cold start + live Graph 查詢 | 可接受；demo 前先跑一次 `curl` 預熱 |
| 逾時 | Vercel `maxDuration` 限制 | `vercel.json` 已設 60s；若仍不足，考慮常駐部署（見 §8） |

---

## 7. 安全性

| 項目 | 現況 |
|---|---|
| 憑證 | `GRAPH_API_KEY` 只存在 Vercel 環境變數；`/api/health` 不回傳任何 key（測試已鎖定） |
| 日誌 | `ASKCHING_DEBUG` 只印 tool name + arguments，永不印 key 或 raw tool result |
| CORS | 目前 `Access-Control-Allow-Origin: *`（MCP client 非瀏覽器） |
| 認證 | **尚未實作 OAuth**。若要保護 endpoint，MCP SDK / `mcp-handler` 支援 `withMcpAuth` + RFC 9728 metadata |
| 速率 | 未限流。公開 demo 建議加 Vercel Firewall 或 rate limit |

> ⚠️ **Hackathon 現況**：endpoint 目前公開、無認證。這對 demo 是優點（評審可直接連），但若要用於生產需加 OAuth（見 §9 Roadmap）。

---

## 8. 替代部署目標

同一份 `createAskChingHttpHandler()` 可移植到任何支援 Web `Request`/`Response` 的地方：

| 平台 | 方式 |
|---|---|
| **Cloudflare Workers** | 直接 `export default { fetch: handler }` |
| **Deno Deploy / Bun** | `Bun.serve({ fetch: handler })` |
| **Railway / Fly.io / Render** | 跑常駐 `node packages/mcp-server/dist/serve.js`（無 serverless 逾時限制） |
| **Docker** | `serve.js` 已自帶 `node:http` host |

> 若 Vercel 的 serverless 限制（冷啟動、60s 逾時）在 live 查詢下造成困擾，**常駐部署（Railway/Fly）是最穩的備案**——`serve.ts` 已可直接使用。

---

## 9. Roadmap

| 項目 | 優先級 | 說明 |
|---|---|---|
| OAuth（`withMcpAuth`） | P2 | 保護公開 endpoint |
| Rate limiting | P2 | 防止濫用 |
| Session 模式（stateful） | P3 | 目前刻意 stateless；若需要 server→client 推播再開 |
| Streaming（SSE）回應 | P3 | 目前用 JSON；長查詢可改 SSE 逐步回傳 |
| Hono 單一入口 | P3 | 若同時要 `/api/mcp` + 官網，可改用 Hono 統一 |

---

## 10. 相關文件

| 文件 | 用途 |
|---|---|
| `docs/platform-integration.md` | 各平台（Claude / Cursor / VS Code / Codex / Gemini CLI / Grok Bot / ChatGPT）接入設定 |
| `docs/improvement-blueprint.md` | 剩餘可改善項目藍圖 |
| `docs/superpowers/plans/2026-09-12-demo-narrative.md` | Demo 敘事腳本（遠端 MCP 橋段） |
| `packages/mcp-server/src/http.ts` | Web 標準 handler 實作 |
| `packages/mcp-server/src/serve.ts` | 本機／常駐主機 |
| `api/mcp.ts` | Vercel 入口 |
