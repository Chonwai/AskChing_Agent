# AskChing — 手把手測試教學文檔（用戶旅程）

> **用途：** 讓使用者在終端機一步步手動測試 AskChing 的全部功能。
> **形式：** 用戶旅程（Journey of 7 stations）— 每個 Station 都是「輸入 → 預期輸出 → ✅ 驗證點」。
> **前置依賴：** Node ≥ 20、pnpm ≥ 9、macOS / Linux（跨平台說明見 `docs/cross-platform.md`）。
> **對應文件：** 詳細技術規格見 `docs/engineering-spec.md`；Demo prompts 底稿見 `demos/prompts.md`。

---

## 🗺️ 旅程總覽

| Station | 內容 | 需要 API key | 預估時間 |
|---|---|---|---|
| **0** | 準備（.env / install / Node 驗證） | ❌（先填好） | 5 分鐘 |
| **1** | 建置與測試紅綠燈（build / test / eval） | ❌ | 3 分鐘 |
| **2** | Fixture Demo（不需 API key） | ❌ | 2 分鐘 |
| **3** | Live Demo（真 Graph 資料） | ✅ GRAPH_API_KEY | 2 分鐘 |
| **4** | Live Smoke（raw JSON 證據） | ✅ GRAPH_API_KEY | 1 分鐘 |
| **5** | Grok Orchestrator（真 AI 推理） | ✅ XAI_API_KEY + GRAPH_API_KEY | 3 分鐘 |
| **6** | MCP Server Smoke（stdio + HTTP 跨平台證明） | ❌（fixture mode） | 2 分鐘 |
| **7** | Remote MCP（部署到 Vercel + 多平台接入） | ❌（或 ✅ 若要用 live） | 3 分鐘 |

> **總計：** 完整旅程約 **20 分鐘**；只跑「快速完成清單」（Station 0/1/2/4/6）約 **11 分鐘**。**全程不需要任何視覺化工具，全部在終端機完成。**

---

## Station 0 — 準備（5 分鐘）

> 目標：建立環境、填入憑證、確認 runtime 就緒。

### 輸入

```bash
# 0.1 複製環境檔並填入 keys
cp .env.example .env
# 編輯 .env：填入 XAI_API_KEY 與 GRAPH_API_KEY（取得方式見下方）
# 確認 ASKCHING_LLM_BASE_URL=https://api.x.ai/v1，ASKCHING_LLM_MODEL=grok-4.6

# 0.2 安裝依賴
pnpm install

# 0.3 驗證 Node 版本
node -v        # 預期 v20.x+（package.json engines: "node": ">=20"）
```

`.env.example` 內容（`ASKCHING_LLM_MODEL` 若 404 可改 `grok-4`，見「失敗排查」）：

```bash
XAI_API_KEY=
ASKCHING_LLM_BASE_URL=https://api.x.ai/v1
ASKCHING_LLM_MODEL=grok-4.6
ASKCHING_DEBUG=0
GRAPH_API_KEY=
DEMO_LIVE=0
```

### 預期輸出

- `pnpm install`：dependencies 安裝完成，無 error（monorepo，packages 內共享鎖檔）。
- `node -v`：回傳 `v20.x.x` 或更高。

### ✅ 驗證點

- [ ] `.env` 已存在（由 `.env.example` 複製），且 `XAI_API_KEY`、`GRAPH_API_KEY` 均已填入非空值
- [ ] `GRAPH_API_KEY` 是 The Graph Studio 的 API key（格式類似 `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`），**不是** subgraph ID
- [ ] `pnpm install` 以 exit code 0 完成
- [ ] `node -v` ≥ v20

> 🔑 **Key 取得方式：**
> - `XAI_API_KEY`：https://console.x.ai/ → API Keys → Create key。
> - `GRAPH_API_KEY`：https://thegraph.com/studio/ → 任一 subgraph 的 Query 分頁 → API Key（AskChing 只用 public Messari subgraphs，任何有效 Studio key 皆可）。

