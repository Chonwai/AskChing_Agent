import { readFile } from "node:fs/promises";

import { createMarketDataSource } from "../packages/shared/src/index.js";
import {
  analyzeMarkets,
  compareMarkets,
  researchBrief,
  riskScan
} from "../packages/mcp-server/src/tools.js";

type EvalKind = "compare_markets" | "research_brief" | "risk_scan" | "analyze_markets";
type EvalProtocol =
  | "aave-v3"
  | "compound-v3"
  | "spark-lend"
  | "aave-v2"
  | "uwu-lend"
  | "zerolend";

interface EvalCase {
  id: string;
  question: string;
  kind?: EvalKind;
  input: {
    metric?: string;
    asset?: string;
    question?: string;
    protocols: EvalProtocol[];
    timeframe?: string;
    assets?: string[];
    window?: string;
    objective?: "yield_opportunity" | "liquidity_stress" | "evidence_quality";
    metrics?: string[];
  };
  requireTimeframeCaveat?: boolean;
  requireSpotOnlyGap?: boolean;
}

const cases = JSON.parse(
  await readFile(new URL("./cases.json", import.meta.url), "utf8")
) as EvalCase[];
const dataSource = createMarketDataSource({ DEMO_LIVE: "0" });

for (const testCase of cases) {
  const kind = testCase.kind ?? "compare_markets";
  const sourceIds = new Set<string>();

  if (kind === "compare_markets") {
    const result = await compareMarkets(testCase.input, dataSource);
    result.sources.forEach((source) => sourceIds.add(source.subgraphId));

    assert(result.rows.length >= 2, testCase.id, "expected at least two rows");
    assert(sourceIds.size >= 2, testCase.id, "expected at least two sources");
    assert(Boolean(result.asOf), testCase.id, "expected an as-of timestamp");
    assert(
      result.rows.every(
        (row) =>
          Boolean(row.subgraphId) &&
          Boolean(row.timestamp) &&
          Boolean(row.queryHash) &&
          Number.isFinite(row.value) &&
          Boolean(row.asset)
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
  } else if (kind === "research_brief") {
    const result = await researchBrief(testCase.input, dataSource);
    result.sources.forEach((source) => sourceIds.add(source.subgraphId));

    assert(
      typeof result.brief.conclusion === "string" &&
        result.brief.conclusion.length > 0,
      testCase.id,
      "expected a non-empty brief conclusion"
    );
    assert(
      result.brief.keyFigures.length >= 2,
      testCase.id,
      "expected at least two key figures"
    );
    assert(
      result.brief.keyFigures.every(
        (figure) =>
          Boolean(figure.protocol) &&
          Boolean(figure.metric) &&
          Number.isFinite(figure.value) &&
          Boolean(figure.source)
      ),
      testCase.id,
      "expected every key figure to carry protocol, metric, value, and source"
    );
    if (testCase.input.asset) {
      assert(
        result.brief.keyFigures.every(
          (figure) => figure.metric === testCase.input.metric
        ),
        testCase.id,
        "expected key figures to honor the requested metric"
      );
    }
    assert(
      !Number.isNaN(Date.parse(result.brief.asOf)),
      testCase.id,
      "expected a valid ISO as-of timestamp"
    );
    assert(
      result.sources.length >= 2,
      testCase.id,
      "expected at least two sources"
    );
    assert(
      result.sources.every(
        (source) =>
          Boolean(source.subgraphId) &&
          Boolean(source.timestamp) &&
          Boolean(source.queryHash)
      ),
      testCase.id,
      "expected every source to carry a complete citation"
    );
  } else if (kind === "risk_scan") {
    const result = await riskScan(testCase.input, dataSource);
    result.sources.forEach((source) => sourceIds.add(source.subgraphId));

    assert(
      result.findings.every(
        (finding) =>
          Boolean(finding.protocol) &&
          Boolean(finding.metric) &&
          Boolean(finding.asset) &&
          typeof finding.note === "string" &&
          finding.note.length > 0 &&
          Number.isFinite(finding.value)
      ),
      testCase.id,
      "expected every finding to carry protocol, metric, asset, note, and value"
    );
    assert(
      Array.isArray(result.gaps),
      testCase.id,
      "expected gaps to be an array"
    );
    assert(
      result.gaps.every(
        (gap) =>
          typeof gap.asset === "string" &&
          typeof gap.protocol === "string" &&
          typeof gap.reason === "string"
      ),
      testCase.id,
      "expected every gap to carry asset, protocol, and reason"
    );
    assert(
      !Number.isNaN(Date.parse(result.asOf)),
      testCase.id,
      "expected a valid ISO as-of timestamp"
    );
    assert(
      result.sources.length >= 2,
      testCase.id,
      "expected at least two sources"
    );
  } else if (kind === "analyze_markets") {
    const result = await analyzeMarkets(testCase.input, dataSource);
    result.findings.flatMap(finding => finding.citations).forEach(
      citation => sourceIds.add(citation.subgraphId)
    );

    assert(result.summary.length > 0, testCase.id, "expected a non-empty analysis summary");
    assert(result.findings.length > 0, testCase.id, "expected at least one finding");
    assert(
      result.findings.every(
        finding =>
          finding.calculation.length > 0 &&
          finding.citations.length >= 2 &&
          finding.citations.every(
            citation =>
              Boolean(citation.metric) &&
              Boolean(citation.subgraphId) &&
              Boolean(citation.timestamp) &&
              Boolean(citation.queryHash)
          )
      ),
      testCase.id,
      "expected every finding to have a calculation and at least two complete citations"
    );
    assert(
      !Number.isNaN(Date.parse(result.asOf)),
      testCase.id,
      "expected a valid ISO as-of timestamp"
    );
    assert(sourceIds.size >= 2, testCase.id, "expected at least two distinct sources");
    if (testCase.requireSpotOnlyGap) {
      assert(
        result.gaps.some(gap => gap.reason.includes("spot-only")),
        testCase.id,
        "expected an explicit spot-only historical gap"
      );
    }
  } else {
    throw new Error(`FAIL ${testCase.id}: unsupported kind '${kind}'`);
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
