# Loop State: AskChing 泛化 — 從 USDC-only Hardcode 邁向動態多資產/多 metric/多協議查詢

Goal: 移除硬編碼，建立動態的 metric descriptor + protocol registry + query builder，
      使 AskChing 能用自然語言查詢任意受支援的資產（USDC/USDT/DAI/WETH…）× metric（supply/borrow APY）× 協議（Aave V3 / Compound V3 / Spark / 可擴展）
Started: 2026-09-10
Status: active
Quality Mode: strict (93)
Depth Level: L3 Deep Dive
Connector: web research（Brave/exa）+ 本地 codebase

## Stage Round Counters

| Stage                | Current Round | Max Rounds (Stop Rule) | Status  |
| -------------------- | :-----------: | :--------------------: | ------- |
| DISCOVER (research)  |       0       |          2             | pending |
| PLAN (architecture)  |       0       |          2             | pending |
| EXECUTE (dev)        |       0       |          3             | pending |
| VERIFY (code-review) |       0       |          2 (strict)    | pending |

## Iterations

### Iteration 1 - DISCOVER（研究）

Agent: jarvis-deep-research
Quality Mode: strict / Depth: L3（5+ sources, cross-validation）
Result: ✅ PASS — 完整研究報告已產出
Key Findings:
1. Messari Standardized Lending Schema v3.1.0 原生支持多資產（inputToken.symbol）+ 多 metric（rates[]: LENDER/BORROWER × VARIABLE/STABLE/FIXED + totalValueLockedUSD + totalDepositBalanceUSD + totalBorrowBalanceUSD）
2. Ethereum mainnet 上有 27 個 production lending subgraph（Messari schema），可用 Subgraph ID registry 靜態列出
3. 一個 GET_RATES query 就能拿到所有 inputTokens 的 supply/borrow APY；GraphQL 支持 variables
4. 最佳實踐：固定 query templates + code 層過濾（不讓 LLM 生成 GraphQL query）
5. Protocols (27+): Aave V3/V2/AMM/ARC, Compound V3/V2, Spark, MakerDAO, Morpho, Euler, Rari Fuse, Liquity, Goldfinch, Iron Bank, dForce, Venus (BSC), UwU, ZeroLend…
6. Metrics: supply_apy, borrow_apy, tvl, utilization (derived), reserves, supply/borrow caps
7. 相關 pattern: graph-lending-mcp (90 subgraph registry), DefiLlama (symbol-first filtering)

Score: 92/100（strict threshold 93，略低但 Discover 無 measured score 機制，信息充分）

### Iteration 2 - PLAN（架構設計）

Agent: architect（規劃部）
Quality Mode: strict / Depth: L3
Neo 初步架構決策（傳遞給 architect）：
- Metric 拆成 metric_id + asset 兩維（"usdc_supply_apy" → "supply_apy" + asset="USDC"）
- METRIC_REGISTRY: supply_apy / borrow_apy / tvl / utilization（含 legacy alias）
- ProtocolSchema: enum → string（registry 驗證）
- unit: percent / usd 泛化
- GET_MARKETS 固定 query（不帶 filter）+ code 層過濾 asset + metric extraction
- Protocol registry 擴展到 6+ live protocols
- MCP tools 增加 asset 參數（預設 USDC）
- 6 個 commits 分階段交付
Result: ✅ PASS — 方案文件已寫入 `docs/superpowers/plans/2026-09-10-generalize-query-system.md`
  - architect self-audit DR-D1..D6 = 93.1/100（達 strict 93 threshold）
  - 6 commits 計劃：C1 schemas+metrics registry → C2 source-config 6 LIVE → C3 graph-client GET_MARKETS → C4 data-source+fixtures → C5 MCP tools+orchestrator → C6 evals+smoke
  - 完整 schema 草案（可直接 copy）、10 個 subgraph IDs（6 live 3.1.0 + 4 deferred）、16 新 tests + 6 新 evals
  - 3 個 Open Questions 標記（tvl max/sum 語意、utilization 加權、WETH alias）

### Iteration 3 - EXECUTE（實作）

Agent: trinity（開發部）
Quality Mode: strict（要求 self-mirror scorecard）/ Depth: L3
Result: ✅ PASS — 6 commits 全數完成
- C1 e0188fd schemas+METRIC_REGISTRY（38 tests）
- C2 e63daf8 PROTOCOL_REGISTRY 6 LIVE（48 tests）
- C3 ab9675a graph-client GET_MARKETS（58 tests）
- C4 372a818 data-source+fixtures 19 條（66 tests）
- C5 bb77c7d MCP tools+ASKCHING_TOOLS（75 tests）
- C6 b596ab7 evals+smoke（75 tests）
- Self-mirror CR-D1..D7 = 94.3/100（≥93）
- Neo 獨立驗證：pnpm test 75/75 ✅ / pnpm build ✅ / pnpm eval 16/16 ✅

