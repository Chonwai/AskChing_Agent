# AskChing 跨平台 skills/MCP 打包整合方案

> 版本: v0.1.0 打包方案｜ 建立日期: 2026-09-09｜ 狀態: 規劃完成
> Depth: L3 Deep Dive｜ Quality Mode: strict (93)
> 規劃員: architect（規劃部）｜ 對應 Loop: loop-cross-platform-skills-packaging

## 1. 需求理解確認

**商業目標**：在 ETHOnline 2026 評審面前，用最具體的方式證明 AskChing 的「可重用性」——一個 MCP server + 一個 Agent Skill，可在 5+ 個 AI 平台以一行 config 接入。

**根本問題**：評審要的是「看得出這東西能被別處重用」，而不是「一定要有一個 live npm package」。因此核心交付物是**證明可重用性的 config 形狀 + 可運行的本地驗證**，而非冒險在 hackathon 期間發布半成品到公開 npm。

**三個需裁決的關鍵決策**：
1. 是否真要在 hackathon 期間 `npm publish`？→ **不實際發布**，只做成 publish-ready
2. skill 要複製 3 份還是單一來源？→ **單一來源 + symlink 兩處**
3. 如何處理 `@askching/shared` 的 `workspace:*` 相依？→ demo 用本地 config；npx 一行 config 作為發布後 showcase

## 2. 程式庫現狀分析

| 項目 | 現況 | 關鍵差距 |
|---|---|---|
| `packages/mcp-server/package.json` | `private:true`、`version:0.0.0`、`bin.askching-mcp`、deps `@askching/shared: workspace:*` | 缺 `files`/`description`/`license`/`keywords`/`engines`/`prepack` |
| `src/index.ts` | shebang 正確；`serverInfo.version="0.1.0"` | ⚠️ serverInfo=0.1.0 但 package.json=0.0.0（不一致） |
| `src/tools.test.ts` | 只測 tool 函數 | 需補 mcp-smoke |
| `skills/askching/SKILL.md` | name/description 有 | 缺 allowed-tools/version/license/compatibility/metadata |
| `skills/askching/agents/openai.yaml` | 只有 interface | 缺 policy + dependencies.tools |
| `@askching/shared/package.json` | `private:true`、`version:0.0.0` | 發布前置：需一起發布 |
| repo root | 無 `.claude/`、無 `.agents/` | 需新增 platform dirs |

**⚠️ 研究報告遺漏的 release blocker**：`@askching/shared: workspace:*`。`npx -y @askching/mcp-server` 要真正能跑，`@askching/shared` 也必須發布（或 bundle 進 dist）。

## 3. 三大決策結論

| 決策 | 裁決 | 理由 |
|---|---|---|
| A. 是否 npm publish | **不實際發布**，只做成 publish-ready | 評審要的是「證明可重用」，docs 展示 config 形狀 + 本地 mcp-smoke 證明形狀可行即達標 |
| B. skill 複製策略 | **單一來源 `skills/askching/` + symlink 兩處** | 零 drift + 兩大平台就地 auto-discover |
| C. workspace:* 相依 | demo 用**本地 config**；npx 一行 config 在 docs 中作為「發布後」showcase | 避免引入 bundler；真正發布走「雙發布 shared→mcp-server」序列 |

## 4. 風險分析矩陣

| 風險 | 嚴重度 | 緩解 |
|---|---|---|
| `workspace:*` 相依：npx 一行 config 目前無法真正跑 | 🔴 高 | docs 同時提供「本地 config（可跑）」與「npx config（發布後）」雙形式 |
| `private:false` 被誤觸發 publish | 🟡 中 | 本次不執行 publish；docs 明示發布序列 |
| Claude Code `allowed-tools` 的 MCP tool 命名需實測 | 🟡 中 | 標為 Open Question（ESC-VPW-001） |
| Codex `dependencies.tools` stdio transport schema 需實測 | 🟡 中 | 提供 intended block；備援 `~/.codex/config.toml`（ESC-VPW-002） |
| symlink 在 Windows checkout 會 materialize 成文字檔 | 🟡 中 | docs 提供 `cp -r` 跨平台備援指令 |
| dist/ 被 gitignore 但 npm pack 仍需 dist | 🟢 低 | `prepack: npm run build` 在 pack/publish 前自動建置 |

## 5. 精確編輯指令清單

### A. npm package 發布準備