---

## Station 1 — 建置與測試紅綠燈（3 分鐘）

> 目標：確認三 packages 可建置、167 個單元測試全過、23 個 evals 全過。

### 輸入

```bash
# 1.1 建置全部 packages
pnpm build

# 1.2 執行單元測試（Vitest）
pnpm test

# 1.3 執行行為 evals（fixture mode，固定行為檢查）
pnpm eval
```

### 預期輸出

**`pnpm build`：** 三個 packages 依序建置，結尾應有類似：

```
Scope: 3 of 4 workspace projects
...  packages/shared       build: Done
...  packages/mcp-server   build: Done
...  packages/grok-orchestrator  build: Done
```

**`pnpm test`：** 結尾為：

```
 Test Files  16 passed (16)
      Tests  167 passed (167)
```

**`pnpm eval`：** 23 個 cases 全部通過（既有 USDC 行為 cases + 泛化 cases：`compare-usdt-supply` / `compare-weth-supply` / `compare-usdc-borrow` / `compare-usdc-tvl` / `compare-legacy-alias` / `compare-six-protocol`，加上 analysis 與 trend cases），結尾為 `AskChing evals passed: 23/23`。

### ✅ 驗證點

- [ ] `pnpm build` 無 TypeScript error，三 packages 皆 `done`
- [ ] `pnpm test` 顯示 `167 passed`（16 個 test files）
- [ ] `pnpm eval` 顯示 `23/23` evals passed
- [ ] 三條指令 exit code 皆為 0

> 📝 **這些在驗證什麼：** build 驗證 TS 編譯、test 驗證單元行為（citation 強制、fail-closed、fixture normalization、跨 asset guard、四 metric 提取分支、趨勢統計、HTTP transport）、eval 驗證固定契約（≥2 rows、≥2 sources、asOf 存在、每 row 帶完整 citation、timeframe gap caveat、泛化 asset/metric 透傳）。泛化後 AskChing 支援 4 資產 × 4 metrics × **6 LIVE 協議**，legacy `usdc_supply_apy` 呼叫仍向後相容。

---

## Station 2 — Fixture Demo（不需 API key）（2 分鐘）

> 目標：用內建 fixture 資料展示三源比較 brief —— **完全不呼叫 The Graph 或 Grok**。這是預設模式（`DEMO_LIVE=0`），適合快速演示與 rehearsal。

### 輸入

```bash
pnpm demo -- "Compare USDC supply APY across Aave V3, Compound V3, and Spark Lend"
```

### 預期輸出

```
─── Research Brief ───
Question: Compare USDC supply APY across Aave V3, Compound V3, and Spark Lend
Mode: fixture

Conclusion: <一句結論，例如 Aave V3 目前提供最高的 USDC supply APY>

Key Figures:
  aave-v3: 4.25% (percent) [source: <subgraphId>]
  compound-v3: 3.14% (percent) [source: <subgraphId>]
  spark-lend: 2.95% (percent) [source: <subgraphId>]

As-of: <ISO 8601 timestamp>

Sources:
  aave-v3: subgraph JCNWRypm7FYwV8fx5HhzZPSFaMxgkPuw4TnR3Gpi81zk (block ...)
  compound-v3: subgraph AwoxEZbiWLvv6e3QdvdMZw4WDURdGbvPfHmZRc8Dpfz9 (block ...)
  spark-lend: subgraph GbKdmBe4ycCYCQLQSjqGg6UHYoYfbyJyq5WrG35pv1si (block ...)

Caveats:
  <caveat 列表，例如 market snapshot、spot signal 等>
```

### ✅ 驗證點

- [ ] 第一行顯示 **`Mode: fixture`**（不是 live）
- [ ] **三行 ranked key figures**，數值為 fixture 固定值：Aave **4.25%** > Compound **3.14%** > Spark **2.95%**
- [ ] `As-of` 存在（ISO 8601 timestamp）
- [ ] 每行 `[source: ...]` 帶 subgraph ID（與 `demos/prompts.md` 底部 locked sources 一致）
- [ ] `Caveats` 存在
- [ ] `Conclusion` 依數值排序陳述（Aave 最高）

