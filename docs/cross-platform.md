# AskChing 跨平台整合指南

> 版本: v0.2.0｜ 建立日期: 2026-09-09｜ 更新: 2026-09-12｜ 狀態: publish-ready（未實際發布）
> 對應 Loop: loop-cross-platform-skills-packaging
> **更新（2026-09-12）：** AskChing 現在除了 stdio，也支援**遠端 Streamable HTTP**。遠端部署見 `docs/deployment-vercel.md`，多平台接入見 `docs/platform-integration.md`。

## 1. 價值主張

`@askching/mcp-server` 是一個**標準 MCP server**，提供**兩種傳輸**。它不綁定任何特定平台——只要平台支援 MCP（Model Context Protocol）就能接入。

| 傳輸                | 適用                                                                 | 接入方式   |
| ------------------- | -------------------------------------------------------------------- | ---------- |
| **stdio**           | 本機 client（Cursor / Claude Desktop / Codex）                       | 啟動子程序 |
| **Streamable HTTP** | 雲端 client（Grok Bot、ChatGPT connectors）+ 任何支援遠端 MCP 的平台 | 一行 URL   |

AskChing 的「可重用性」證明分兩層：

1. **Config 形狀**：同一份 MCP server，在 7+ 個 AI 平台用幾乎相同的 config 接入。
2. **可運行驗證**：`pnpm mcp:smoke`（stdio）與 `pnpm mcp:http:smoke`（HTTP）都證明 handshake 與 5 個 tool 真實可用。

> ⚠️ **重要**：本文件描述的 `npx -y @askching/mcp-server` 一行 config 是**發布後**的 showcase 形式。在 `@askching/shared` 與 `@askching/mcp-server` 尚未發布前，請使用 §5 的**本地（免發布）config**。

## 2. 平台對照表

| 平台           | Config 檔案                  | 設定鍵            | 一行接入 |
| -------------- | ---------------------------- | ----------------- | -------- |
| Claude Desktop | `claude_desktop_config.json` | `mcpServers`      | ✅       |
| Claude Code    | `.mcp.json`（專案根）        | `mcpServers`      | ✅       |
| Cursor         | `.cursor/mcp.json`           | `mcpServers`      | ✅       |
| VS Code        | `.vscode/mcp.json`           | `servers`         | ✅       |
| Codex          | `~/.codex/config.toml`       | `[mcp_servers.*]` | ✅       |
| Gemini CLI     | `.gemini/settings.json`      | `mcpServers`      | ✅       |

所有平台都接入同一個 `@askching/mcp-server`，因此 tool 名稱（`compare_markets` / `research_brief` / `risk_scan` / `analyze_markets` / `analyze_trends`）在各平台一致。

> **遠端接入（v0.2.0）**：部署後可用一行 URL 取代下面的 stdio config：
>
> ```json
> { "mcpServers": { "askching": { "url": "https://ask-ching-agent.vercel.app/api/mcp" } } }
> ```
>
> 各平台的 URL 欄位名稱不同（VS Code 用 `type: http`、Codex 用 `url`、Gemini CLI 用 `httpUrl`），完整對照見 `docs/platform-integration.md`。

## 3. 各平台一行 config（發布後）

> **⚠️ 關於 `env`**：以下 config 為**fixture 模式**（`DEMO_LIVE=0`），不需 `GRAPH_API_KEY`。若要 live 模式，請在每個 config 的 `env` 欄位加入 `DEMO_LIVE: "1"` 與 `GRAPH_API_KEY`（見 §6 Credential 處理表）。

### 3.1 Claude Desktop

`~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "askching": {
      "command": "npx",
      "args": ["-y", "@askching/mcp-server"]
    }
  }
}
```

### 3.2 Claude Code

`.mcp.json`（專案根目錄）

```json
{
  "mcpServers": {
    "askching": {
      "command": "npx",
      "args": ["-y", "@askching/mcp-server"]
    }
  }
}
```

