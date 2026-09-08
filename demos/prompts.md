# AskChing Demo Prompts

## Demo A — required comparison

> Compare live USDC supply APY across Aave V3, Compound V3, and Spark Lend right now. Rank the results, cite each source, and state the as-of time. Every result must state the `asOf` block timestamp.

Expected path: three source queries (`aave-v3`, `compound-v3`, `spark-lend`), normalized percent values, ranked rows, three source IDs, `asOf`, and caveats.

## Demo B — evidence follow-up

> For the top result, show me its subgraph, block, query hash, and observation timestamp. Do not add any number that is not in the tool result. Every result must state the `asOf` block timestamp.

Expected path: a single evidence chain back to the cited tool result — subgraph identity, block, query hash, and observation timestamp — with no invented numbers and the `asOf` restated.

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

