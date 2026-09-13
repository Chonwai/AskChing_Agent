# AskChing — Try It: 評審與來訪者快速上手

> 更新：2026-09-13 ｜ 適用對象：ETHOnline 評審、合作夥伴、任何想試用 AskChing 的人
> 部署：`https://ask-ching-agent.vercel.app`（Vercel Pro, team `chonwai-s-team`）

---

## 1. 最快試用（60 秒）

AskChing 是**遠端 MCP server** — 不需要安裝任何東西，把 URL 貼進任何支援 MCP 的 agent 就能問。

**唯一要記的 URL**：

```
https://ask-ching-agent.vercel.app/api/mcp
```

### 不裝 client 的速測（curl）

```bash
# 1) 確認 server 活著（免憑證）
curl https://ask-ching-agent.vercel.app/api/health
# → {"name":"askching","version":"0.1.0","transport":"streamable-http","endpoint":"/api/mcp","live":true}

# 2) 列出 6 個工具
curl -s -X POST https://ask-ching-agent.vercel.app/api/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' \
  | jq '.result.tools[].name'
# → analyze_markets / analyze_trends / compare_markets / discover_yields / research_brief / risk_scan
```

---

## 2. 在 VS Code 試用（本地，最推薦給開發者評審）

本 repo 已內建 `.vscode/mcp.json`，指向部署好的 endpoint：

```json
{
  "servers": {
    "askching": {
      "type": "http",
      "url": "https://ask-ching-agent.vercel.app/api/mcp"
    }
  }
}
```

**步驟**：

1. 用 VS Code 開啟這個 repo（或任何資料夾，貼上上面設定到 `.vscode/mcp.json`）
2. 開啟 **GitHub Copilot Chat**（需要 Copilot 訂閱）
3. 在 chat 輸入框以 **Agent mode** 提問（Copilot 會自動呼叫 `askching` 的 MCP tools）
4. 看到工具被呼叫、回傳帶 citations 的結果

> 沒有 Copilot？用任何 MCP client 都行 — 見 §4。

---

## 3. 可複製的範例問題（Demo 問題集）

完整清單在 `demos/prompts.md`（Demo A–G，含每個 demo 的預期路徑）。以下是三個最能展示特色的：

### 第 0 步 — 讓 AskChing 自我介紹（先問這個）

> What can this MCP do, and how do I use it?

預期：`get_info` tool 回傳 AskChing 的 overview、evidence model、6 個研究工具的用途 + 各一句範例問題、transports、live sources。這是任何新使用者的最佳起點。

### Demo 1 — 跨協議比較 + citations（展示「信得過」）

> Compare live USDC supply APY across Aave V3, Compound V3, and Spark Lend right now. Rank the results, cite each source, and state the as-of time.

預期：3 個 source 查詢 → ranked rows → 每個數字附 subgraph ID / block / query hash / asOf。

### Demo 2 — 歷史趨勢（展示時間維度）

> How has USDC supply APY trended across Aave V3, Compound V3, and Spark Lend over the last seven days? Give each protocol's direction and change, and cite every data point.

預期：`analyze_trends`，每協議一串 cited daily snapshots + slope / direction / volatility。

### Demo 3 — 跨場所收益發現（展示 DEX + lending）

> Where can I earn yield on USDC across lending, Uniswap V3, and Curve? Keep lending and LP rankings separate, show every formula and citation, and do not propose a transaction.

預期：`discover_yields`，lending 與 LP 分開排名、公式、risk flags、cross-venue winner。

### Demo 4 — 多穩定幣（展示資產深度，2026-09-13 實測可用）

> Compare live USDT supply APY across Aave V3, Compound V3, and Spark Lend. Rank them and cite each source.

預期：**現在就能運行** — 實測回傳 Spark Lend 3.3943% 最高（Aave V3 3.19%、Compound V3 3.14%），3 個 cited subgraph sources + queryHash。因為 4 個 live subgraph 早已索引 USDT/DAI — 這是「Stablecoin 解鎖」功能已內建的部分（`discover_yields` 的 USDC 鎖定才是剩下差異）。