> 💡 **沒有 API key 也能測：** 此站完全不觸網。若出現網路請求或等待，代表環境有 `DEMO_LIVE` 遺留值 —— 見「失敗排查」。

---

## Station 3 — Live Demo（真 Graph 資料）（2 分鐘）

> 目標：切換到 live 模式（`DEMO_LIVE=1`），對三個 Messari subgraph 發送**真實 GraphQL 查詢**，取得真實鏈上數值。

### 輸入

```bash
pnpm demo:live -- "Compare USDC supply APY across Aave V3, Compound V3, and Spark Lend"
```

### 預期輸出

```
─── Research Brief ───
Question: Compare USDC supply APY across Aave V3, Compound V3, and Spark Lend
Mode: live

Conclusion: <e.g. Compound V3 目前提供最高的 USDC supply APY>

Key Figures:
  compound-v3: ~9.3% (percent) [source: AwoxEZbiWLvv6e3QdvdMZw4WDURdGbvPfHmZRc8Dpfz9]
  aave-v3: ~6.2% (percent) [source: JCNWRypm7FYwV8fx5HhzZPSFaMxgkPuw4TnR3Gpi81zk]
  spark-lend: ~4.8% (percent) [source: GbKdmBe4ycCYCQLQSjqGg6UHYoYfbyJyq5WrG35pv1si]

As-of: 2026-09-09T...Z

Sources:
  aave-v3: subgraph JCNWRypm7FYwV8fx5HhzZPSFaMxgkPuw4TnR3Gpi81zk (block 2245xxxx)
  compound-v3: subgraph AwoxEZbiWLvv6e3QdvdMZw4WDURdGbvPfHmZRc8Dpfz9 (block 2245xxxx)
  spark-lend: subgraph GbKdmBe4ycCYCQLQSjqGg6UHYoYfbyJyq5WrG35pv1si (block 2245xxxx)
```

> ⚠️ **數值會隨區塊變動**，不要期待與 fixture 相同；實際 APY 依鏈上供需浮動。上表僅為示意。

### ✅ 驗證點

- [ ] 第一行顯示 **`Mode: live`**
- [ ] **數值非 fixture**：三行皆為即時數值，且不應出現 `sha256:fixture-...` 字樣（fixture query hash 標籤）
- [ ] 數值為三源**即時比較**，每行帶真實 subgraph ID
- [ ] **block 為近期**：block number 應接近目前 Ethereum 高度（與 `live:smoke` 或 etherscan 比對）
- [ ] `As-of` 為當前時間（不是固定 fixture 時間）
- [ ] `Conclusion` 依 live 數值排序

> 🤔 **為什麼 Compound 通常 > Aave：** 兩者競逐同一個 USDC 供給池，通常 Compound V3 給的 supply rate 略高；但這是市場狀態，非保證。文件只驗證「數值非 fixture + block 近期」。

---

## Station 4 — Live Smoke（raw JSON 證據）（1 分鐘）

> 目標：輸出**完整 raw JSON**，展示 evidence chain —— query hash、block、timestamp、subgraph ID 對齊。

### 輸入

```bash
pnpm live:smoke
```

### 預期輸出

完整 JSON（`JSON.stringify(result, null, 2)`），結構如下：

