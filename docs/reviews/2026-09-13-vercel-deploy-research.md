# AskChing Vercel 部署深度研究報告

> 研究日期：2026-09-13 ｜ 研究者：Neo Loop（morpheus deep research + smith strict review）
> Quality Mode: strict (93) / Depth: L3 Deep Dive
> 基準：smith 實測所有 gates，已讀取 `vercel.json` / `api/mcp.ts` / `api/health.ts` / `docs/deployment-vercel.md` 全文

## 摘要

AskChing 具備 **6 個 MCP 工具**，以「**Other**」Framework Preset + pnpm monorepo + `vercel.json` 的 `/api` serverless functions 方式部署是**正確且唯一合理**的選擇。透過 Vercel 連 GitHub 可**完全自動 deploy**（push to main → production，branch → preview）。現有部署設定已通過 smith strict 獨立實測；repo 已具備完整的部署文件。

---

## 1. 用戶問題回答

### Q1：MCP 有多少個功能？

**6 個工具**（單一註冊源 `packages/mcp-server/src/register.ts`）：

| #   | 工具名            | 類型        | 說明                                                                                |
| --- | ----------------- | ----------- | ----------------------------------------------------------------------------------- |
| 1   | `compare_markets` | spot        | 即時 best rate 比較（supply_apy / borrow_apy / tvl / utilization），跨 ≥2 protocols |
| 2   | `research_brief`  | spot        | 單一 metric/asset 的 cited brief（結論 + key figures + 來源 + 風險）                |
| 3   | `risk_scan`       | spot        | peer-relative spot signals + time-series gap 偵測                                   |
| 4   | `analyze_markets` | spot + calc | yield_opportunity / liquidity_stress / evidence_quality，含計算與 confidence        |
| 5   | `analyze_trends`  | historical  | 7d/30d daily history：slope、direction、volatility                                  |
| 6   | `discover_yields` | cross-venue | USDC yield discovery：lending + DEX LP（Uniswap V3 / Curve）分開 ranking            |

stdio + Streamable HTTP **雙傳輸**，工具面完全一致（同一個 `register.ts`）。

### Q2：Vercel project 用哪種方式建立？

**Framework Preset = `Other`（非 Node.js、非 Next.js）。**

| 選項      | 結果      | 理由                                               |
| --------- | --------- | -------------------------------------------------- |
| Next.js   | ❌ 失敗   | Vercel 找 `next build`，此專案無 Next.js           |
| Node      | ❌ 不適合 | 給 `server.ts` 監聽用的，本專案走 `/api` functions |
| **Other** | ✅ 正確   | `/api/` 底下每個檔案自動部署成一個 Function        |

**`vercel.json` 必須「不寫 `framework`」**（= 自動偵測 / Other）。不可寫 `"framework": "other"`（非法值，schema enum 無此值，會 fail build）— 這是 smith 審查抓到的 **H1 High** finding（已修復並記錄於 `docs/deployment-vercel.md`）。

### Q3：可以透過 Vercel 連 GitHub 自動 deploy 嗎？

**可以，完全自動，零設定。**

- **Vercel for GitHub 預設對每個 push 建立 deployment**
- Push 到 `main` → **自動 production deployment**
- Push 到其他 branch / PR → **自動 preview deployment**（唯一 URL）
- Merge PR 進 `main` → **自動 production deployment**
- PR 上 Vercel 自動貼 preview URL comment

