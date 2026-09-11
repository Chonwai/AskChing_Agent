# AskChing — 獨立複核報告（2026-09-12）

> 目的: 針對先前幾輪產出的技術宣稱做獨立複核（因網路中斷可能導致品質下降）
> 方法: 每一個「檔案系統 / 官方文件 / 實際 API」能查到的事實都重跑一次，不採信 commit message
> 對應 Loop: `loop-verify-and-harden`

---

## 0. 結論摘要

| 類別 | 結果 |
|---|---|
| **真實 bug（已修）** | **3 個**：Vercel 函式匯出格式、輸出目錄落回 repo 根、`compound-v2` subgraph ID 錯字 |
| **錯誤宣稱（已修）** | **1 個重大**：「6 個 live 協議」實為 4 個；另有 3 份文件數字過時 |
| **重複真相來源（已消）** | 1 個：`loop.ts` 硬編碼協議 enum |
| 經過驗證為**正確**的宣稱 | 大部分（見 §4） |
| 最終 gate | build 3/3、test **175**、eval **23/23**、stdio/http smoke 各 5 tools、vercel:probe OK、**4/4 live 協議實測有數據** |

**一句話**：程式碼本體品質良好，但**外部宣稱（部署方式、協議數）有兩處嚴重不實**——而這兩處正好是評審與部署最會踩到的地方。

---

## 1. 複核方法

每一項都用可重現的證據，而非閱讀程式碼：

| 複核標的 | 手段 |
|---|---|
| Vercel 部署正確性 | 讀 Vercel 官方 Functions API Reference / Node.js runtime 文件，逐條比對我們的檔案 |
| 協議可用性 | 下載 Messari 官方 `deployment/deployment.json`（375KB）比對 ID；再用 `GraphGatewayClient` 打真實 gateway |
| 工具面一致性 | 載入編譯後模組，讀出實際 JSON schema |
| 測試真實性 | 跑 `pnpm test` / `pnpm eval`，並檢視斷言內容 |
| 文件準確性 | `grep` 全部文件找過時數字，逐一比對實際值 |

---

## 2. 修正的三個真實 bug

### 2.1 `/api` 函式匯出格式（會導致請求 hang）

**Vercel 官方要求**（Functions API Reference）：

```ts
// ✅ 唯一被承認的 Web Standard 形式
export default { fetch(request: Request) { return new Response("...") } }
// 或 export function GET/POST(request) { ... }
```

**我們原本寫的**：`export default handler`（裸的 `(request) => Response`）。

**後果**：Vercel 兩者都不認得時，會退回把檔案當成 **Node.js `(req, res)` handler**——那條路徑靠呼叫 `res.end()` 結束回應。我們的 handler 只「回傳」`Response`，**永遠不會呼叫 `res.end()`**，所以請求會掛到 function 逾時。

**症狀**：本地 `pnpm vercel:probe` 全綠、部署後每個 MCP 請求都 timeout。這正是「本地測試過、上線壞掉」的典型。

**修正**：兩個入口改用 `export default { fetch }` 物件形式，並加 `export const config = { runtime: "nodejs", maxDuration: 60 }`。

### 2.2 輸出目錄落回 repo 根目錄（會公開整個 repo）

**Vercel 官方文件**（Configuring a Build）：

> 「Choose "Other" as the Framework Preset. This sets the output directory as `public` if it exists or **`.`（root directory of the project）otherwise**」

我們**沒有 `public/` 目錄** → 輸出目錄 = repo 根 → 所有未被 gitignore 的檔案都會被當靜態檔公開（`docs/`、`package.json`、整個原始碼樹）。

**修正**：新增 `public/index.html`（同時是 demo landing page）並在 `vercel.json` 明寫 `outputDirectory: "public"`。

### 2.3 `compound-v2` subgraph ID 錯字

