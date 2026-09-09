# AskChing 跨平台 skills/MCP 打包研究報告

研究日期：2026-09-09
研究員：morpheus（研究部）｜ Depth: L3 Deep Dive
對應 Loop：loop-cross-platform-skills-packaging

## 1. 結論摘要

**可行，且最 juicy 的發布方式是「npm package + Agent Skills 標準」雙軌並行。**

AskChing 的 MCP server 本質上就是一個標準 stdio MCP server，**只要發布到 npm，任何 MCP-compatible 平台（Claude Desktop/Code/Cursor/VS Code/Codex/Gemini CLI）都能用一行 config 接入**。這正是「可重用性」最直觀的證明——評審看到 `npx -y @askching/mcp-server` 一行就能在任何平台跑起來，比任何 demo 都更有說服力。

**最 juicy 的發布方式（按優先序）：**
1. **發布 `@askching/mcp-server` 到 npm**（核心）→ 一行 config 全平台接入
2. **把 `SKILL.md` 移到平台自動掃描的位置**（`.claude/skills/` + `.agents/skills/`）→ 讓 Claude Code 與 Codex 都能自動發現
3. **補齊 `agents/openai.yaml` 的 `dependencies.tools`** → 讓 Codex 自動 wire MCP，做到「裝了 skill 就自動接上 server」

**關鍵洞察**：AskChing 的 MCP server 只需要 `DEMO_LIVE` + `GRAPH_API_KEY` 兩個 env，**不需要 `XAI_API_KEY`**（那是 grok-orchestrator CLI 才需要的）。這讓 MCP server 比完整 orchestrator 輕量得多，跨平台分發的 credential 負擔大幅降低。

## 2. 平台對照表

| 平台 | 接入格式 | 是否需要改現有結構 | Juicy 程度 |
| --- | --- | --- | --- |
| Claude Code | `.claude/skills/` + SKILL.md；MCP 用 `.mcp.json` | 需把 skill 移到 `.claude/skills/`；MCP 另設 config | ⭐⭐⭐ |
| Claude Desktop | `claude_desktop_config.json`（`mcpServers`） | 只需 npm 發布 + 一行 config | ⭐⭐⭐⭐ |
| Codex (OpenAI) | `.agents/skills/` + SKILL.md + `agents/openai.yaml`；MCP 用 `config.toml` | 需移到 `.agents/skills/`；補 `dependencies.tools` | ⭐⭐⭐⭐ |
| Cursor | `.cursor/mcp.json`（`mcpServers`） | 只需 npm 發布 + 一行 config | ⭐⭐⭐⭐ |
| VS Code (Copilot) | `.vscode/mcp.json`（`servers` + `type`） | 只需 npm 發布 + 一行 config | ⭐⭐⭐⭐ |
| Gemini CLI | `.gemini/settings.json`（`mcpServers`） | 只需 npm 發布 + 一行 config | ⭐⭐⭐ |
| Gemini Enterprise | 僅 StreamableHTTP（HTTPS URL） | 需另建 HTTP transport，stdio 不行 | ⭐ |
| Gemini API | function calling（非原生 MCP） | 需 bridge/proxy 轉換 | ⭐ |

## 3. Claude Code Skills 格式現況

### 官方格式
每個 skill 是一個目錄，內含 `SKILL.md`，由 YAML frontmatter + Markdown body 組成。

**Frontmatter 欄位**：`name`（必填，與目錄名一致）、`description`（建議）、`allowed-tools`（選填）、`version`/`license`/`compatibility`/`metadata`（選填）、`dependencies`（選填）、`disable-model-invocation`（選填）。

**共享/分發方式**：Standalone（`.claude/skills/<name>/SKILL.md`）、Plugin（`.claude-plugin/plugin.json` + marketplace）、claude.ai 上傳（ZIP）。

### 現有 `skills/askching/SKILL.md` 差距
| 檢查項 | 現況 | 差距 |
| --- | --- | --- |
| `name` | ✅ 與目錄名一致 | 無 |
| `description` | ✅ 有 | 無 |
| `allowed-tools` | ❌ 缺 | **缺**——skill 依賴 MCP tools 但未聲明 |
| `version`/`license`/`compatibility`/`metadata` | ❌ 缺 | **缺**——若要上傳 claude.ai 或打包需補 |
| 目錄位置 | `skills/askching/` | **⚠️ 不在 `.claude/skills/`**，Claude Code 不會自動掃描 |

