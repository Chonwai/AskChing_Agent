# AskChing — 多平台接入指南（遠端 MCP）

> 建立日期: 2026-09-12｜對應 Loop: `loop-vercel-mcp-deployment`
> 前置: 已依 `docs/deployment-vercel.md` 部署，取得 `https://<app>.vercel.app/api/mcp`
> 目的: 讓同一個 AskChing MCP server 在 7+ 個 AI 平台上使用，作為 demo 的核心說服力

---

## 0. 為什麼這是 demo 的殺手鐧

原本的 AskChing 是「一個 repo、一個 CLI」。部署成遠端 MCP 之後，敘事變成：

> **同一份 cited research 能力，7 個平台、一行 URL 接入。**

評審在你的畫面上會看到：**Claude、Cursor、VS Code、Gemini、Grok Bot 同一個問題、同一份 evidence chain。**
這正是 The Graph track 想看的「AI tooling 被真實採用」的樣子。

---

## 1. 快速對照表

先部署，取得 URL；然後：

| 平台 | 設定檔 | 鍵 | 傳輸 |
|---|---|---|---|
| Claude Desktop | `claude_desktop_config.json` | `url` | Streamable HTTP |
| Claude Code | `.mcp.json` | `type: http`, `url` | Streamable HTTP |
| Cursor | `.cursor/mcp.json` | `url` | Streamable HTTP |
| VS Code (Copilot) | `.vscode/mcp.json` | `type: http`, `url` | Streamable HTTP |
| Codex | `~/.codex/config.toml` | `[mcp_servers.*]` | Streamable HTTP |
| Gemini CLI / Antigravity | `settings.json` | `httpUrl` | Streamable HTTP |
| Grok Bot | Bot connectors | MCP URL | connectors/MCP |
| ChatGPT | Connectors（開發者模式） | MCP URL | Streamable HTTP |
| 任何 stdio-only client | 任意 | `npx mcp-remote <url>` | 橋接 |

> 端點同時提供 `/api/mcp`（原生）與 `/mcp`（rewrite）；兩者等價。

---

## 2. Claude Desktop

`~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "askching": {
      "url": "https://<app>.vercel.app/api/mcp"
    }
  }
}
```

重啟 Claude Desktop → 對話中直接問：
> Compare live USDC supply APY across Aave V3, Compound V3, and Spark Lend, and cite each source.

## 3. Claude Code

`.mcp.json`（專案根目錄）

```json
{
  "mcpServers": {
    "askching": {
      "type": "http",
      "url": "https://<app>.vercel.app/api/mcp"
    }
  }
}
```

或用 CLI：

```bash
claude mcp add --transport http askching https://<app>.vercel.app/api/mcp
```

## 4. Cursor

`.cursor/mcp.json`（專案根目錄）

```json
{
  "mcpServers": {
    "askching": {
      "url": "https://<app>.vercel.app/api/mcp"
    }
  }
}
```

Cursor Settings → MCP → 確認 `askching` 為綠色 → 在 chat 中 `@askching` 提問。

## 5. VS Code（GitHub Copilot Chat）

`.vscode/mcp.json`

```json
{
  "servers": {
    "askching": {
      "type": "http",
      "url": "https://<app>.vercel.app/api/mcp"
    }
  }
}
```

Command Palette → **MCP: List Servers** → 確認已連線；在 Copilot Chat 以 Agent mode 提問。

## 6. Codex

`~/.codex/config.toml`

```toml
[mcp_servers.askching]
url = "https://<app>.vercel.app/api/mcp"
```

## 7. Gemini CLI / Antigravity

```bash
# Streamable HTTP（推薦）
gemini mcp add --transport http askching https://<app>.vercel.app/api/mcp

# 只開放研究工具（可選，收窄攻擊面）
gemini mcp add --transport http \
  --include-tools compare_markets,analyze_markets,analyze_trends,research_brief,risk_scan \
  askching https://<app>.vercel.app/api/mcp
```

或直接寫 `settings.json`：

```json
{
  "mcpServers": {
    "askching": {
      "httpUrl": "https://<app>.vercel.app/api/mcp",
      "timeout": 60000
    }
  }
}
```

驗證：`gemini mcp list`（或 CLI 內 `/mcp`）應顯示 `Connected` 與 5 個 tools。

> ⚠️ **命名注意**：Google 已於 2026-06-18 以 **Antigravity CLI** 取代免費層／Google One 使用者的 Gemini CLI。設定格式相同（`httpUrl` / `--transport http`）。兩個 CLI 都支援 Streamable HTTP。
>
> 💡 **工具命名空間**：Gemini CLI 會把工具包成 `mcp_<server>_<tool>`（例如 `mcp_askching_analyze_trends`）。demo 時別把命名空間前綴誤認為我們的工具名。

