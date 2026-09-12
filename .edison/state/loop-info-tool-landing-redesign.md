# Loop State — get_info Tool + Landing Page Redesign

- **Task slug**: `info-tool-landing-redesign`
- **Goal (Done Contract)**: (1) 新增 `get_info` MCP tool — 回傳 AskChing 自我介紹、6 個工具的用途與範例問題；(2) Landing page 重設計為科幻/Matrix/Web3/The Graph 風格。全部 gates 全綠、多步 commit、Push-to-deploy。
- **Quality Mode**: `strict`（threshold 93）
- **Depth**: L3

## 測試鎖定點（smith 掃描）

| 檔案 | 需更新 | 原因 |
|---|---|---|
| `register.ts` ASKCHING_TOOL_NAMES | 6→7 | 新增工具名 |
| `http.test.ts:57-58` | toHaveLength(6)→7 | smoke 預期 |
| `mcp-smoke.ts` | tool 列表 | 預期 6→7 |
| `http-smoke.ts` | tool 列表 | 預期 6→7 |
| landing page `index.html` | Six→Seven tools | 視覺 |
| `docs/try-it.md` | 6 tools 處 | 描述 |
| `docs/platform-integration.md` | 6 tools 處 | 描述 |
| README.md | 六 tools | 描述 |

---

## Loop 執行結果（2026-09-13）

### EXECUTE-A：get_info MCP tool（commit 1e9947e）

- `tools.ts`：新增 `getInfo()` + `GetInfoInputSchema`（topic: overview | tools | examples | all）+ `AskChingInfoSchema` + 靜態 `ASKCHING_INFO`（自我介紹、evidence model、6 工具用途+範例、transports、live sources）
- `register.ts`：註冊 `get_info`，`ASKCHING_TOOL_NAMES` 6→7
- `loop.ts`（grok-orchestrator）：工具定義 + executeTool case
- 鎖定點更新：mcp-smoke、http.test（length 7）、loop.test（順序）、vercel-probe（改用 ASKCHING_TOOL_NAMES 防再漂移）
- **Live 驗證**：`get_info` topic=overview 回傳 name/tagline/evidenceModel ✅

### EXECUTE-B：Landing page 科幻重設計（commit 1f3b7cc）

- 設計規格由 edison-ui-designer 產出：`docs/2026-09-13-landing-sci-fi-redesign-spec.md`
- `public/index.html` 重寫（307 行）：Matrix 數位雨 canvas + data-nodes canvas（單一 rAF loop、prefers-reduced-motion fallback、無外部依賴）、evidence chain 橫帶（subgraph→block→query hash）、harmonized matrix-green palette（WCAG AAA）、HUD section labels、corner-clipped tool cards、terminal Try-it 互動（含 REFUSED fail-closed 行）、copy buttons、live status LED
- **瀏覽器驗證**：H1 ASKCHING、7 tools、EVIDENCE CHAIN、REFUSED、connect/health/endpoints 全部正確渲染

### 文件同步（commit e9ef34c）

- platform-integration / cross-platform / walkthrough：6→7 tools
- try-it.md：新增 step 0「讓 AskChing 自我介紹」（get_info 用法）

### 修復（commit 6847e90）

- vercel:probe 原本硬編碼 6 tools → 改用 ASKCHING_TOOL_NAMES，防未來漂移

### 最終 gates（全綠）

- build 3/3、test 209/209（21 files）、eval 27/27、mcp:smoke 7 tools、mcp:http:smoke 7 tools、vercel:probe OK（tools/list 7）
- Live endpoint：7 tools（含 get_info）、landing page 科幻版已部署

### 協作進度

- johnku 平行推了 submission logo / cover / screenshots（356159e、d76595c 等）— 均已 rebase 整合
