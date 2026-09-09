# AskChing Demo Prompts

## Demo A — required comparison

> Compare live USDC supply APY across Aave V3, Compound V3, and Spark Lend right now. Rank the results, cite each source, and state the as-of time. Every result must state the `asOf` block timestamp.

Expected path: three source queries (`aave-v3`, `compound-v3`, `spark-lend`), normalized percent values, ranked rows, three source IDs, `asOf`, and caveats.

## Demo B — evidence follow-up

> Re-query the live sources and show me the citation structure for any protocol in the result: subgraph, block, query hash, and observation timestamp. Do not add any number that is not in the tool result. Every result must state the `asOf` block timestamp.

Expected path: a fresh fan-out that surfaces the evidence structure for at least one source — subgraph identity, block, query hash, and observation timestamp — with no invented numbers and the `asOf` restated.

> **跨 prompt 引用限制（stateless CLI）：** 每支 CLI 呼叫皆 stateless（`runGrokOrchestrator` 單次執行），**無法**引用上一支 CLI 的 tool result。因此 Demo B 不可假設 Grok「追蹤 top result 回到先前的 citation」；它必須**重新查詢**並展示 citation 結構。若 Grok 回「I don't have the previous result」，請改用 run-script §2.3 的 zoom-in 變體（畫面 zoom-in 現有 ranked 結果的 citation 欄位）。

## Demo C — honest spot snapshot

> Scan Aave V3, Compound V3, and Spark Lend for unusual USDC risk over seven days. Every result must state the `asOf` block timestamp.

`risk_scan` is implemented as a peer-relative spot snapshot: it compares current USDC supply-market metrics across the three sources and flags outliers relative to peers at the current block. It does not read historical time-series, so the response must be explicit that this is a spot signal — a seven-day trend cannot be claimed, and trend/history analysis is an intentionally named gap rather than an inferred risk score.

## Locked live sources

| Protocol | Network | Graph subgraph ID |
| --- | --- | --- |
| Aave V3 | Ethereum mainnet | `JCNWRypm7FYwV8fx5HhzZPSFaMxgkPuw4TnR3Gpi81zk` |
| Compound V3 | Ethereum mainnet | `AwoxEZbiWLvv6e3QdvdMZw4WDURdGbvPfHmZRc8Dpfz9` |
| Spark Lend | Ethereum mainnet | `GbKdmBe4ycCYCQLQSjqGg6UHYoYfbyJyq5WrG35pv1si` |

All three sources use the Messari lending schema and expose market input tokens plus lender rates. The IDs above match `packages/shared/src/source-config.ts`. Recheck index status in Graph Explorer before recording the demo.

