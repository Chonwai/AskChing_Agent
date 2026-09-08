import { readFile } from "node:fs/promises";

import { createMarketDataSource } from "../packages/shared/src/index.js";
import { compareMarkets } from "../packages/mcp-server/src/tools.js";

interface EvalCase {
  id: string;
  question: string;
  input: {
    metric: "usdc_supply_apy";
    protocols: ["aave-v3" | "compound-v3", "aave-v3" | "compound-v3"];
    timeframe?: string;
  };
  requireTimeframeCaveat?: boolean;
}

const cases = JSON.parse(
  await readFile(new URL("./cases.json", import.meta.url), "utf8")
) as EvalCase[];
const dataSource = createMarketDataSource({ DEMO_LIVE: "0" });

for (const testCase of cases) {
  const result = await compareMarkets(testCase.input, dataSource);
  const sourceIds = new Set(result.sources.map((source) => source.subgraphId));

  assert(result.rows.length >= 2, testCase.id, "expected at least two rows");
  assert(sourceIds.size >= 2, testCase.id, "expected at least two sources");
  assert(Boolean(result.asOf), testCase.id, "expected an as-of timestamp");
  assert(
    result.rows.every(
      (row) =>
        Boolean(row.subgraphId) &&
        Boolean(row.timestamp) &&
        Boolean(row.queryHash) &&
        Number.isFinite(row.value)
    ),
    testCase.id,
    "expected every numeric row to carry a complete citation"
  );
  assert(
    result.rows.every((row, index) => row.rank === index + 1),
    testCase.id,
    "expected stable one-based ranking"
  );
  if (testCase.requireTimeframeCaveat) {
    assert(
      result.caveats.some((caveat) => caveat.includes("timeframe")),
      testCase.id,
      "expected an explicit unsupported-timeframe caveat"
    );
  }

  console.log(`PASS ${testCase.id}: ${testCase.question}`);
}

console.log(`AskChing evals passed: ${cases.length}/${cases.length}`);

function assert(
  condition: unknown,
  caseId: string,
  message: string
): asserts condition {
  if (!condition) {
    throw new Error(`FAIL ${caseId}: ${message}`);
  }
}