```json
{
  "metric": "usdc_supply_apy",
  "asOf": "2026-09-09T...Z",
  "rows": [
    { "rank": 1, "protocol": "compound-v3", "value": 9.3, "unit": "percent", "subgraphId": "AwoxEZbiWLvv6e3QdvdMZw4WDURdGbvPfHmZRc8Dpfz9", "block": 2245..., "timestamp": "...", "queryHash": "sha256:..." },
    { "rank": 2, "protocol": "aave-v3", "value": 6.2, "unit": "percent", "subgraphId": "JCNWRypm7FYwV8fx5HhzZPSFaMxgkPuw4TnR3Gpi81zk", "block": 2245..., "timestamp": "...", "queryHash": "sha256:..." },
    { "rank": 3, "protocol": "spark-lend", "value": 4.8, "unit": "percent", "subgraphId": "GbKdmBe4ycCYCQLQSjqGg6UHYoYfbyJyq5WrG35pv1si", "block": 2245..., "timestamp": "...", "queryHash": "sha256:..." }
  ],
  "caveats": [ "...", "..." ],
  "sources": [
    { "protocol": "aave-v3", "subgraphId": "JCNWRypm7FYwV8fx5HhzZPSFaMxgkPuw4TnR3Gpi81zk", "deploymentId": "...", "block": 2245..., "timestamp": "...", "queryHash": "sha256:..." },
    { "protocol": "compound-v3", "subgraphId": "AwoxEZbiWLvv6e3QdvdMZw4WDURdGbvPfHmZRc8Dpfz9", "deploymentId": "...", "block": 2245..., "timestamp": "...", "queryHash": "sha256:..." },
    { "protocol": "spark-lend", "subgraphId": "GbKdmBe4ycCYCQLQSjqGg6UHYoYfbyJyq5WrG35pv1si", "deploymentId": "...", "block": 2245..., "timestamp": "...", "queryHash": "sha256:..." }
  ]
}
```

### ✅ 驗證點

- [ ] 有 `rows` 陣列，含 **rank（1/2/3）、value、unit、subgraphId**
- [ ] 有 `sources` 陣列，含 **subgraphId + deploymentId + block + timestamp + queryHash**
- [ ] **queryHash 三源相同**（同一 query 送三個 subgraph，hash 一致）
- [ ] **block 三源相近**（同一個區塊高度 ± 少量，因 fan-out 並行）
- [ ] `asOf` 存在且為最新時間
- [ ] 數值與 Station 3（同時間跑的 live demo）合理一致

> 🔬 **這是「證據鏈」的原始形式**：`rows` 是排名後的數字，`sources` 是每個數字的 provenance。後續 Grok 的 citation 就來自這裡。

---

## Station 5 — Grok Orchestrator（真 AI 推理）（3 分鐘）

> 目標：走完整 Grok tool-calling loop —— 自然語言 → Grok 選 tool → fan-out → cited synthesis。

### 輸入

```bash
pnpm askching -- "Compare live USDC supply APY across Aave V3, Compound V3, and Spark Lend"
```

> 注意：`pnpm askching` 是 **`node packages/grok-orchestrator/dist/index.js`**（不是 demo.ts），直接走 Grok 工具循環。需要 `XAI_API_KEY` **和** `GRAPH_API_KEY` 同時存在。Live/fixture 由 `.env` 的 `DEMO_LIVE` 決定 —— 請確認 `.env` 中為 `1`（或未設成 `0`）才能拿到 live 數值。

### 預期輸出

最終合成回答（含 conclusion + ranked + sources + asOf + caveats），例如：

```
Question: Compare live USDC supply APY across Aave V3, Compound V3, and Spark Lend

<Grok 合成結論，例如：Comparing live USDC supply APY right now, Compound V3 offers the highest rate (~9.3%), followed by Aave V3 (~6.2%) and Spark Lend (~4.8%). ...>

Ranked:
  1. Compound V3 — ~9.3% [source: AwoxEZbiWLvv6e3QdvdMZw4WDURdGbvPfHmZRc8Dpfz9]
  2. Aave V3 — ~6.2% [source: JCNWRypm7FYwV8fx5HhzZPSFaMxgkPuw4TnR3Gpi81zk]
  3. Spark Lend — ~4.8% [source: GbKdmBe4ycCYCQLQSjqGg6UHYoYfbyJyq5WrG35pv1si]

As-of: <block timestamp>
Caveats: <...>
```