### 3.3 Cursor

`.cursor/mcp.json`（專案根目錄）

```json
{
  "mcpServers": {
    "askching": {
      "command": "npx",
      "args": ["-y", "@askching/mcp-server"]
    }
  }
}
```

### 3.4 VS Code

`.vscode/mcp.json`（專案根目錄）

```json
{
  "servers": {
    "askching": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@askching/mcp-server"]
    }
  }
}
```

### 3.5 Codex

`~/.codex/config.toml`

```toml
[mcp_servers.askching]
command = "npx"
args = ["-y", "@askching/mcp-server"]
```

### 3.6 Gemini CLI

`.gemini/settings.json`（專案根目錄）

```json
{
  "mcpServers": {
    "askching": {
      "command": "npx",
      "args": ["-y", "@askching/mcp-server"]
    }
  }
}
```

## 4. Agent Skill 接入

除了 MCP server，AskChing 也提供一個 Agent Skill（`skills/askching/`），讓平台在**不呼叫 MCP** 的情況下也能引導 agent 使用正確的 tool。

| 平台        | Skill 掃描目錄                  | 接入方式                         |
| ----------- | ------------------------------- | -------------------------------- |
| Claude Code | `.claude/skills/`               | symlink 或複製 `skills/askching` |
| Codex       | `.agents/skills/`               | symlink 或複製 `skills/askching` |
| Cursor      | `.agents/skills/`（**待實測**） | symlink 或複製 `skills/askching` |

> **⚠️ 待實測註記**：研究報告僅證實 Codex 掃描 `.agents/skills/`；Cursor 是否支援該目錄**未經研究證實**，標為「待實測」。若 Cursor 不支援，請改用 §3 的 MCP config 接入。

本 repo 已建立相對路徑 symlink：

```bash
mkdir -p .claude/skills .agents/skills
ln -s ../../skills/askching .claude/skills/askching
ln -s ../../skills/askching .agents/skills/askching
```

> **Windows 備援**：若 symlink 在 checkout 時 materialize 成文字檔，改用 `cp -r` 複製：
>
> ```bash
> cp -r skills/askching .claude/skills/askching
> cp -r skills/askching .agents/skills/askching
> ```

## 5. 本地（免發布）config

在 `@askching/shared` 與 `@askching/mcp-server` 發布前，`npx -y @askching/mcp-server` 無法真正跑（因為 `@askching/shared` 是 `workspace:*` 相依）。改用**直接指向本地 dist** 的 config：

```json
{
  "mcpServers": {
    "askching": {
      "command": "node",
      "args": ["<repo>/packages/mcp-server/dist/index.js"]
    }
  }
}
```

> **可攜式路徑**：`<repo>` 是佔位符，請替換為你 clone 本 repo 的絕對路徑（例如 `/Users/you/AskChing_Agent`）。各平台對相對路徑的解析基準不同，建議使用絕對路徑或平台支援的 `${workspaceFolder}` 變數。

先建置：

```bash
pnpm -C packages/mcp-server build
```

> 本地 config 使用 fixture 資料（`DEMO_LIVE=0`），不需要 `GRAPH_API_KEY`，可直接驗證 handshake 與 tool 形狀。

## 6. Credential 處理表

AskChing 的 live 模式需要 `GRAPH_API_KEY`（The Graph API key）。**永遠不要**把字面 key 寫進 config 或 commit。用環境變數 indirection：

| 變數            | 用途                                     | 預設 | 需要 key？          |
| --------------- | ---------------------------------------- | ---- | ------------------- |
| `DEMO_LIVE`     | `1` = live 模式；`0`/未設 = fixture 模式 | `0`  | 否（fixture）       |
| `GRAPH_API_KEY` | The Graph API key，live 模式必填         | 無   | 是（`DEMO_LIVE=1`） |

### 6.1 透過 config 的 `env` 欄位注入（支援的平台）