**⚠️ 需實測驗證**：Claude Code 的 SKILL.md frontmatter 不支援聲明 MCP dependency。Claude Code 的 MCP server 需另外透過 `.mcp.json` 或 `claude mcp add` 配置。

## 4. Codex agent 格式

### 官方格式
Codex 採用 **Agent Skills 開放標準**（與 Claude Code 相同的 `SKILL.md` 格式）。Skill 目錄結構：`SKILL.md`（必填）+ `scripts/` + `references/` + `assets/` + `agents/openai.yaml`（選填）。

**位置**：repo 級放 `.agents/skills/`（團隊共享），個人級放 user directory。

**`agents/openai.yaml` 格式**：
```yaml
interface:
  display_name: "User-facing name"
  short_description: "User-facing description"
  default_prompt: "Optional surrounding prompt"

policy:
  allow_implicit_invocation: false

dependencies:
  tools:
    - type: "mcp"
      value: "openaiDeveloperDocs"
      description: "OpenAI Docs MCP server"
      transport: "streamable_http"
      url: "https://developers.openai.com/mcp"
```

**關鍵**：`dependencies.tools` 區塊就是 skill 聲明「我需要這個 MCP server」的方式，Codex 會自動安裝並 wire。

**Codex MCP config**：`~/.codex/config.toml`（TOML）：
```toml
[mcp_servers.askching]
command = "npx"
args = ["-y", "@askching/mcp-server"]
enabled = true

[mcp_servers.askching.env]
DEMO_LIVE = "1"
GRAPH_API_KEY = "your-key"
```

### 現有 `skills/askching/agents/openai.yaml` 差距
| 檢查項 | 現況 | 差距 |
| --- | --- | --- |
| `interface` | ✅ 有 | 無（可加 icon/brand_color） |
| `policy` | ❌ 缺 | **缺**——無法控制 implicit invocation |
| `dependencies.tools` | ❌ 缺 | **缺**——**這是最大差距**，Codex 不會自動 wire MCP |
| 目錄位置 | `skills/askching/agents/` | **⚠️ 不在 `.agents/skills/`**，Codex 不會自動掃描 |

## 5. MCP 跨平台 config 對照

| 平台 | Config 檔 | Root key | 格式 | 需 `type` 欄位 |
| --- | --- | --- | --- | --- |
| Claude Desktop | `claude_desktop_config.json` | `mcpServers` | JSON | ❌ |
| Claude Code | `.mcp.json` / `~/.claude.json` | `mcpServers` | JSON | ❌ |
| Cursor | `.cursor/mcp.json` | `mcpServers` | JSON | ❌ |
| VS Code (Copilot) | `.vscode/mcp.json` | `servers` | JSON | ✅ (`stdio`/`http`/`sse`) |
| Codex CLI | `~/.codex/config.toml` | `[mcp_servers.x]` | TOML | ❌ |
| Gemini CLI | `.gemini/settings.json` | `mcpServers` | JSON | ❌ |
| Windsurf | `mcp_config.json` | `mcpServers` | JSON | ❌ |
| Cline | `mcpServers` | `mcpServers` | JSON | ❌ |

### AskChing 各平台一行 config（假設已發布 `@askching/mcp-server`）

**Claude Desktop** (`claude_desktop_config.json`)：
```json
{
  "mcpServers": {
    "askching": {
      "command": "npx",
      "args": ["-y", "@askching/mcp-server"],
      "env": { "DEMO_LIVE": "1", "GRAPH_API_KEY": "your-key" }
    }
  }
}
```

**Cursor** (`.cursor/mcp.json`)：
```json
{
  "mcpServers": {
    "askching": {
      "command": "npx",
      "args": ["-y", "@askching/mcp-server"],
      "env": { "DEMO_LIVE": "1", "GRAPH_API_KEY": "${GRAPH_API_KEY}" }
    }
  }
}
```