### ✅ 驗證點

- [ ] **有完整 answer**（不是空回覆或 error）
- [ ] Grok 選擇 `compare_markets`（或 `research_brief`）tool 並成功執行
- [ ] **推理正確**：結論與 ranked 數值一致（最高者排第一）
- [ ] **cite 三源**：三個 subgraph ID 都有被引用
- [ ] `asOf` 存在
- [ ] 數值來源是 tool result（非 Grok 憑空捏造）—— 用 Station 4 的 raw JSON 交叉比對

### 延伸：顯示 tool trace

```bash
ASKCHING_DEBUG=1 pnpm askching -- "Compare live USDC supply APY across Aave V3, Compound V3, and Spark Lend"
```

- 預期：在合成回答前，額外印出 **tool name + arguments**（`compare_markets` 或 `research_brief` + 參數）。
- ✅ 驗證點：**不會**印出 API key / 憑證 / raw tool result（安全設計，`ASKCHING_DEBUG=1` 只印 tool name + arguments）。

> ⚠️ **Grok 的 tool 選擇每次可能不同**（可能選 `compare_markets` 或 `research_brief`），兩者都是有效路徑，不需視為失敗。若 Grok 直接回答而不呼叫 tool，重試或改 prompt 措辭（見「失敗排查」）。

---

## Station 6 — MCP Server Smoke（跨平台證明）（1 分鐘）

> 目標：證明 AskChing 是標準 MCP server —— 通過 handshake（`initialize` → `notifications/initialized` → `tools/list`），對任何 MCP client（Cursor / Claude / VS Code / Codex / Gemini / Grok Bot）皆可用。此站以 fixture mode（`DEMO_LIVE=0`）執行，**不需 API key**。

### 輸入

```bash
# 6.1 stdio transport
pnpm mcp:smoke

# 6.2 遠端 Streamable HTTP（端到端：initialize / tools/list / tools/call）
pnpm mcp:http:smoke

# 6.3 Vercel serverless 入口（驗證匯出形狀、config、握手）
pnpm vercel:probe
```

### 預期輸出

```
mcp-smoke OK: askching (7 tools)
mcp-http-smoke OK: askching (7 tools, transport=streamable-http, findings=3)
vercel-probe OK: api/mcp.ts and api/health.ts are deployable
```

### ✅ 驗證點

- [ ] `mcp-smoke OK: askching (7 tools)`
- [ ] 列出 5 個 tools：`compare_markets` / `research_brief` / `risk_scan` / `analyze_markets` / `analyze_trends`
- [ ] `mcp-http-smoke` 回報 `transport=streamable-http` 且有 findings
- [ ] `vercel-probe` 顯示 `export shape OK` 與 `config OK runtime=nodejs`
- [ ] exit code 皆為 0

> 🔌 **跨平台意義：** 五個 tools 暴露的正是同一組 Grok 可呼叫的函數（`packages/mcp-server/src/register.ts` 是唯一註冊來源）。任何支援 MCP 的 agent 都可直接掛載此 server —— stdio 本機掛載，或一行 URL 遠端掛載。

---

## Station 7 — Remote MCP（部署到 Vercel + 多平台接入）（3 分鐘）

> 目標：驗証逐端部署路徑。本機先跑 HTTP server，再（若有 Vercel 帳號）實際部署並用 URL 接入。
> 詳細步驟見 `docs/deployment-vercel.md`；各平台設定見 `docs/platform-integration.md`。

### 輸入

```bash
# 7.1 本機 HTTP MCP server（與遠端同一份程式碼）
pnpm mcp:serve
# → askching-mcp http listening on http://localhost:8787/api/mcp (live=false)

# 7.2 另一個終端：metadata + 工具清單
curl -s http://localhost:8787/health
curl -s http://localhost:8787/api/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | jq '.result.tools[].name'

# 7.3 回應非 POST 的方法（應為 405）
curl -s -o /dev/null -w '%{http_code}\n' -X GET http://localhost:8787/api/mcp
```

