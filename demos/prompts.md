# AskChing Demo Prompts

## Demo A — required comparison

> Compare USDC supply APY across Aave V3 and Compound V3 right now. Rank the results, cite each source, and state the as-of time.

Expected path: two source queries, normalized percent values, ranked rows, at least two source IDs, `asOf`, and caveats.

## Demo B — evidence follow-up

> For the top result, show me its subgraph, block, query hash, and observation timestamp. Do not add any number that is not in the tool result.

## Demo C — honest gap

> Scan Aave V3 and Compound V3 for unusual USDC risk over seven days.

Until `risk_scan` is implemented, this must return an explicit capability gap rather than an inferred risk score.

## Locked live sources

| Protocol | Network | Graph subgraph ID |
| --- | --- | --- |
| Aave V3 | Ethereum mainnet | `JCNWRypm7FYwV8fx5HhzZPSFaMxgkPuw4TnR3Gpi81zk` |
| Compound V3 | Ethereum mainnet | `AwoxEZbiWLvv6e3QdvdMZw4WDURdGbvPfHmZRc8Dpfz9` |

Both sources use the Messari lending schema and expose market input tokens plus lender rates. Recheck index status in Graph Explorer before recording the demo.