**VS Code** (`.vscode/mcp.json`)：
```json
{
  "servers": {
    "askching": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@askching/mcp-server"],
      "env": { "DEMO_LIVE": "1", "GRAPH_API_KEY": "${input:graph-api-key}" }
    }
  }
}
```

**Codex** (`~/.codex/config.toml`)：
```toml
[mcp_servers.askching]
command = "npx"
args = ["-y", "@askching/mcp-server"]
enabled = true

[mcp_servers.askching.env]
DEMO_LIVE = "1"
GRAPH_API_KEY = "your-key"
```

**Gemini CLI** (`.gemini/settings.json`)：
```json
{
  "mcpServers": {
    "askching": {
      "command": "npx",
      "args": ["-y", "@askching/mcp-server"],
      "env": { "DEMO_LIVE": "1", "GRAPH_API_KEY": "$GRAPH_API_KEY" }
    }
  }
}
```

### Credentials（env）跨平台處理
| 平台 | env 變數引用語法 | 建議 |
| --- | --- | --- |
| Claude Desktop | 字面值 | 直接寫值（不理想，但可行） |
| VS Code | `${input:api-token}` / `${env:VAR}` | 用 input prompt 或 env 引用 |
| Cursor | `${env:VAR}` | 引用 shell env |
| Gemini CLI | `$VAR` / `${VAR}` | 引用 shell env |
| Codex | `env_vars`（forward local env）或 `env` table | 用 `env_vars = ["GRAPH_API_KEY"]` 轉發本機 env |

**⚠️ 需實測驗證**：各平台對 `${VAR}` / `$VAR` 的展開語法略有差異。跨平台時不要複製字面 credential，應改用目標平台的 indirection 機制。

## 6. Gemini 接入方式

| 路徑 | 支援 MCP? | Transport | 說明 |
| --- | --- | --- | --- |
| Gemini CLI | ✅ | stdio / sse / http | 透過 `settings.json` 的 `mcpServers`，`gemini mcp add` 指令寫入 |
| Gemini Enterprise | ✅ | 僅 StreamableHTTP | 需把 MCP server 部署成 HTTP endpoint，stdio 不行 |
| Gemini API | ❌ 非原生 | function calling | 需 bridge/proxy 把 MCP tools 轉成 Gemini function declarations |

**⚠️ 需實測驗證**：AskChing 的 zod-based input schema 在 Gemini CLI 下是否正常運作（Gemini 對 schema 較嚴格）。

## 7. 建議：要打包成什麼？

**兩者都要，但以 npm package 為核心。**

### 建議發布物
**A. `@askching/mcp-server` npm package（核心，最 juicy）**
- 現有 `package.json` 已有 `bin` + shebang，基礎已具備
- **⚠️ 阻礙**：`"private": true` 需改為 `false` 才能發布
- 需補：`files: ["dist"]`、`prepublishOnly: "npm run build"`、`keywords`、`engines`

**B. Agent Skills 標準包（`.skills` folder）**
- 把 `skills/askching/` 複製/移動到 `.claude/skills/askching/` 與 `.agents/skills/askching/`
- 補齊 SKILL.md frontmatter：`allowed-tools`、`version`、`license`、`compatibility`、`metadata`
- 補齊 `agents/openai.yaml`：加 `policy` + `dependencies.tools`

**C. 可選：Claude Code plugin + marketplace**
- 若要「一鍵安裝」，可包成 plugin 並發布到 marketplace

### 為什麼 npm package 最 juicy
對 ETHOnline 評審而言，「可重用性」最有力的證明是：**一個 npm 包 + 一行 config，就能在 5+ 個不同 AI 平台跑起來**。建議在 repo 加一個 `docs/cross-platform.md`，列出每個平台的一行 config，評審一眼就能看到可重用性。

## 8. 風險與限制

| 風險 | 嚴重度 | 說明 |
| --- | --- | --- |
| `private: true` 阻礙 npm 發布 | 🔴 高 | 需改為 `false` 才能 `npm publish --access public` |
| Skill 目錄位置不被自動掃描 | 🔴 高 | 現有 `skills/askching/` 不在 `.claude/skills/` 或 `.agents/skills/`，兩平台都不會自動發現 |
| `openai.yaml` 缺 `dependencies.tools` | 🟡 中 | Codex 不會自動 wire MCP，需手動 config |
