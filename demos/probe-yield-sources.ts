/**
 * Probe credentialed DEX yield sources against the live Graph gateway.
 *
 * Mirrors probe-protocols.ts: for each DEX venue in the registry, instantiate
 * the exact production adapter (UniswapV3YieldAdapter / CurveYieldAdapter) and
 * call `getOpportunities()` — the same code path the server uses. This proves
 * that the subgraph IDs, queries, and schema parsing all work end-to-end
 * before flipping `live: true` in the source registry.
 *
 * Usage:
 *   pnpm probe:yields                         # probe all registered DEX venues
 *   pnpm probe:yields -- --venue uniswap-v3  # probe Uniswap V3 only
 *   pnpm probe:yields -- --venue curve       # probe Curve only
 */

import { DEX_YIELD_SOURCES } from '../packages/shared/src/yield-sources.js';
import { UniswapV3YieldAdapter, CurveYieldAdapter } from '../packages/shared/src/yield-client.js';
import type { DexYieldSource } from '../packages/shared/src/yield-sources.js';

const MIN_TVL_USD = 1_000_000;

function parseArgs(argv: string[]): { venue?: string } {
  const venueIndex = argv.indexOf('--venue');
  if (venueIndex !== -1 && argv[venueIndex + 1]) {
    const venue = argv[venueIndex + 1]!;
    if (venue !== 'uniswap-v3' && venue !== 'curve') {
      throw new Error(`Unknown venue: ${venue}. Use --venue uniswap-v3 or --venue curve.`);
    }
    return { venue };
  }
  return {};
}

function formatNumber(n: number): string {
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
}

async function main() {
  const apiKey = process.env.GRAPH_API_KEY;
  if (!apiKey) {
    throw new Error(
      'GRAPH_API_KEY is required (run with: pnpm probe:yields, or tsx --env-file=.env demos/probe-yield-sources.ts)',
    );
  }

  const { venue: venueFilter } = parseArgs(process.argv.slice(2));
  const candidates = venueFilter
    ? DEX_YIELD_SOURCES.filter((s) => s.venue === venueFilter)
    : [...DEX_YIELD_SOURCES];

  console.log(`Probing ${candidates.length} DEX yield source(s) for USDC/USDT/DAI pools\n`);

  const input = { stablecoins: ['USDT', 'DAI'] as const };

  let livePassed = 0;
  let liveTotal = 0;
  let regressions = 0;

  for (const source of candidates) {
    const expectLive = source.live;
    let totalObs = 0;
    let gaps = 0;
    let eligibleObs = 0;

    try {
      const adapter = createAdapter(source, apiKey);
      const result = await adapter.getOpportunities(input);
      totalObs = result.observations.length;
      gaps = result.gaps.length;

      const eligible = result.observations.filter((o) => o.tvlUsd >= MIN_TVL_USD);
      eligibleObs = eligible.length;

      let tag: string;
      if (expectLive) {
        liveTotal += 1;
        if (eligibleObs > 0) {
          livePassed += 1;
          tag = 'LIVE OK ';
        } else {
          regressions += 1;
          tag = 'LIVE FAIL';
        }
      } else {
        tag = eligibleObs > 0 ? 'notlive+ ' : 'notlive  ';
      }

      console.log(
        `${tag} ${source.venue.padEnd(14)} ` +
          `obs=${String(totalObs).padStart(3)}  ` +
          `gaps=${String(gaps).padStart(3)}  ` +
          `eligible=${String(eligibleObs).padStart(3)}  ` +
          `subgraph=${source.subgraphId}`,
      );

      for (const obs of eligible) {
        console.log(
          `  ${obs.venue} ${obs.poolAddress} ` +
            `${obs.windowStart}→${obs.windowEnd} ` +
            `TVL=${formatNumber(obs.tvlUsd)} ` +
            `APR=${obs.estimatedFeeApr.toFixed(2)}% ` +
            `subgraph=${obs.subgraphId}`,
        );
      }

      if (result.gaps.length > 0) {
        console.log('  gaps:');
        for (const gap of result.gaps) {
          console.log(`    ${gap.poolAddress ?? '?'}: ${gap.reason}`);
        }
      }
    } catch (err) {
      const error = (err as Error).message;

      let tag: string;
      if (expectLive) {
        liveTotal += 1;
        regressions += 1;
        tag = 'LIVE FAIL';
      } else {
        tag = 'notlive  ';
      }

      console.log(
        `${tag} ${source.venue.padEnd(14)} ` +
          `ERROR: ${error}  ` +
          `subgraph=${source.subgraphId}`,
      );
    }

    console.log();
  }

  console.log(
    `${livePassed}/${liveTotal} live venues passed (eligible ≥ ${formatNumber(MIN_TVL_USD)} TVL)`,
  );
  if (regressions > 0) {
    console.error(
      `${regressions} live venue(s) failed — the registry promises yields these cannot deliver`,
    );
  }
  process.exit(regressions === 0 ? 0 : 1);
}

function createAdapter(source: DexYieldSource, apiKey: string) {
  if (source.venue === 'uniswap-v3') {
    return new UniswapV3YieldAdapter({ source, apiKey });
  }
  if (source.venue === 'curve') {
    return new CurveYieldAdapter({ source, apiKey });
  }
  throw new Error(`No adapter for venue: ${source.venue}`);
}

main().catch((error) => {
  console.error(`probe-yield-sources FAIL: ${(error as Error).message}`);
  process.exit(1);
});
