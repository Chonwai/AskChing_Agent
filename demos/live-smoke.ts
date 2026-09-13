import { LIVE_SOURCES, GraphGatewayClient } from '../packages/shared/src/index.js';

const apiKey = process.env.GRAPH_API_KEY;
if (!apiKey) {
  throw new Error('GRAPH_API_KEY is required for live smoke (run with DEMO_LIVE=1 and .env)');
}

const client = new GraphGatewayClient({ apiKey });
interface SmokeRun {
  protocol: string;
  metric: string;
  asset: string;
}
interface SmokeResult extends SmokeRun {
  value: number;
  unit: string;
  block?: number;
  queryHash: string;
}
interface Gap {
  protocol: string;
  metric: string;
  asset: string;
  reason: string;
}

const results: SmokeResult[] = [];
const gaps: Gap[] = [];

type LiveMetric = 'supply_apy' | 'borrow_apy' | 'tvl' | 'utilization';

// Smoke matrix: every LIVE protocol × USDC supply_apy, plus a multi-asset
// and multi-metric spread across the live protocols. Fail-closed baseline is
// the six USDC supply_apy quotes; every other run that has no data is
// collected as a gap rather than failing the smoke.
const aave = LIVE_SOURCES.find((source) => source.protocol === 'aave-v3');
const compound = LIVE_SOURCES.find((source) => source.protocol === 'compound-v3');
if (!aave || !compound) {
  throw new Error('live-smoke requires aave-v3 and compound-v3 in LIVE_SOURCES');
}

const runs: Array<{
  source: (typeof LIVE_SOURCES)[number];
  metric: LiveMetric;
  asset: string;
}> = [
  ...LIVE_SOURCES.map((source) => ({
    source,
    metric: 'supply_apy' as const,
    asset: 'USDC',
  })),
  // Multi-metric spread on the aave-v3 anchor
  { source: aave, metric: 'borrow_apy', asset: 'USDC' },
  { source: aave, metric: 'tvl', asset: 'USDC' },
  { source: aave, metric: 'utilization', asset: 'USDC' },
  // Multi-asset: WETH supply on aave-v3, USDT tvl on compound-v3
  { source: aave, metric: 'supply_apy', asset: 'WETH' },
  { source: compound, metric: 'tvl', asset: 'USDT' },
  // borrow/utilization spread across a second protocol
  { source: compound, metric: 'borrow_apy', asset: 'USDC' },
  { source: compound, metric: 'utilization', asset: 'USDC' },
];

const settled = await Promise.allSettled(
  runs.map((run) => client.getMarketObservation(run.source, run.metric, run.asset)),
);

settled.forEach((result, index) => {
  const run = runs[index]!;
  if (result.status === 'fulfilled') {
    const observation = result.value;
    results.push({
      protocol: observation.protocol,
      metric: observation.metric,
      asset: observation.asset,
      value: observation.value,
      unit: observation.unit,
      block: observation.block,
      queryHash: observation.queryHash,
    });
    if (!observation.queryHash.startsWith('sha256:')) {
      gaps.push({
        protocol: run.source.protocol,
        metric: run.metric,
        asset: run.asset,
        reason: 'missing queryHash',
      });
    }
  } else {
    gaps.push({
      protocol: run.source.protocol,
      metric: run.metric,
      asset: run.asset,
      reason: (result.reason as Error).message,
    });
  }
});

console.log(JSON.stringify({ results, gaps }, null, 2));
console.log(`live-smoke: ${results.length} observations, ${gaps.length} gaps`);

// Fail closed: the six LIVE protocols must all yield a USDC supply_apy quote.
const usdcSupply = results.filter(
  (result) => result.metric === 'supply_apy' && result.asset === 'USDC',
);
if (usdcSupply.length < 6) {
  throw new Error(
    `live-smoke FAIL: expected 6 USDC supply_apy observations, got ${usdcSupply.length}. Gaps: ${gaps.map((gap) => `${gap.protocol}/${gap.metric}/${gap.asset}: ${gap.reason}`).join('; ')}`,
  );
}
console.log('live-smoke OK: all 6 LIVE protocols returned cited USDC supply_apy');

// Coverage guard: every run must be accounted for (result or explicit gap).
const coveredRuns = results.length + gaps.length;
if (coveredRuns !== runs.length) {
  throw new Error(
    `live-smoke FAIL: ${runs.length} runs expected, only ${coveredRuns} covered (results ${results.length} + gaps ${gaps.length})`,
  );
}

// Coverage check: utilization and borrow_apy must each be exercised (result
// or gap) so the extended matrix is actually live, not silently dropped.
for (const metric of ['utilization', 'borrow_apy']) {
  const covered =
    results.some((result) => result.metric === metric) || gaps.some((gap) => gap.metric === metric);
  if (!covered) {
    throw new Error(`live-smoke FAIL: no live or gapped coverage for ${metric}`);
  }
}
console.log('live-smoke coverage: utilization + borrow_apy + multi-asset rows exercised');
