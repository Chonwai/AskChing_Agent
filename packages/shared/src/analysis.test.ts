import { describe, expect, it } from "vitest";

import { analyzeMarketObservations } from "./analysis.js";
import { MARKET_FIXTURES } from "./fixtures.js";
import {
  AnalysisConfidenceSchema,
  AnalysisObjectiveSchema,
  AnalysisSeveritySchema,
  AnalyzeMarketsResultSchema
} from "./schemas.js";

describe("market analysis contracts", () => {
  it("accepts only the supported objectives, severities, and confidence labels", () => {
    expect(AnalysisObjectiveSchema.options).toEqual([
      "yield_opportunity",
      "liquidity_stress",
      "evidence_quality"
    ]);
    expect(AnalysisSeveritySchema.parse("watch")).toBe("watch");
    expect(() => AnalysisConfidenceSchema.parse("certain")).toThrow();
  });

  it("requires every analysis citation to identify its metric", () => {
    const result = {
      objective: "yield_opportunity",
      asset: "USDC",
      protocols: ["aave-v3", "compound-v3"],
      metrics: ["supply_apy"],
      summary: "Aave leads the current peer set.",
      findings: [
        {
          severity: "info",
          claim: "Aave has the highest current supply APY.",
          calculation: "4.25 - 3.14 = 1.11 percentage points",
          supportingValues: [],
          citations: [
            {
              metric: "supply_apy",
              protocol: "aave-v3",
              asset: "USDC",
              subgraphId: "aave",
              timestamp: "2026-09-08T00:05:00.000Z",
              queryHash: "query-aave"
            },
            {
              metric: "supply_apy",
              protocol: "compound-v3",
              asset: "USDC",
              subgraphId: "compound",
              timestamp: "2026-09-08T00:00:00.000Z",
              queryHash: "query-compound"
            }
          ],
          confidence: "medium",
          caveats: []
        }
      ],
      gaps: [],
      asOf: "2026-09-08T00:05:00.000Z"
    };

    expect(AnalyzeMarketsResultSchema.parse(result).findings).toHaveLength(1);
    const missingMetric = structuredClone(result);
    delete (missingMetric.findings[0]!.citations[0] as { metric?: string }).metric;
    expect(() => AnalyzeMarketsResultSchema.parse(missingMetric)).toThrow();
  });
});

describe("yield opportunity analysis", () => {
  const observations = MARKET_FIXTURES.filter(
    (item) =>
      item.asset === "USDC" &&
      ["aave-v3", "compound-v3", "spark-lend"].includes(item.protocol) &&
      ["supply_apy", "utilization"].includes(item.metric)
  );

  it("explains the leader-to-runner-up spread with cited values", () => {
    const result = analyzeMarketObservations({
      objective: "yield_opportunity",
      asset: "USDC",
      protocols: ["aave-v3", "compound-v3", "spark-lend"],
      metrics: ["supply_apy", "utilization"],
      observations: [...observations],
      gaps: []
    });

    const finding = result.findings[0]!;
    expect(finding.claim).toContain("aave-v3");
    expect(finding.calculation).toContain("1.11 percentage points");
    expect(finding.supportingValues.filter(v => v.metric === "supply_apy")).toHaveLength(3);
    expect(new Set(finding.citations.map(c => c.subgraphId)).size).toBe(3);
    expect(finding.confidence).toBe("high");
    expect(finding.caveats.join(" ")).toContain("not a forecast");
  });

  it("fails closed with fewer than two cited supply sources", () => {
    expect(() =>
      analyzeMarketObservations({
        objective: "yield_opportunity",
        asset: "USDC",
        protocols: ["aave-v3", "compound-v3"],
        metrics: ["supply_apy"],
        observations: observations.filter(
          item => item.metric === "supply_apy" && item.protocol === "aave-v3"
        ),
        gaps: []
      })
    ).toThrow("Need at least 2 cited sources");
  });

  it("rejects observations from a different asset", () => {
    expect(() =>
      analyzeMarketObservations({
        objective: "yield_opportunity",
        asset: "USDC",
        protocols: ["aave-v3", "compound-v3"],
        metrics: ["supply_apy"],
        observations: [
          ...observations.filter(item => item.metric === "supply_apy").slice(0, 2),
          MARKET_FIXTURES.find(item => item.asset === "DAI")!
        ],
        gaps: []
      })
    ).toThrow("Mixed or unexpected observation");
  });
});