```
我們原本：4TbqVA8p2DoBd5qDbPMwmDZv3CsJjWtxo8nVSqF2tA9a9a   ← 尾巴多一個 "9a"
官方實值：4TbqVA8p2DoBd5qDbPMwmDZv3CsJjWtxo8nVSqF2tA9a
```

Gateway 直接回 `invalid subgraph ID`。來源：Messari 官方 `deployment.json`。

---

## 3. 修正的錯誤宣稱：「6 個 live 協議」實為 4 個

### 3.1 證據

用**伺服器同一條程式碼路徑**（`GraphGatewayClient.getMarketObservation`）實測 13 筆註冊項：

```
LIVE OK  aave-v3      supply_apy=3.554%@25955910  utilization=91.85%
LIVE OK  compound-v3  supply_apy=4.249%@25955910  utilization=90.32%
LIVE OK  spark-lend   supply_apy=3.542%@25955910  utilization=92.21%
LIVE OK  aave-v2      supply_apy=0.502%@25955910  utilization=30.08%
notlive  uwu-lend     No USDC market found
notlive  zerolend     No USDC market found
notlive  aave-amm     No USDC market found
notlive+ aave-arc     supply_apy=0%   ← 可查但 0% APY、TVL ~$57k
notlive+ aave-rwa     supply_apy=0%   ← 可查但 0% APY、TVL ~$4.4k
notlive  compound-v2  Market has no field indexLastUpdatedTimestamp
notlive  rari-fuse    同上
notlive  makerdao     同上
notlive  euler        同上
```

**根因**（直接查 subgraph 原始資料）：
- `uwu-lend` mainnet 市場是 `sifu` / `sDAI` / `sSPELL` / `USDT` / `DUMMY` —— **完全沒有 USDC**
- `zerolend` mainnet 全部市場 `isActive: false`、`totalValueLockedUSD: 0` —— 實質已死（它活在別的鏈）

### 3.2 為何這是嚴重的

`MARKET_FIXTURES` 裡有 `uwu-lend USDC 4.10%` 與 `zerolend USDC 3.72%` 兩筆 fixture。也就是：

> **fixture 模式會回傳 live 模式永遠不可能產生的數字。**

而我們的**核心賣點就是「信得過」**。一個評審只要跑一次 live 就會發現 6 個協議裡有 2 個是空的。這比少兩個協議傷害大得多。

### 3.3 修正

| 動作 | 內容 |
|---|---|
| 註冊表 | `uwu-lend` / `zerolend` → `live: false` + 精確 `note`；新增 `aave-amm/arc/rwa` 為 `live:false` 並記錄原因（避免重複調查） |
| Fixture | 刪除兩筆造假的 USDC 記錄 |
| **新不變量測試** | `fixture-live-consistency.test.ts`：fixture 只能用註冊且 live 的協議；每個 live 協議必須有 USDC + supply_apy fixture |
| **新不變量測試** | 每個非 live 條目必須有 `note`（>20 字）且 live 條目不得有 |
| Eval | `compare-six-protocol` → `compare-four-protocol`（真實集合） |
| SKILL.md | 移除「six live protocols」，並在契約測試中斷言該字串不存在 |
| **新工具** | `pnpm probe:protocols`：用伺服器同一路徑驗證，只對 live 條目判定成敗 |
| 硬編碼 enum | `loop.ts` 的 `LIVE_PROTOCOL_ENUM` 改為 spread `LIVE_PROTOCOLS`（單一真相來源） |

> 💡 **意外的正面結果**：修正後協議數仍是「4 + demo 用 3 個」，但**每一個都經過實測**。這比「宣稱 6 個但 2 個是空的」強得多——我們現在可以說「4 個全部驗證過」。

---

## 4. 經過驗證為正確的宣稱（無需修改）

