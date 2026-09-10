import { describe, expect, it } from "vitest";

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