#### A1. `packages/mcp-server/package.json`
- `version` 0.0.0 → 0.1.0（與 serverInfo.version 一致）
- `private` true → false
- 新增 `prepack: npm run build`
- 新增 `description`/`license:MIT`/`files:["dist"]`/`keywords`/`engines`/`publishConfig`

#### A2. `packages/shared/package.json`（僅若發布，本次 demo 可略）
- 同 A1 模式（version 0.1.0、private false、files/prepack/keywords/license/engines/publishConfig）

**發布序列（寫進 docs，本次不執行）**：`pnpm -C packages/shared publish` → `pnpm -C packages/mcp-server publish`

### B. Agent Skills 標準包

#### B1. `skills/askching/SKILL.md` frontmatter 補齊
```yaml
---
name: askching
description: Use when a user asks to compare supported DeFi markets, request a cited multi-subgraph research brief, or scan supported protocols for metric-based risk signals through the AskChing MCP.
allowed-tools:
  - compare_markets
  - research_brief
  - risk_scan
version: 0.1.0
license: MIT
compatibility:
  - claude-code
  - codex
  - cursor
metadata:
  category: research/data
  author: "AskChing"
---
```

#### B2. `skills/askching/agents/openai.yaml` 補齊
```yaml
interface:
  display_name: "AskChing"
  short_description: "Run cited multi-subgraph market research"
  default_prompt: "Use $askching to compare USDC supply APY across supported protocols with citations."

policy:
  allow_implicit_invocation: false

dependencies:
  tools:
    - type: "mcp"
      value: "askching"
      description: "AskChing MCP server for cited multi-subgraph market research"
      transport: "stdio"
      command: "npx"
      args:
        - "-y"
        - "@askching/mcp-server"
```

#### B3. symlink（建立 auto-scan 目錄）
```bash
mkdir -p .claude/skills .agents/skills
ln -s ../../skills/askching .claude/skills/askching
ln -s ../../skills/askching .agents/skills/askching
```

### C. `docs/cross-platform.md`（最 juicy 交付物，新增檔）
- 價值主張：`@askching/mcp-server` 是標準 stdio MCP server，發布後一行 config 即可在 5+ AI 平台接入
- 平台對照表（Claude Desktop/Code/Cursor/VS Code/Codex/Gemini CLI）
- 各平台一行 config（逐一列出）
- 本地（免發布）即可跑 config
- Credential 處理表（不複製字面 key，用 indirection）
- 發布序列（發布後即可用）

### D. 測試策略

#### D1. 新增 `packages/mcp-server/src/mcp-smoke.ts`
驗證 stdio server 能真實啟動並完成 MCP handshake（spawn node dist/index.js → initialize → tools/list → 斷言 3 個 tool）。

#### D2. root `package.json` 加 script
```json
"mcp:smoke": "pnpm -C packages/mcp-server build && tsx packages/mcp-server/src/mcp-smoke.ts"
```

## 6. 需交由 review skill 再審的項目

| ID | 項目 | 維度 | 備註 |
|---|---|---|---|
| ESC-VPW-001 | Claude Code `allowed-tools` 對 MCP tool 的正確命名（可能需 `mcp__askching__<tool>` 前綴） | DR-D6 | 需實測 |
| ESC-VPW-002 | Codex `dependencies.tools` 是否接受 stdio `command`/`args` | DR-D6 | 需實測；備援 `~/.codex/config.toml` |
| ESC-VPW-003 | `npx -y @askching/mcp-server` 需先發布 `@askching/shared` | DR-D2 | 已列為 High；demo 用本地 config |

**最高風險 Finding**：`workspace:*` 相依使得「發布後 npx 一行 config」目前為假設性展示，必須在 docs 中同時提供「本地可跑 config」＋「發布後 npx config」雙形式。

## 7. Done Contract（驗收標準）

- [ ] A：`packages/mcp-server/package.json` 為 publish-ready，且已驗證 `pnpm pack --dry-run` OK
- [ ] B：`skills/askching/SKILL.md` frontmatter 補齊；`agents/openai.yaml` 補 policy + dependencies.tools
- [ ] B：`.claude/skills/askching` 與 `.agents/skills/askching` symlink 建立
- [ ] C：`docs/cross-platform.md` 包含各平台一行 config、credential indirection 表、本地 vs npx 雙形式、發布序列
- [ ] D：`mcp-smoke` 可運行，輸出 `mcp-smoke OK: askching`
- [ ] 一致性：mcp-server / shared 的 version 與 serverInfo.version 皆為 0.1.0
- [ ] 無過度設計：無引入 design pattern、無 bundler、無實際 npm publish