| 宣稱 | 驗證方式 | 結果 |
|---|---|---|
| `register.ts` 是工具面單一真相來源 | 載入模組讀 descriptor | ✅ stdio 與 HTTP 完全一致 |
| stateless transport 正確 | 12 路併發實測 | ✅ 無跨請求污染 |
| GET/DELETE 回 405 | 實測 | ✅ 且無 open SSE 路徑 |
| `/api/health` 不洩漏憑證 | 實測回傳 5 欄位 | ✅ 無 key |
| GraphQL 無字串插值 | 讀 graph-client | ✅ 固定查詢常數 |
| fail-closed 由 schema 強制 | 讀 schema | ✅ `.min(2)` |
| `analyze_trends` 統計為真實回歸 | 讀 `computeTrendStats` | ✅ 最小平方 + 母體標準差 |
| 官方 Messari schema 3.1.0 有 `MarketDailySnapshot` | 官方 repo | ✅ |
| `grok-4.6` 為現行 model | xAI 官方文件 | ✅ |
| Grok Bot 支援 connectors/MCP | xAI 官方文件 | ✅ |
| Gemini CLI 支援 `httpUrl` | Gemini CLI 文件 | ✅（且已由 Antigravity CLI 取代免費層） |

---

## 5. 文件準確性修正

| 文件 | 問題 | 處置 |
|---|---|---|
| `walkthrough.md` | 操作文件卻寫著 `75 passed`/`16/16 evals`/`3 tools`/`26 passed` | 全數更正為 175/23/5 tools，新增 Station 7（遠端 MCP） |
| `cross-platform.md` | 「斷言 3 個 tool」 | → 5 |
| `engineering-spec.md` | 狀態區塊停在 3 tools、88% | 加入過時聲明 + 現行事實 |
| `product-overview.md` | §5.1 架構圖只列 3 tools | 加入過時聲明 + 現行事實 |
| `README.md` ×2 | 「Six protocols are live today」 | → Four，並註明已驗證 |
| `improvement-blueprint.md` §1 | 整個立論基於錯誤的「6 協議」基線 | 重寫；加入「已排除的 7 個候選」表，並指出**最高投報率其實是換鏈**（27 個 Ethereum lending 部署已檢查完，Base/Arbitrum/Polygon 尚未） |
| `deployment-vercel.md` | 未答 Framework Preset；宣稱本地 probe 可證部署正確 | 新增 §3 完整設定對照表；把 probe 的宣稱降級為「只驗簽名與邏輯」 |

---

## 6. 仍未解決 / 建議後續

| # | 項目 | 嚴重度 | 說明 |
|---|---|---|---|
| 1 | **未實際部署到 Vercel** | 🟡 | 兩個已修 bug 都是「部署後才會顯現」的類型，但仍有殘餘風險：pnpm workspace 的 `@askching/shared` 在 Vercel bundle 中能否解析，只有部署後打 `/api/health` 才能確認。文件已明示 |
| 2 | 跨鏈覆蓋 | 🟡 | 最高價值的擴展方向（Base/Arbitrum/Polygon），但需先把字面型別 `network: "mainnet"` 放寬 |
| 3 | `risk_scan` 缺 `outputSchema` | 🟢 | 五個工具中唯一沒有結構化輸出契約 |
| 4 | 遠端 `isError` 丟失 `structuredContent` | 🟡 | 錯誤時整個結構化輸出（含 gaps）消失，只剩一句文字 |
| 5 | `lastGaps` 共享可變狀態 | 🟡 | 現行單次呼叫正確，未來 multi-call 工具會脆弱 |
| 6 | endpoint 公開無認證 | 🟡 | 刻意的 demo 取捨；上架 registry 前必須加護欄 |

---

## 7. 最終驗證輸出

```
build            3/3 packages Done
test             175 passed (17 files)
eval             23/23
mcp:smoke        askching (5 tools)
mcp:http:smoke   askching (5 tools, transport=streamable-http, findings=3)
vercel:probe     export shape OK / config OK / initialize OK / tools/list OK /
                 tools/call OK / health OK
probe:protocols  4/4 live protocols returned data
```

工作區乾淨（除 `.edison/` 內部狀態）。
