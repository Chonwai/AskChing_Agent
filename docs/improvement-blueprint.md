# AskChing — 改善藍圖（下一步該做什麼）

> 建立日期: 2026-09-12｜對應 Loop: `loop-vercel-mcp-deployment`
> 目的: 盤點剩餘可改善項目，依「對 The Graph 獎項的價值 × 可行性」排序
> 前提: 已有 5 個 MCP tools（compare / research_brief / risk_scan / analyze_markets / analyze_trends）+ stdio 與遠端 HTTP 雙傳輸

---

## 0. 現況一句話

AskChing 已經**功能完整、證據鏈嚴格、可跨平台部署**。剩下的改善分兩類：

- **A 類「敘事/覆蓋面」**：讓我們在評審眼中更接近 The Graph 官方 showcase 的規模 → 多為低成本
- **B 類「分析深度」**：讓輸出更像研究員要的東西 → 高價值但要時間

以下按「**投報率**」排序，不是按類別。

---

## 1. 🥇 最高投報率：擴大協議覆蓋（低成本、高敘事價值）

**現況**：`LIVE_SOURCES` 已有 **6 個 live 協議**（aave-v3 / compound-v3 / spark-lend / aave-v2 / uwu-lend / zerolend）。`PROTOCOL_REGISTRY` 另有 4 筆（compound-v2 / rari-fuse / makerdao / euler）因 **schemaVersion 非 3.1.0** 而仍 `live: false`。
**對手**：The Graph 官方 showcase 的 `graph-lending-mcp` 覆蓋 90 個 deployments × 15 條鏈，官方 blog 專門寫了一篇。

**為什麼這仍然划算**：
- `GET_MARKETS_QUERY` / `GET_MARKET_HISTORY_QUERY` 是**單一固定查詢**，asset / metric 都在程式碼層過濾（**非字串插值**）→ 新增同 schema 的協議**確實不需要新的查詢邏輯**
- 變更範圍確實集中在 `packages/shared/src/source-config.ts`（`ProtocolSlug` 是開放字串 `z.string().min(1)`，`schemas.ts` 不用改）

**但「只要加 subgraph ID」有兩個硬約束（實測驗證，非估計）**：

| 約束 | 證據 | 影響 |
|---|---|---|
| 必須是 Messari **3.1.0** lending schema | `source-config.test.ts:21` 斷言 `schemaVersion === "3.1.0"` | 可擴充範圍被鎖定在這個 schema family，不是「所有協議」 |
| `network` 目前是 **字面型別 mainnet** | `source-config.ts:6` | 跨鏈覆蓋需要改型別（＝改程式碼路徑） |

> ⚠️ **佐證**：既有 4 筆非 3.1.0 條目標註「需欄位級驗證後再啟用」且至今仍 `live: false`——**10 個 ID 只活 6 個**，直接否證「加 ID 就等於覆蓋」。
>
> 📌 **因此真實剩餘空間是 6 → 10+（不是 3 → 10+）**，且每筆都要先通過 schemaVersion 3.1.0 + 欄位級 live 驗證。

| 動作 | 檔案 | 預估 | 風險 |
|---|---|---|---|
| 逐一驗證既有 4 筆非 3.1.0 協議（compound-v2 / rari-fuse / makerdao / euler）可否升級 | 無（先讀 schema） | 60–90 分 | 中（可能全不相容） |
| 加入 3.1.0-schema 協議（Morpho、Venus、Radiant 等，需先確認部署確為 3.1.0） | `packages/shared/src/source-config.ts` | 30–60 分／筆 | 中（須逐筆 live 驗證） |
| 加 fixture 覆蓋 | `packages/shared/src/fixtures.ts` | 30 分 | 低 |
| 更新 eval case（多協議排名） | `evals/cases.json` | 20 分 | 低 |
| 文件更新（實際 live 協議數） | `README.md`、`SKILL.md` | 15 分 | 低 |

**建議做法**：一次只加 1–2 筆，每筆都跑 `pnpm live:smoke` 確認真的回得到資料才 commit。

> ⚠️ **務必誠實**：只加「實際查得到、schema 相容」的協議。加進去但查不到會產生一堆 explicit gaps，反而扣分。**用 `pnpm live:smoke` 逐一驗證後才加。**

---

## 2. 🥈 Agent 經濟對齊：Agent0 / ERC-8004（不需付款）

**用戶已排除 x402**（agent 自主付費），但 **Agent0 / ERC-8004 完全不需要付款**——只要 Graph API key。