## 8. Grok Bot

Grok Bot 官方文件明載：

> "Each Bot runs on a persistent cloud VM with a browser, filesystem, and terminal. **It can use connectors/MCP where available.**"

流程：

1. 建立一個 Bot（例如命名 `DeFi Research`）
2. 在 Bot 的 connectors 設定加入 MCP server，URL 填 `https://<app>.vercel.app/api/mcp`
3. 授予存取權
4. 以自然語言交辦：
   > Compare live USDC supply APY across Aave V3, Compound V3, and Spark Lend. Cite every number and tell me the as-of block.

**為什麼 Grok Bot 這個橋段最強**：Bot 有持久雲端 VM，可以直接把 AskChing 的 cited 輸出接進後續工作（寫進檔案、貼到別的工具、排程重跑）。這是「agent economy」的具體畫面——而這正是 The Graph 2026 的主推方向。

> ⚠️ connectors/MCP 的可用性依方案與 rollout 而異。**錄影前務必先實測一次**，若 Bot 端尚未開放，改用 §2 的 Claude Desktop 或 §5 的 VS Code 作為主要畫面。

## 9. ChatGPT Connectors

依 Vercel 官方指引（`vercel.com/kb/guide/mcp-server-chatgpt-connector`）：

1. ChatGPT → Settings → Connectors → Advanced → Developer mode
2. Add custom connector → MCP URL 填 `https://<app>.vercel.app/api/mcp`
3. 在對話中選擇該 connector 後提問

> 若組織政策限制開發者模式，跳過此平台；§2–§7 已足以展示跨平台。

## 10. stdio-only 的 client

有些 client 只支援 stdio。用 `mcp-remote` 橋接：

```json
{
  "mcpServers": {
    "askching": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://<app>.vercel.app/api/mcp"]
    }
  }
}
```

## 11. 本機（不部署）

見 `docs/cross-platform.md`。兩種方式：

```bash
# A) 本機 HTTP server（推薦，與遠端同一份程式碼）
pnpm mcp:serve          # http://localhost:8787/api/mcp

# B) 本機 stdio（原有方式）
pnpm -C packages/mcp-server build
# client config: { "command": "node", "args": ["<repo>/packages/mcp-server/dist/index.js"] }
```

---

## 12. Demo 錄影建議

| 順序 | 畫面 | 講解重點 |
|---|---|---|
| 1 | `curl .../api/health` | 「server 活著，現在是 live 模式」 |
| 2 | `curl .../api/mcp` tools/list | 「5 個工具，一行 URL」 |
| 3 | **Claude Desktop** 問一個問題 | 展示 ranked + citation + asOf |
| 4 | **VS Code Copilot** 問同樣問題 | 證明「不是綁死某一家」 |
| 5 | **Gemini CLI / Antigravity** `gemini mcp list` | 5 個 tools、`Connected` |
| 6 | **Grok Bot**（若可用） | 把它接進後續工作流 |
| 7 | 回到 terminal：`ASKCHING_DEBUG=1 pnpm askching -- "..."` | 顯示 tool trace，證明是真呼叫而非幻覺 |

**每個平台都問同一條問題**，讓評審看到：同一份 evidence chain、同樣的 fail-closed 行為。

---

## 13. 常見問題

| 症狀 | 原因 | 解法 |
|---|---|---|
| 平台顯示未連線 | URL 錯或部署失敗 | 先 `curl .../api/health` 確認 |
| 工具列表是空的 | 函式未正確打包 | 見 `docs/deployment-vercel.md` §6 |
| 回 `Need at least 2 cited sources ...`（`structuredContent` 缺席） | 部署在 fixture 模式卻要求 live，或未設 `GRAPH_API_KEY` | 底層原因被 fail-closed 轉譯成「證據不足」。設 `DEMO_LIVE=1` + `GRAPH_API_KEY` |
| `405 Method Not Allowed` | 用 GET/DELETE 打 endpoint | 預期行為：只支援 POST（stateless、JSON-only） |
| 工具名有奇怪前綴 | 平台的命名空間規則 | Gemini CLI 用 `mcp_<server>_<tool>`；VS Code 用 `#` 引用 |
| Claude Desktop 連不上 | 舊版不支援 remote | 更新 Claude Desktop；或改用 §10 的 `mcp-remote` 橋接 |

---

## 14. 相關文件

| 文件 | 用途 |
|---|---|
| `docs/deployment-vercel.md` | 部署步驟與疑難排解 |
| `docs/improvement-blueprint.md` | 剩餘改善藍圖 |
| `docs/superpowers/plans/2026-09-12-demo-narrative.md` | Demo 敘事腳本 |
| `docs/cross-platform.md` | 本機／stdio 接入 |