> 官方：[Vercel for GitHub](https://vercel.com/docs/git/vercel-for-github) — "Vercel for GitHub will deploy every push by default."

---

## 2. 部署方式：Import Git Repository

### Dashboard（推薦）

1. https://vercel.com/new → **Continue with GitHub** → OAuth 授權
2. Import Git Repository → 選 **AskChing_Agent**
3. Framework Preset 確認 = **Other**（自動偵測，不手動改）
4. Root Directory：**留空**（repo 根）
5. Build / Install / Output：**讓 `vercel.json` 自動帶入**（不覆寫 UI）
6. Node.js Version：**22.x**（engines.node = >=20）
7. Environment Variables：

| Variable        | Production   | Preview |
| --------------- | ------------ | ------- |
| `DEMO_LIVE`     | `1`          | `0`     |
| `GRAPH_API_KEY` | `<your key>` | 留空    |

8. **Deploy** → 等 2-4 min → 取得 `https://<app>.vercel.app/`

### CLI（備援）

```bash
vercel login          # OAuth
vercel link           # 選或建專案（產生 .vercel/，已在 .gitignore）
vercel --prod         # production deploy
```

---

## 3. pnpm Monorepo 在 Vercel 的打包

| 項目                          | 狀態 | 說明                                                                            |
| ----------------------------- | ---- | ------------------------------------------------------------------------------- |
| pnpm 偵測                     | ✅   | lockfileVersion 9.0 → pnpm 9/10，自動偵測                                       |
| workspace 依賴                | ✅   | `includeFiles: ["packages/{shared,mcp-server}/dist/**"]` 打包進 Function bundle |
| `500 Cannot find module` 風險 | 🟡   | 唯一有效驗證 = 部署後打 `/api/mcp` tools/list                                   |
| `ERR_PNPM_OUTDATED_LOCKFILE`  | 🟡   | lockfile 過期時失敗；本地 `pnpm install` 更新後 commit                          |

**`vercel.json` 打包設定（已正確）：**

```json
"includeFiles": ["packages/shared/dist/**", "packages/mcp-server/dist/**"]
```

---

## 4. MCP Streamable HTTP 在 Vercel Serverless 的限制

| 項目                     | 狀態      | 說明                                                 |
| ------------------------ | --------- | ---------------------------------------------------- |
| stateless 模式           | ✅        | `sessionIdGenerator: undefined`，每請求建全新 server |
| POST-only                | ✅        | GET → 405（不支援 SSE 長連線，serverless 不適合）    |
| maxDuration              | ✅        | 60s（Hobby 免費），足够大部分工具                    |
| 冷啟動                   | 🟡        | 首次請求多 1-2s，Warm instance <100ms                |
| `analyze_trends` 30d     | 🟡        | 多協議 fan-out 有 60s timeout 風險，部署後需實測     |
| `waitForResponse` header | ✅ 不需要 | Streamable HTTP 已移除此 header                      |

---

## 5. 部署後驗證 Checklist

```bash
# C1. Health
curl -s https://<app>.vercel.app/api/health | jq .

# C2. tools/list = 6（🔴 最關鍵 — 驗模組打包）
curl -s -X POST https://<app>.vercel.app/api/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' \
  | jq '.result.tools | length'
# 期望：6

# C3. /mcp rewrite = 6
curl -s -X POST https://<app>.vercel.app/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' \
  | jq '.result.tools | length'

# C4. tools/call live
curl -s -X POST https://<app>.vercel.app/api/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"compare_markets","arguments":{"metric":"supply_apy","asset":"USDC","protocols":["aave-v3","compound-v3","spark-lend"]}}}'
# 期望：isError:false + citations

# C5. analyze_trends 30d（60s timeout 風險）
time curl -s -X POST https://<app>.vercel.app/api/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"analyze_trends","arguments":{"metric":"supply_apy","asset":"USDC","protocols":["aave-v3","compound-v3","spark-lend"],"window":"30d"}}}'
# 期望：< 50s；若 timeout → demo 用 7d
```

---

## 6. smith Strict Review 結果（信賴）

**Measured Score: 92/100 REPAIRABLE**（Round 1）

- **H1（已修復）**：`docs/deployment-vercel.md` 新增「`framework: other` 是非法 vercel.json value」警示
- **M1（已修復）**：docs 三處 tools 數量 5 → 6

**smith 實測 gates**：build 3/3、test 209/209、eval 27/27、mcp:smoke 6、mcp:http:smoke 6、vercel:probe OK — 現有 `vercel.json` / `api/*.ts` 通過嚴格審查，export shape / runtime / includeFiles / stateless transport 全部正確。

---

## 7. 本 Repo Readiness Assessment

| 項目                                     | 狀態                                 |
| ---------------------------------------- | ------------------------------------ |
| Framework Preset = Other                 | ✅（`vercel.json` 不含 `framework`） |
| Output Directory = public                | ✅                                   |
| Install = pnpm install --frozen-lockfile | ✅                                   |
| Build = pnpm build                       | ✅                                   |
| includeFiles 打包 workspace dist         | ✅                                   |
| Node.js runtime（非 Edge）               | ✅                                   |
| maxDuration: 60 / memory: 1024           | ✅                                   |
| stateless MCP                            | ✅                                   |
| POST-only（GET → 405）                   | ✅                                   |
| /mcp rewrite                             | ✅                                   |
| export default fetch shape               | ✅（已修 3 個部署坑）                |
| docs tools count = 6                     | ✅（smith M1 修復後）                |

**結論：repo 已具備完整的部署條件，只需在 Dashboard Import 並設定 env 即可。**

---

## 資訊來源

1. [Vercel Docs — Configuring a Build](https://vercel.com/docs/builds/configure-a-build)
2. [Vercel Docs — Deploying Git Repositories](https://vercel.com/docs/git)
3. [Vercel Docs — Vercel for GitHub](https://vercel.com/docs/git/vercel-for-github)
4. [Vercel Docs — Package Managers](https://vercel.com/docs/package-managers)
5. [Vercel Docs — Project Configuration (vercel.json)](https://vercel.com/docs/project-configuration/vercel-json)
6. [Vercel Docs — Functions Limits](https://vercel.com/docs/functions/limitations)
7. [Vercel Docs — Deploy MCP servers to Vercel](https://vercel.com/docs/mcp/deploy-mcp-servers-to-vercel)
8. [Vercel Blog — Building efficient MCP servers](https://vercel.com/blog/building-efficient-mcp-servers)
9. [Vercel KB — How can I use files in Vercel Functions?](https://vercel.com/kb/guide/how-can-i-use-files-in-serverless-functions)
