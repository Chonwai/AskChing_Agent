import {
  LIVE_SOURCES,
  GraphGatewayClient
} from "../packages/shared/src/index.js";

const apiKey = process.env.GRAPH_API_KEY;
if (!apiKey) {
  throw new Error(
    "GRAPH_API_KEY is required for live smoke (run with DEMO_LIVE=1 and .env)"
  );
}

const client = new GraphGatewayClient({ apiKey });
const results: Array<{ protocol: string; metric: string; asset: string; value: number; unit: string; block?: number; queryHash: string }> = [];
const gaps: string[] = [];

// Smoke matrix: every LIVE protocol × USDC supply_apy, plus a multi-asset
// and multi-metric spread for the two anchor protocols.
const runs = [
  ...LIVE_SOURCES.map((source) => ({ source, metric: "supply_apy" as const, asset: "USDC" })),
  { source: LIVE_SOURCES[0]!, metric: "borrow_apy" as const, asset: "USDC" },
  { source: LIVE_SOURCES[0]!, metric: "tvl" as const, asset: "USDC" },
  { source: LIVE_SOURCES[0]!, metric: "utilization" as const, asset: "USDC" },
  { source: LIVE_SOURCES[0]!, metric: "supply_apy" as const, asset: "WETH" },
  { source: LIVE_SOURCES[1]!, metric: "tvl" as const, asset: "USDT" }
];

const settled = await Promise.allSettled(
  runs.map((run) =>
    client.getMarketObservation(run.source, run.metric, run.asset)
  )
);

settled.forEach((result, index) => {
  const run = runs[index]!;
  if (result.status === "fulfilled") {
    const observation = result.value;
    results.push({
      protocol: observation.protocol,
      metric: observation.metric,
      asset: observation.asset,
      value: observation.value,
      unit: observation.unit,
      block: observation.block,
      queryHash: observation.queryHash
    });
    if (!observation.queryHash.startsWith("sha256:")) {
      gaps.push(`${run.source.protocol}/${run.metric}/${run.asset}: missing queryHash`);
    }
  } else {
    gaps.push(
      `${run.source.protocol}/${run.metric}/${run.asset}: ${(result.reason as Error).message}`
    );
  }
});

console.log(JSON.stringify({ results, gaps }, null, 2));
console.log(`live-smoke: ${results.length} observations, ${gaps.length} gaps`);

// Fail closed: the six LIVE protocols must all yield a USDC supply_apy quote.
const usdcSupply = results.filter(
  (result) => result.metric === "supply_apy" && result.asset === "USDC"
);
if (usdcSupply.length < 6) {
  throw new Error(
    `live-smoke FAIL: expected 6 USDC supply_apy observations, got ${usdcSupply.length}. Gaps: ${gaps.join("; ")}`
  );
}
console.log("live-smoke OK: all 6 LIVE protocols returned cited USDC supply_apy");