**為什麼值得**：
- The Graph 官方 blog 說 Agent0 Subgraphs 是「**the first piece of dedicated agent infrastructure on The Graph**」
- 這是 2026 年 The Graph 最用力推的方向
- 我們可以成為「**研究 agent 經濟的 agent**」——用同一套 evidence-first 方法論

| 動作 | 檔案 | 預估 | 價值 |
|---|---|---|---|
| 研究 Agent0 subgraph schema 與 endpoint | `docs/reviews/` | 45 分 | 必要性驗證 |
| 新增 `agent_registry` 查詢能力（agent identity / reputation / capabilities） | `packages/shared/src/agent-registry.ts`（新） | 3–4 小時 | 🔥🔥🔥 |
| 新 tool：`analyze_agent_economy`（agent 數量/能力/聲譽趨勢） | `packages/mcp-server/src/tools.ts` | 2–3 小時 | 🔥🔥🔥 |

**若時間不足的降級方案**：只在 README / ETHGlobal copy 的 roadmap 明確寫出「同一套 evidence-first 方法論可延伸到 ERC-8004 agent registry」——**零成本，但要誠實標為 roadmap**。

---

## 3. 🥉 分析深度：讓輸出更像研究員要的

目前 `analyze_markets` 有 yield / liquidity / evidence quality；`analyze_trends` 有 change / slope / direction / volatility。以下是研究員會想要的**下一批**指標：

| 指標 | 說明 | 價值 | 預估 |
|---|---|---|---|
| **Peer percentile** | 「Aave 的 utilization 在 10 個協議中排第 92 百分位」 | 🔥🔥 | 2 小時 |
| **Liquidation proximity** | 用 `liquidationThreshold` + 當前 LTV 估距離清算多遠 | 🔥🔥🔥 | 3–4 小時（需新 query 欄位） |
| **Cross-protocol flow** | 由 `dailyDepositUSD` / `dailyWithdrawUSD` 推斷資金流向 | 🔥🔥 | 2–3 小時 |
| **Rate dispersion / 利差結構** | 同一資產在不同協議的 spread 隨時間變化 | 🔥🔥 | 1–2 小時（`analyze_trends` 延伸） |
| **Borrow-side 分析** | 目前 `borrow_apy` 有趨勢但缺專屬 objective | 🔥 | 2 小時 |
| **Governance 摘要** | The Graph 官方列為 AI 案例之一（summarize DAO proposals） | 🔥 | 高（需新 schema） |

**建議順序**：Rate dispersion（最容易，直接延伸既有 trend 引擎）→ Peer percentile（純計算）→ Cross-protocol flow → Liquidation proximity。

---

## 4. 產品化：讓評審「找得到、用得著」

| 動作 | 說明 | 預估 | 價值 |
|---|---|---|---|
| **發佈到 npm** | `@askching/mcp-server` 已在 `package.json` 備好 `files: ["dist"]`、`prepack`。發佈後可用 `npx -y @askching/mcp-server` | 30 分 | 🔥🔥 |
| **提交到 MCP registry / 清單** | Smithery、`awesome-mcp-servers`、`modelcontextprotocol/servers` | 1 小時 | 🔥🔥🔥（評審可自己裝） |

> ⚠️ **§4 註：提交到公開清單前必須先加護欄。** 目前 endpoint 公開、無認證、無限流，後面是**計費的** Graph API key。demo 階段公開是刻意的（評審可直接連），但一旦列到 registry，曝光就從「demo 便利」變成「長期無人監管」。最小可行護欄（任一即可）：單一 bearer token 檢查（`Authorization` header，MCP client 都支援）、或 Vercel Firewall rate limit、或改用低配額專用 key。| **官網 landing page** | Vercel 上放一頁展示 5 個工具 + 一行接入 + live demo 連結 | 2–3 小時 | 🔥🔥 |
| **OAuth 保護 endpoint** | MCP SDK `withMcpAuth` + RFC 9728 metadata | 2–3 小時 | P2（demo 不需） |
| **Rate limit** | Vercel Firewall 或 in-handler token bucket | 1 小時 | P2 |

> 💡 **`npx` 一行接入**是很有力的 demo 畫面：評審看到「真的有人可以直接用」比看 GitHub 更震撼。
> ⚠️ 發佈 `shared` 必須先於 `mcp-server`（`workspace:*` 相依），流程見 `docs/cross-platform.md` §7。

---

## 5. 品質與強健性（技術債）

