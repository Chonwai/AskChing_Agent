# ETH Staking 功能實作 Spec（`compare_staking`）

> 建立：2026-09-13 ｜ 狀態：**待實作**（deadline 前不壓線，demo 後做）
> 依據：`docs/reviews/2026-09-13-staking-analysis-thegraph-depth.md` 的實測結果

## 1. 背景與動機

用戶問「$10K USDC vs ETH staking 哪個收益最大」— AskChing 目前只能答 USDC（Compound 3.60%），ETH staking 因不在覆蓋範圍而 fail-closed。**Lido 官方 subgraph 實測可用且直接提供 `apr` 欄位**（block 25961308 → 2.315%），接入成本極低。此功能讓 AskChing 跨入「跨資產類別研究」（lending vs staking），是 graph-lending-mcp（lending-only）做不到的差異化。

## 2. 數據源（已實測驗證）

| 源            | Subgraph ID                                    | Schema          | 取用方式                                                            | 狀態                |
| ------------- | ---------------------------------------------- | --------------- | ------------------------------------------------------------------- | ------------------- |
| **Lido 官方** | `Sxx812XgeKyzQPaBpR5YZWmGV5fZuBaPdh7DFhzSwiQ`  | 官方            | `totalRewards(orderBy:block desc, first:1){ apr block }` → 現成 APR | ✅ live             |
| Messari lido  | `F7qb71hWab6SuRL5sf6LQLTpNahmqMsBnnweYHzLGUyG` | Messari generic | protocols/pools（無 APY 欄位，需自行推算）                          | ✅ live（fallback） |
| Rocket Pool   | 社群 ID 失效 / Messari 無 allocations          | —               | —                                                                   | ❌ 不可用           |

**Citation 保證**：Lido 官方源提供 `block`（subgraph 區塊高度）+ `blockTime`（unix seconds）→ 構成完整 citation：`subgraphId + block + timestamp + queryHash`，其中 `timestamp = new Date(blockTime * 1000).toISOString()`（`CitationSchema.timestamp` 是 required，smith 實測 `TotalReward` 有 `blockTime` 欄位 — 見 `schemas.ts:48-59`）。但**只有 1 個可用源**，需決定是否放寬 ≥2 sources 保證（見 §5）。

## 3. 實作零件（走現有模式）

### 3.1 source-config 註冊

`packages/shared/src/source-config.ts` 的 `PROTOCOL_REGISTRY` 加：

```ts
{
  protocol: "lido",
  network: "mainnet",
  subgraphId: "Sxx812XgeKyzQPaBpR5YZWmGV5fZuBaPdh7DFhzSwiQ",
  schemaVersion: "lido-official",  // 或沿用 3.1.0 但標 note
  live: true
}
```

> ⚠️ 注意：現有 registry 強制 `schemaVersion === "3.1.0"`（`source-config.test.ts`）。Lido 官方 schema 非 Messari — 需在測試放寬或加 note。

### 3.2 graph-client 新 extractor

`graph-client.ts` 的 `switch (descriptor.extractor)` 加 case：

```ts
case "lido-staking-apr": {
  // query: { totalRewards(orderBy: block, orderDirection: desc, first: 1) { apr block } }
  // → StakingObservation { asset: "ETH", metric: "staking_apr", value: apr, citation: { subgraphId, block, queryHash } }
}
```

### 3.3 schema 擴充

`packages/shared/src/schemas.ts` 加：

```ts
export const StakingObservationSchema = MarketObservationSchema.extend({
  asset: z.literal('ETH'),
  metric: z.literal('staking_apr'),
  protocol: z.enum(['lido']), // future: rocket-pool
});
```

### 3.4 新 tool：`compare_staking`（或擴充 discover_yields）

```
compare_staking(asset: "ETH", protocols: ["lido"]) →
  { rows: [{ protocol, value, unit: "percent", citations }], asOf, caveats }
```

**核心問題**：單源 vs fail-closed。兩種路線：

- **A. 維持 fail-closed**：`compare_staking` 需要 ≥2 sources → 目前只有 Lido 會 throw → 誠實但功能「看起來不能用」
- **B. 單源允許**（附 explicit caveat）：`compare_staking` 允許 1 source，但輸出標明「single-source, no cross-protocol ranking」→ 功能可用但保證降級

**建議 B**（與 risk_scan 的 spot-only gap 精神一致：明示限制而非拒絕），但保留「跨協議排名需 ≥2 sources」的 fail-closed。

## 4. 測試與 fixtures

- `fixtures.ts`：加 Lido staking fixture（apr 值 + citation）
- `source-config.test.ts`：放寬 schemaVersion 或標 note
- 新 `compare-staking.test.ts`：單源輸出 + caveats、雙源排名、fail-closed
- eval cases：加 1-2 個「ETH staking 收益」case

## 5. 決策點

| 決策                            | 選項                          | 建議                                                                               |
| ------------------------------- | ----------------------------- | ---------------------------------------------------------------------------------- |
| 單源 vs fail-closed             | A 維持 / B 降級允許           | **B**（explicit caveat，參考 risk_scan 精神）                                      |
| 新 tool vs 擴充 discover_yields | 獨立 `compare_staking` / 併入 | **獨立 tool**（discover_yields 已鎖 USDC 品牌）                                    |
| Rocket Pool 缺口                | 標 gap / 找替代源             | **標 gap**（社群 ID 失效、Messari 未索引 — 誠實記錄）                              |
| deadline                        | 現在做 / demo 後做            | **demo 後做**（動 adapter 的風險 > 評審加分；demo 用 Demo H 展示誠實 fail-closed） |

## 6. 估算

- 核心實作：2-3 小時（source-config + extractor + schema + tool + fixtures）
- 測試 + eval：1-2 小時
- 總計：**半天內** — 適合 demo 提交後（或若有餘裕）執行
