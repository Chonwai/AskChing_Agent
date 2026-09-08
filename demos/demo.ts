#!/usr/bin/env node
/**
 * AskChing demo CLI
 *
 * Usage:
 *   npm run demo -- "Compare USDC supply APY across Aave V3 and Compound V3"
 *   npm run demo --live -- "Compare USDC supply APY"
 *
 * Fixture mode is the default (DEMO_LIVE=0). Pass --live to use the
 * live Graph gateway with GRAPH_API_KEY from the environment.
 */
import {
  createMarketDataSource,
  type MarketDataSource
} from "../packages/shared/src/index.js";
import { researchBrief } from "../packages/mcp-server/src/tools.js";

const args = process.argv.slice(2);
const liveIndex = args.indexOf("--live");
const liveMode = liveIndex !== -1;
if (liveMode) {
  args.splice(liveIndex, 1);
}
const question =
  args.join(" ").trim() ||
  "Compare USDC supply APY across Aave V3 and Compound V3";

const protocols = ["aave-v3", "compound-v3", "spark-lend"] as const;

const environment = {
  ...process.env,
  DEMO_LIVE: liveMode ? "1" : process.env.DEMO_LIVE ?? "0"
};
const dataSource: MarketDataSource = createMarketDataSource(environment);

const result = await researchBrief(
  {
    question,
    protocols
  },
  dataSource
);

console.log("─── Research Brief ───");
console.log(`Question: ${question}`);
console.log(`Mode: ${liveMode ? "live" : "fixture"}`);
console.log("");
console.log(`Conclusion: ${result.brief.conclusion}`);
console.log("");
console.log("Key Figures:");
for (const figure of result.brief.keyFigures) {
  console.log(
    `  ${figure.protocol}: ${figure.value}% (${figure.unit}) [source: ${figure.source}]`
  );
}
console.log("");
console.log(`As-of: ${result.brief.asOf}`);
console.log("");
console.log("Sources:");
for (const source of result.sources) {
  console.log(
    `  ${source.protocol}: subgraph ${source.subgraphId} (block ${source.block})`
  );
}
console.log("");
console.log("Caveats:");
for (const caveat of result.caveats) {
  console.log(`  ${caveat}`);
}
if (result.brief.suggestedFollowUp) {
  console.log("");
  console.log(`Suggested follow-up: ${result.brief.suggestedFollowUp}`);
}