| 項目 | 現況 | 建議 | 嚴重度 |
|---|---|---|---|
| `lastGaps` 共享可變狀態 | live data source 上的陣列，每次 fetch 清空 | 改為回傳 `{ observations, gaps }` 而非副作用 | 🟡 Medium（現行單次呼叫正確） |
| Fixture 歷史只覆蓋 2 metrics | `MARKET_HISTORY_FIXTURES` 只有 supply_apy + utilization | 補 borrow_apy / tvl，讓 eval 涵蓋全部 trend 路徑 | 🟡 Medium |
| `flat` 判定用相對帶（0.5%） | 已文件化，但可能與直覺不符 | 加入絕對帶選項或文件更醒目 | 🟢 Low |
| 無負載測試 | 未測併發 | remote HTTP 上線後測 50 併發 | 🟢 Low（serverless 自動擴展） |
| HTTP 回應無快取 | 每次查 Graph | 可加短 TTL（如 60s）降低延遲與配額消耗 | 🟢 Low（但 demo 有感） |
| `risk_scan` 未註冊 `outputSchema` | `register.ts` 中其餘 4 個 tool 都有，只有它沒有 | 補上讓 5 個 tool 的結構化輸出契約一致 | 🟢 Low（**非本次引入**，重構前即如此，經 diff 確認） |
| 遠端錯誤路徑丟失 `structuredContent` | MCP `isError: true` 時整個結構化輸出（含 `gaps`）消失，只留一句文字 | 讓工具錯誤仍帶 `structuredContent.gaps`（保留 fail-closed 但恢復可診斷性） | 🟡 Medium（已改為文件說明實際症狀，根治留待後續） |

---

## 6. 明確不建議現在做

| 項目 | 原因 |
|---|---|
| x402 付費 | 用戶已判定時間不足；且需要 wallet 基礎設施 |
| Substreams pipeline | 需自建索引與儲存層；官方明說「agent 按需查詢用 Subgraphs 就對」 |
| GRC-20 輸出 | SDK 成熟度未知，時間風險高；列 roadmap 即可 |
| 自建 UI / Dashboard | 官方明確 out of scope；CLI + MCP 才是差異化 |
| 更多 metrics 但無 fixture | 會擴大無測試覆蓋的面積 |

---

## 7. 建議執行順序（剩餘時間）

```
Day 1（今天）
  ├─ ✅ 遠端 MCP + Vercel 部署（已完成）
  ├─ ○ 診斷既有 4 筆非 3.1.0 協議（§1）← 先搞清為何 10 個 ID 只活 6 個
  └─ ○ README / ETHGlobal copy 更新（反映 remote MCP + 實際協議數）

Day 2
  ├─ ○ 逐筆新增 3.1.0-schema 協議（每筆 live:smoke 驗證後才 commit）
  ├─ ○ Rate dispersion 分析（§3，最容易的深度延伸）
  ├─ ○ npm 發佈（§4）
  └─ ○ Demo 錄影（隊友負責）

Day 3（buffer）
  ├─ ○ 提交到 MCP registry（§4）——**先加認證護欄**（見 §4 註）
  └─ ○ 最終提交
```

---

## 8. 一頁決策摘要

| 問題 | 答案 |
|---|---|
| 系統夠強嗎？ | **功能面夠**（5 tools、雙傳輸、嚴格證據鏈、可跨平台）。**規模面不夠**（6 個 live 協議、單鏈 vs 對手 90 deployments、15 鏈）。 |
| 最該做的下一件事？ | **擴大協議覆蓋**（§1）——但真實空間是 6 → 10+，且每筆要過 schemaVersion 3.1.0 檢查。先驗既有 4 筆的死因，再逐筆加新協議。 |
| 最 Wow 但費時？ | **Agent0 / ERC-8004**（§2）——不需付款，且是 The Graph 2026 主推方向。 |
| 分析還缺什麼？ | Peer percentile、liquidation proximity、cross-protocol flow（§3）。 |
| 有什麼是「不做也對」？ | x402、Substreams、GRC-20、自建 UI（§6）。 |

---

## 9. 相關文件

| 文件 | 用途 |
|---|---|
| `docs/deployment-vercel.md` | 遠端部署（已完成） |
| `docs/platform-integration.md` | 多平台接入（已完成） |
| `docs/reviews/2026-09-11-ethonline-prize-research.md` | 獎項與過往贏家研究 |
| `docs/superpowers/plans/2026-09-11-competitive-strengthening.md` | 強化策略與差異化分析 |
| `docs/superpowers/plans/2026-09-12-demo-narrative.md` | Demo 敘事腳本 |
