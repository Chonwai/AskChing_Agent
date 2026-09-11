/**
 * Verify candidate subgraph IDs against the live Graph gateway.
 *
 * The blueprint says protocol coverage must only be expanded one entry at a
 * time, and only after that entry is proven to return real data. This script
 * is that proof: it queries each candidate the same way the server does
 * (`GET_MARKETS_QUERY` through `GraphGatewayClient`) and reports, per protocol,
 * whether a USDC market came back with a cited observation.
 *
 * It deliberately does NOT edit `source-config.ts`. Adding a protocol stays a
 * human decision; this only removes the guesswork.
 *
 * Usage:
 *   pnpm probe:protocols                       # probe the registry's live entries
 *   pnpm probe:protocols -- <id> <protocol>    # probe an ad-hoc candidate
 *   pnpm probe:protocols -- <id> <protocol> --asset USDT
 */

import { readFile } from "node:fs/promises";

import { GraphGatewayClient } from "../packages/shared/src/graph-client.js";
import { PROTOCOL_REGISTRY } from "../packages/shared/src/source-config.js";
import type { MarketMetricId } from "../packages/shared/src/schemas.js";

interface Candidate {
  protocol: string;
  subgraphId: string;
  schemaVersion?: string;
  /** Registry entries carry their declared state; ad-hoc candidates default to true. */
  expectLive?: boolean;
}

const METRICS: readonly MarketMetricId[] = ["supply_apy", "utilization"];

function parseArgs(argv: string[]): { candidates: Candidate[]; asset: string } {
  const agentIndex = argv.indexOf("--asset");
  const asset =
    agentIndex !== -1 && argv[agentIndex + 1] ? argv[agentIndex + 1]!.toUpperCase() : "USDC";
  const positional = argv.filter((arg, index) => !arg.startsWith("--") && index !== agentIndex + 1);

  if (positional.length >= 2) {
    return {
      asset,
      candidates: [
        { protocol: positional[1]!, subgraphId: positional[0]!, expectLive: true }
      ]
    };
  }

  return {
    asset,
    candidates: PROTOCOL_REGISTRY.map((source) => ({
      protocol: source.protocol,
      subgraphId: source.subgraphId,
      schemaVersion: source.schemaVersion,
      expectLive: source.live
    }))
  };
}

async function main() {
  const apiKey = process.env.GRAPH_API_KEY;
  if (!apiKey) {
    throw new Error("GRAPH_API_KEY is required (run with: pnpm probe:protocols, or tsx --env-file=.env)");
  }

  const { candidates, asset } = parseArgs(process.argv.slice(2));
  const client = new GraphGatewayClient({ apiKey });

  console.log(`Probing ${candidates.length} protocol(s) for ${asset}\n`);

  let livePassed = 0;
  let liveTotal = 0;
  let regressions = 0;

  for (const candidate of candidates) {
    const expectLive = candidate.expectLive ?? true;
    const source = {
      protocol: candidate.protocol,
      network: "mainnet" as const,
      subgraphId: candidate.subgraphId,
      explorerUrl: `https://thegraph.com/explorer/subgraphs/${candidate.subgraphId}`,
      schemaVersion: candidate.schemaVersion ?? "unknown",
      live: true
    };

    const results: string[] = [];
    let succeeded = false;
    for (const metric of METRICS) {
      try {
        const observation = await client.getMarketObservation(source, metric, asset);
        results.push(
          `${metric}=${observation.value}${observation.unit === "percent" ? "%" : ""}@${observation.block}`
        );
        succeeded = true;
      } catch (error) {
        results.push(`${metric}: ${(error as Error).message}`);
      }
    }

    // Only a *live* entry failing to return data is a problem. A non-live entry
    // failing is the documented expectation, and a non-live entry succeeding is
    // worth reporting so the registry can be re-evaluated.
    let tag: string;
    if (expectLive) {
      liveTotal += 1;
      if (succeeded) {
        livePassed += 1;
        tag = "LIVE OK ";
      } else {
        regressions += 1;
        tag = "LIVE FAIL";
      }
    } else {
      tag = succeeded ? "notlive+ " : "notlive  ";
    }

    console.log(
      `${tag} ${candidate.protocol.padEnd(13)} schema=${(candidate.schemaVersion ?? "?").padEnd(7)} ${results.join("  ")}`
    );
  }

  console.log(`\n${livePassed}/${liveTotal} live protocols returned data`);
  if (regressions > 0) {
    console.error(
      `${regressions} live protocol(s) failed - the registry promises data these cannot deliver`
    );
  }
  process.exit(regressions === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error(`probe-protocols FAIL: ${(error as Error).message}`);
  process.exit(1);
});

// Keep the import list honest even if unused on some paths.
void readFile;