### Demo 5 — 跨資產誠實 gap（ETH staking，2026-09-13 實測）

> What is the current yield for staking ETH through Lido, compared to earning USDC yield on Compound?

預期：**誠實 fail-closed** — 實測回傳 Compound USDC 3.490%（完整 cited），並明確標註「Lido ETH staking 是 coverage gap，不在 live 集合」，且補充「即使有 Lido 數字，兩者不等價（不同資產/風險/機制）」。這是 evidence-first 的最佳示範：寧願說無法引用，也不編造。`compare_staking`（Lido subgraph 已驗證 live）spec 已備好。

### 必看 — Fail-closed（展示誠實，AskChing 的招牌行為）

> Compare USDC supply APY on Aave V3 only.

預期：**拒絕回答**（需要 ≥2 個 cited sources）。字幕：「Evidence is a structural invariant, not a display option.」

---

## 4. 各平台連線速查

| 平台                         | 設定位置                                                          | 設定格式                                                          |
| ---------------------------- | ----------------------------------------------------------------- | ----------------------------------------------------------------- |
| **VS Code**                  | `.vscode/mcp.json`                                                | `{ "servers": { "askching": { "type": "http", "url": "..." } } }` |
| **Claude Desktop**           | `~/Library/Application Support/Claude/claude_desktop_config.json` | `{ "mcpServers": { "askching": { "url": "..." } } }`              |
| **Cursor**                   | `.cursor/mcp.json`                                                | 同 Claude Desktop（`url`）                                        |
| **Claude Code**              | `claude mcp add --transport http askching <url>`                  | CLI                                                               |
| **Gemini CLI / Antigravity** | `gemini mcp add --transport http askching <url>` 或 `httpUrl`     | CLI / settings.json                                               |
| **Grok Bot**                 | Bot connectors → 新增 MCP，URL 填 `<url>`                         | Dashboard                                                         |
| **stdio-only client**        | `npx -y mcp-remote <url>`                                         | 橋接                                                              |

詳細每平台步驟：`docs/platform-integration.md`。

---

## 5. 本機開發模式（不依賴部署）

clone repo 後：

```bash
pnpm install
pnpm build

# fixture 模式（不用 API key，示範用）
pnpm demo -- "Compare USDC supply APY across Aave V3 and Compound V3"

# live 模式（需 .env 的 GRAPH_API_KEY）
pnpm demo:live -- "Compare USDC supply APY across Aave V3 and Compound V3"

# 或啟動本機 HTTP server（與遠端同一份程式碼）
pnpm mcp:serve   # → http://localhost:8787/api/mcp
```

本機測試遠端行為：

```bash
pnpm mcp:http:smoke    # initialize + tools/list(6) + tools/call
pnpm mcp:smoke         # stdio handshake
```

---

## 6. 重點提醒（對評審誠實）

- **Live 依賴 Graph indexer 可用性**：demo 前跑 `pnpm probe:protocols`（4/4）與 `pnpm probe:yields`（2/2）確認；gateway 偶有暫態抖動，重跑即過。
- **Endpoint 刻意無 auth / 無 rate limit**：方便評審直接連，但任何人拿到 URL 都能花 Graph quota — 請用 low-quota key 部署。
- **AskChing 是研究軟體**：不預測、不建議買賣、不執行交易。每個數字都必須能追溯到 subgraph + block + query hash；<2 個來源就拒絕回答。

---

## 7. 相關資源

| 資源                     | 位置                                  |
| ------------------------ | ------------------------------------- |
| Landing page             | `https://ask-ching-agent.vercel.app/` |
| Demo prompts（Demo A–G） | `demos/prompts.md`                    |
| 平台整合完整指南         | `docs/platform-integration.md`        |
| 部署指南                 | `docs/deployment-vercel.md`           |
| 本機 / 跨平台            | `docs/cross-platform.md`              |