### 預期輸出

```
{"name":"askching","version":"0.1.0","transport":"streamable-http","endpoint":"/api/mcp","live":false}

analyze_markets
analyze_trends
compare_markets
research_brief
risk_scan

405
```

### ✅ 驗證點

- [ ] `/health` 回傳 5 個欄位，**不包含**任何 API key
- [ ] `tools/list` 回 5 個工具，與 stdio 一致
- [ ] `GET /api/mcp` 回 **405**（非 200、非 hang）
- [ ] `mcp:serve` 輸出出現在 stderr（stdout 留給協議訊息）

> 🚀 **實際部署**：`vercel --prod` 後，把 `http://localhost:8787` 換成 `https://ask-ching-agent.vercel.app`；
> Framework Preset 選 **`Other`**（詳見 `docs/deployment-vercel.md` §3）。

---

## 📋 結論 — Pass/Fail 記錄表

> 完整測試完 7 個 Station 後，填寫此表。任何 Fail 先查「失敗排查」，修復後重跑該 Station。

| Station | 內容 | 結果（✅ Pass / ❌ Fail） | 備註 |
|---|---:|---:|---|
| 0 | 準備（.env / install / Node） | | |
| 1 | 建置與測試紅綠燈（build / test / eval） | | |
| 2 | Fixture Demo（不需 API key） | | |
| 3 | Live Demo（真 Graph 資料） | | |
| 4 | Live Smoke（raw JSON 證據） | | |
| 5 | Grok Orchestrator（真 AI 推理） | | |
| 6 | MCP Server Smoke（stdio + HTTP） | | |
| 7 | Remote MCP（本機 HTTP / Vercel） | | |

**整體判定：** 全部 Pass → 可以進行錄影 / 提交（見 `docs/superpowers/specs/2026-09-09-pre-recording-checklist.md`）。任一 Fail → 停在該 Station，修復後重跑。

---

## 🔧 失敗排查（常見問題）

| # | 症狀 | 可能原因 | 解法 |
|---|---|---|---|
| 1 | `XAI_API_KEY` 缺失：Grok 回「missing API key」或 401 | `.env` 未複製或 key 空白 | `cp .env.example .env`，填入 `XAI_API_KEY`；確認終端機有 `--env-file=.env`（scripts 已內建） |
| 2 | `GRAPH_API_KEY` 401 / `fail-closed` | key 無效或過期，或 Demo 用到錯誤 key | 到 The Graph Studio 重新產生 key；確認 `.env` 的 `GRAPH_API_KEY` 是 **API key**，不是 subgraph ID；`pnpm live:smoke` 應出現 401 以外的回應 |
| 3 | `pnpm demo` 出現 live 數值 / 卡網路 | 環境變數 `DEMO_LIVE=1` 殘留 | 檢查 `echo $DEMO_LIVE` 與 `.env`；確認為 `0`，或直接跑 `pnpm demo`（script 內建 `DEMO_LIVE=0`） |
| 4 | `pnpm demo:live` 出現 `sha256:fixture-...` 標籤 | 環境誤入 fixture mode | 確認 `pnpm demo:live` 有將 `DEMO_LIVE=1` 傳入（script 內建）；fixture query hash 格式為 `sha256:fixture-...`，此字樣不應出現在 live 輸出 |
| 5 | Grok 回 `model not found` / 404 | `ASKCHING_LLM_MODEL` 無效 | 改為 `grok-4`（fallback），並**同步三處**：`.env`、`.env.example`、文件（`docs/engineering-spec.md` 等處若有提及） |
| 6 | Grok 不呼叫 tool，直接回答 / 回「I don't have the previous result」 | prompt 措辭或 stateless CLI 限制 | ① Demo B 類 follow-up 是 **stateless**，無法引用前一支 CLI 的 result —— 重新 query（見 `demos/prompts.md` Demo B 註解）② 加強 prompt 措辭，指名「live USDC supply APY」 |
| 7 | `pnpm mcp:smoke` timeout / FAIL | MCP server build 失敗或 dist 未產出 | `pnpm mcp:smoke` 內建 `pnpm -C packages/mcp-server build`，重跑一次；確認無 TS error |
| 8 | `pnpm test` 少於 26 tests | 環境污染 / 舊 build 殘留 | 重跑 `pnpm build` 後再 `pnpm test`；確認無 `node_modules/.cache` 干擾 |