```json
{
  "mcpServers": {
    "askching": {
      "command": "npx",
      "args": ["-y", "@askching/mcp-server"],
      "env": {
        "DEMO_LIVE": "1",
        "GRAPH_API_KEY": "${GRAPH_API_KEY}"
      }
    }
  }
}
```

> 注意：`${GRAPH_API_KEY}` 是**佔位符**，代表「從 shell 環境讀取」。請在啟動平台前於 shell 設定 `export GRAPH_API_KEY=...`，不要直接填入字面 key。

### 6.2 透過 shell 環境注入（所有平台通用）

```bash
export GRAPH_API_KEY="your-key-here"
export DEMO_LIVE=1
```

### 6.3 安全原則

- 不把 `GRAPH_API_KEY` 寫進任何 config 檔或 commit。
- `.env` 已在 `.gitignore` 中，live 測試用 `--env-file=.env` 讀取。
- 若平台 config 不支援 env 展開，改為在 shell profile（`~/.zshrc` / `~/.bashrc`）設定變數。

## 7. 發布序列（發布後即可用）

`@askching/mcp-server` 依賴 `@askching/shared`（`workspace:*`），因此**必須先發布 shared**：

```bash
# 1. 先發布 shared（mcp-server 的相依）
pnpm -C packages/shared publish

# 2. 再發布 mcp-server
pnpm -C packages/mcp-server publish
```

> `prepack: npm run build` 會在 `publish` / `pack` 前自動建置 `dist/`，確保發布內容是最新 build。

發布後，§3 的 `npx -y @askching/mcp-server` 一行 config 即可在 5+ 平台直接使用。

## 8. 驗證

```bash
# 建置 + stdio handshake smoke test（斷言 5 個 tool）
pnpm mcp:smoke

# 完整測試套件
pnpm test

# 檢查發布 tarball 內容（含 dist/）— 需在 packages/mcp-server 內執行
cd packages/mcp-server && npm pack --dry-run
```

`mcp-smoke` 輸出 `mcp-smoke OK: askching (7 tools)` 即代表 stdio server 可真實啟動並完成 MCP handshake。

遠端（HTTP）的對應驗證：

```bash
# 本機 HTTP server + 端到端 smoke（initialize / tools/list / tools/call）
pnpm mcp:serve
pnpm mcp:http:smoke     # → mcp-http-smoke OK: askching (7 tools, transport=streamable-http, findings=3)

# 驗證 Vercel serverless 入口（同一種 Web 簽名）
pnpm vercel:probe       # → vercel-probe OK: api/mcp.ts and api/health.ts are deployable
```

> **⚠️ 注意**：驗證 tarball 請用 `npm pack --dry-run`（pnpm 不支援 `pack --dry-run` flag），且需在 `packages/mcp-server` 目錄內執行（在 repo root 執行會 pack 整個 private workspace）。

---

## 9. Grok 推理層（Roadmap）

AskChing 的 MCP server 可被**任何 MCP-compatible agent**（Claude、Cursor、Codex、支援 MCP 的 Grok）使用。

Grok orchestration（`@askching/grok-orchestrator`）目前是 **CLI**（`pnpm askching -- "..."`），以 in-process 方式呼叫 AskChing tools。讓 Grok 推理層以 **MCP server 形式**跨平台可用的實作已列入 roadmap——屆時任何 MCP-compatible agent 都能直接呼叫 Grok 驅動的 AskChing 推理，而不只是工具層。

### 現況 vs roadmap

| 層                          | 現況                                                          | Roadmap                   |
| --------------------------- | ------------------------------------------------------------- | ------------------------- |
| MCP server（工具層）        | ✅ 跨平台可用（本文件 §3-§7）；**亦支援遠端 Streamable HTTP** | —                         |
| Grok orchestrator（推理層） | CLI + in-process                                              | MCP server 化，跨平台可用 |