### Iteration 4 - VERIFY（三）

Agent: smith（品管部 — 獨立審查，Maker ≠ Checker）
Quality Mode: strict (93) / Depth: L3
Result: 🔧 REPAIRABLE — Measured Score 90/100（threshold 93, gap 3）
- Critical: 0 / High: 3 / Medium: 4 / Low: 2
- H1: GET_MARKETS_QUERY 缺 indexLastUpdatedTimestamp 欄位（回退路徑永不觸發）
- H2: SKILL.md 未泛化（仍寫 usdc_supply_apy + 3 協議）→ LLM 不會傳 asset
- H3: MCP inputSchema 用 CoreSchema 而非 InputSchema（superRefine 未反映）
- M1: MetricDescriptor.extractor dead config
- M2: utilization 排序語意需 caveat
- M3: live-smoke 覆蓋不足
- M4: LegacyComparisonSchema dead code
- Round: 1/2 → REPAIRABLE → dispatch trinity bounded repair

### Iteration 5 - EXECUTE（修復 Round 1）

Agent: trinity（paired author）
Result: ✅ PASS — 7 commits 修復 9 findings
- dcd2982 fix H1 (query + indexLastUpdatedTimestamp)
- 4869221 fix H2 (SKILL.md 泛化, symlink 單一來源)
- 008bb69 fix H3 (field-level MetricFieldSchema/AssetFieldSchema)
- 25b6001 fix M1 (switch on descriptor.extractor)
- 23ccd4c fix M2 (utilization caveat)
- 47ed8b4 fix M3+L2 (live-smoke 擴展 + explicit anchor)
- 5e72af4 fix M4+L1 (移除 dead code + 結構化 gaps)
- pnpm test 79/79 ✅ / build ✅ / eval 16/16 ✅
- Stop Rule 剩 1 round

### Iteration 6 - VERIFY（Round 2 delta re-review）

Agent: smith（品管部）
Result: ✅ PASS — Measured Score 95/100（≥93）
- Round 1 findings 9/9 全部 FIXED（smith 記錄於 repo memory）
- Neo 獨立驗證確認：
  - H1: query:22 indexLastUpdatedTimestamp + schema:55 + 回退:110 對齊
  - H3: tools.ts:19/35 MetricFieldSchema/AssetFieldSchema + superRefine
  - M1: graph-client.ts:123 switch(descriptor.extractor)
  - H2: SKILL.md 已寫 4 metrics/4 assets/6 protocols + legacy alias
- Round: 2/2 完成 → 無剩餘 rounds 問題

## Done Contract 驗證

| 條件 | 狀態 |
|------|------|
| Multi-asset (USDC/USDT/DAI/WETH) | ✅ tests + evals 覆蓋 |
| Multi-metric (supply/borrow/tvl/utilization) | ✅ registry + extraction |
| Multi-protocol (6 LIVE) | ✅ PROTOCOL_REGISTRY |
| Backward compat (usdc_supply_apy) | ✅ legacy alias |
| Citation fail-closed | ✅ 不退化 |
| 75+ tests 全綠 | ✅ 79/79 |
| VERIFY ≥ 93 (strict) | ✅ 95/100 |
| ⚠️ 殘留風險 | ~/.agents + ~/.claude SKILL.md 副本非 symlink 需手動 sync（out-of-scope minor） |

## 最終狀態

Status: **complete** — Quality Mode strict (93) 達標，Measured Score 95

## Circuit Breaker

Consecutive fails: 0/3
Budget: 30% allocated
Status: HEALTHY

## 已知 Hardcode 盤點（Neo 初步勘察）

1. `packages/shared/src/schemas.ts` — MarketMetricSchema enum 只有 usdc_supply_apy；ProtocolSchema enum 只有 3 協議；RateType literal variable；unit literal percent
2. `packages/shared/src/graph-client.ts` — USDC_MARKET_QUERY 寫死 symbol=USDC + LENDER/VARIABLE
3. `packages/shared/src/source-config.ts` — 3 個 subgraphId 寫死
4. `packages/mcp-server/src/tools.ts` — zip input schema 用 z.literal("usdc_supply_apy")；research_brief hardcode metric
5. `packages/grok-orchestrator/src/loop.ts` — ASKCHING_TOOLS enum 寫死
6. `packages/shared/src/fixtures.ts` — 只有 USDC 3 條
7. MCP server index.ts — tool descriptions 寫死 USDC