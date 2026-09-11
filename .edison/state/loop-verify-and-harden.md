# Loop State: verify-and-harden（驗證先前產出 + 修正 Vercel 部署坑 + 落實改善）

## Goal（Done Contract）

1. **驗證**：獨立複核前幾輪產出的所有技術宣稱（部署、平台、協議數、改善藍圖），找出錯誤
2. **修正 Vercel 部署**：解決真實的「坑」，特別是 `/api` 函式匯出格式
3. **回答部署策略**：Framework Preset 該選什麼、Node 專案如何設定
4. **落實改善**：依藍圖實作可完成的項目
5. **多次小步 commit**（hackathon 風格）

- **Quality Mode**: strict (threshold 93)
- **Depth Level**: L3 Deep Dive
- **約束**：不破壞既有 gate（build/test/eval/兩個 smoke/probe）；每個 commit 必須小而完整

## Stage Round Counters

| Stage | Round | Max (Stop Rule) | Status |
|---|---|---|---|
| DISCOVER（Vercel 非 Next.js 部署規格） | 1 | 2 | active |
| VERIFY（複核先前宣稱） | 1 | 2 | active |
| EXECUTE（修正 + 改善） | 0 | 2 | pending |

## Iteration 0 - 重大發現（Vercel 部署坑）

**Vercel Functions API Reference 明確規定** `framework: other` 的檔案的匯出格式：

```ts
// ✅ 官方文件形式（Web Standard）
export default { fetch(request: Request) { return new Response('...') } }
// 或
export function GET(request: Request) { ... }

// ❌ 我們目前的寫法
export default handler   // 裸函式 (request) => Promise<Response>
```

**風險**：裸函式可能被 Vercel 判定為 Node.js `(req, res)` handler（`VercelRequest`/`VercelResponse`），
導致 `res.end()` 從未被呼叫 → 請求 hang 到 timeout。這是使用者擔心的「坑」，且是**真實存在的**。

**其他確認的官方要求**：
- 非框架專案必須有 `"type": "module"` 或使用 `.mjs` ✅（我們已有 `"type": "module"`）
- 可用 `export const config = { runtime: 'nodejs', maxDuration: N }` 做 per-function 設定
- `maxDuration` 也可在 `vercel.json` 的 `functions` 區塊設定 ✅（我們已設）

## Circuit Breaker

- Consecutive fails: 0/3
- Budget used: 60%
- Status: COMPLETE

## Iterations

### Iteration 0 - VERIFY（複核先前宣稱）

方法：每個可用檔案系統／官方文件／真實 API 查證的事實都重跑，不採信 commit message。

**發現 3 個真實 bug**：
1. `/api` 函式匯出格式錯誤（`export default handler` 而非 `export default { fetch }`）→ 部署後請求會 hang 到 timeout
2. 無 `public/` → Vercel 的 `Other` preset 把輸出目錄設為 repo 根 → 整個 repo 被當靜態檔公開
3. `compound-v2` subgraph ID 尾巴多 `9a` → gateway 回 `invalid subgraph ID`

**發現 1 個重大錯誤宣稱**：「6 個 live 協議」實為 4 個
- `uwu-lend`：mainnet 市場是 sifu/sDAI/sSPELL/USDT，**沒有 USDC**
- `zerolend`：mainnet 全市場 `isActive:false`、TVL 0
- 且 `MARKET_FIXTURES` 有兩筆造假的 USDC 記錄 → **fixture 回傳 live 永遠無法產生的數字**
- 這直接傷害核心賣點「信得過」

**發現 1 個重複真相來源**：`loop.ts` 硬編碼協議 enum，仍含已下架兩個

### Iteration 1 - EXECUTE（8 commits）

| # | Commit | 內容 |
|---|---|---|
| 1 | `b7e199f` | fix(deploy): Vercel fetch Web Standard 匯出格式 + 探針斷言 |
| 2 | `00d7873` | fix(deploy): 釘住輸出目錄 + `public/index.html` landing page |
| 3 | `670117c` | docs: 回答 Vercel 專案設定問題（Framework Preset = Other） |
| 4 | `eb13503` | docs: 修正 walkthrough 等過時數字與工具清單 |
| 5 | `ad339e8` | **fix(shared): 修正 live 協議宣稱 + fixture + 兩個新不變量測試** |
| 6 | `7f83cb7` | docs: 同步所有協議數宣稱 |
| 7 | `34cc44c` | fix(orchestrator): enum 改為從註冊表衍生 |
| 8 | `0a08721` | docs: 複核報告 |

### 最終驗證

```
build            3/3 Done
test             175 passed (17 files)   ← 原 167，+8（新不變量）
eval             23/23
mcp:smoke        5 tools
mcp:http:smoke   5 tools, findings=3
vercel:probe     export shape OK / config OK / 握手 OK
probe:protocols  4/4 live protocols returned data
```

## 結論

**PASS** — 先前內容大體正確，但**外部宣稱有兩處嚴重不實**（部署方式、協議數），且這兩處正是評審與部署最會踩到的。全部已修正並加上防回歸的不變量測試。

**新增的防護（無法再回歸）**：
- `requireFetchExport()`：`/api` 必須是 `export default { fetch }`
- outputDirectory + `public/` 必須存在
- 非 live 條目必須有 `note`；live 條目不得有
- fixture 只能用註冊且 live 的協議；每個 live 協議必須有 USDC + supply_apy fixture
- tool enum 必須等於 `LIVE_PROTOCOLS`

**殘留風險**（誠實標記）：
1. **仍未實際部署** → workspace 模組解析只有部署後打 `/api/health` 才能確認
2. 跨鏈覆蓋是最高價值的擴展方向，但需先放寬字面型別 `network: "mainnet"`
3. 遠端 `isError` 丟失 `structuredContent`（含 gaps）
4. endpoint 公開無認證（刻意，上架 registry 前需護欄）