---

## ⚡ 快速完成清單（10 分鐘 smoke 版）

> 時間緊迫時只跑這 5 站（不需 `XAI_API_KEY`，但 `GRAPH_API_KEY` 需先填好以備 Station 4）：

```bash
# Station 0（2 分鐘）
cp .env.example .env            # 填入 GRAPH_API_KEY（XAI_API_KEY 可留空）
pnpm install
node -v

# Station 1（2 分鐘）
pnpm build && pnpm test && pnpm eval

# Station 2（1 分鐘）— fixture brief
pnpm demo -- "Compare USDC supply APY across Aave V3, Compound V3, and Spark Lend"

# Station 4（1 分鐘）— live 證據鏈
pnpm live:smoke

# Station 6（1 分鐘）— MCP 證明（stdio + HTTP）
pnpm mcp:smoke && pnpm mcp:http:smoke
```

| Station | 檢查重點 |
|---|---|
| 0 | `.env` 存在、`pnpm install` exit 0、`node -v` ≥ 20 |
| 1 | `167 passed` + `23/23 evals` |
| 2 | `Mode: fixture`、三行 ranked（4.25 / 3.14 / 2.95）、asOf、三 subgraph ID |
| 4 | rows + sources 齊全、queryHash 三源相同、block 相近 |
| 6 | `mcp-smoke OK: askching (7 tools)` + `mcp-http-smoke OK` |
| 7 | `/health` 無 key、GET 回 405 |

✅ **快速版全 Pass = 核心功能（compare + cite + fan-out + MCP）已驗證。** 之後隨時可補跑 Station 3（live demo）與 Station 5（Grok 推理）做完整驗證。

---

## 🧭 未納入本旅程的功能

- **`risk_scan`（Demo C，第四個 MCP tool）** — 本旅程著重「比較 / 證據 / 歷史 / 跨平台」主路徑，未含 `risk_scan` 的 peer-relative spot-snapshot 驗證。要測試它，請用 `demos/prompts.md` 的 Demo C prompt，透過 MCP client（見 `docs/cross-platform.md`）或 `pnpm askching` 呼叫。預期輸出為 peer-relative spot signals + 明確的 time-series gap 聲明。
- **`analyze_markets`（Demo D/E）** — yield_opportunity / liquidity_stress / evidence_quality 三個 objective，見 `demos/prompts.md`。
- **`analyze_trends`（Demo F）** — 7d / 30d 趨勢，已由 Station 5 的延伸 prompt 覆蓋；完整驗證見 `demos/prompts.md` Demo F。

---

## �📚 相關文件

| 文件 | 用途 |
|---|---|
| `docs/engineering-spec.md` | 技術架構、API 契約、schema（§6b Demo CLI 規格） |
| `demos/prompts.md` | Demo A/B/C 三源 prompts 底稿 + locked sources |
| `docs/superpowers/specs/2026-09-09-pre-recording-checklist.md` | 錄影 / 提交前檢查清單 |
| `docs/superpowers/plans/2026-09-09-showcase-run-script.md` | 錄影逐字稿 + 畫面動作 |
| `docs/product-overview.md` | 產品概述 |
| `docs/cross-platform.md` | 跨平台（Windows / Linux）差異說明 |
| `docs/deployment-vercel.md` | 遠端部署（Vercel 設定、坑、驗証） |
| `docs/platform-integration.md` | 7+ 平台接入設定 |