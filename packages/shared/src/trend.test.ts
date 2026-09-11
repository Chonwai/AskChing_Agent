import { describe, expect, it } from "vitest";

import {
  AnalyzeTrendsResultSchema,
  TREND_WINDOW_DAYS,
  TrendFindingSchema,
  TrendPointSchema,
  TrendWindowSchema
} from "./schemas.js";

const POINT = {
  metric: "supply_apy",
  asset: "USDC",
  rateType: "variable",
  value: 4.25,
  unit: "percent",
  protocol: "aave-v3",
  subgraphId: "JCNWRypm7FYwV8fx5HhzZPSFaMxgkPuw4TnR3Gpi81zk",
  deploymentId: "fixture:aave-v3-mainnet",
  block: 21_100_100,
  timestamp: "2026-09-08T00:05:00.000Z",
  queryHash: "sha256:fixture-aave-usdc-supply-apy-d6",
  days: 6
} as const;

const CITATION = {
  metric: "supply_apy",
  protocol: "aave-v3",
  asset: "USDC",
  subgraphId: "JCNWRypm7FYwV8fx5HhzZPSFaMxgkPuw4TnR3Gpi81zk",
  timestamp: "2026-09-08T00:05:00.000Z",
  queryHash: "sha256:fixture-aave-usdc-supply-apy-d6"
} as const;

const STATS = {
  latest: 4.25,
  earliest: 3.8,
  min: 3.8,
  max: 4.25,
  change: 0.45,
  changePct: 11.84,
  slopePerDay: 0.0764,
  direction: "rising",
  volatility: 0.0229
} as const;

describe("trend schema contracts", () => {
  it("accepts only the supported trend windows and maps them to lookback days", () => {
    expect(TrendWindowSchema.options).toEqual(["7d", "30d"]);
    expect(() => TrendWindowSchema.parse("90d")).toThrow();
    expect(TREND_WINDOW_DAYS).toEqual({ "7d": 7, "30d": 30 });
  });

  it("inherits the citation invariant on every trend point", () => {
    expect(TrendPointSchema.parse(POINT).days).toBe(6);

    // A trend point without the citation spine must fail closed.
    const { queryHash: _omitted, ...uncited } = POINT;
    expect(() => TrendPointSchema.parse(uncited)).toThrow();

    expect(() => TrendPointSchema.parse({ ...POINT, days: -1 })).toThrow();
    expect(() => TrendPointSchema.parse({ ...POINT, days: 1.5 })).toThrow();
  });

  it("requires at least two cited points and a calculation per trend finding", () => {
    const finding = {
      severity: "info",
      protocol: "aave-v3",
      claim: "aave-v3 USDC supply_apy rose over 7d.",
      calculation: "4.25 - 3.80 = 0.45 percentage points",
      stats: STATS,
      points: [POINT, { ...POINT, days: 0, value: 3.8 }],
      citations: [CITATION, { ...CITATION, queryHash: "sha256:other" }],
      confidence: "high",
      caveats: ["Historical trend is descriptive, not a forecast."]
    };

    expect(TrendFindingSchema.parse(finding).points).toHaveLength(2);

    expect(() =>
      TrendFindingSchema.parse({ ...finding, citations: [CITATION] })
    ).toThrow();
    expect(() =>
      TrendFindingSchema.parse({ ...finding, points: [POINT] })
    ).toThrow();
    expect(() =>
      TrendFindingSchema.parse({ ...finding, calculation: "" })
    ).toThrow();
    expect(() =>
      TrendFindingSchema.parse({ ...finding, stats: { ...STATS, direction: "sideways" } })
    ).toThrow();
  });

  it("requires at least two protocols and one finding per trends result", () => {
    const result = {
      metric: "supply_apy",
      asset: "USDC",
      protocols: ["aave-v3", "compound-v3"],
      window: "7d",
      summary: "Aave rose while Compound fell over 7d.",
      findings: [
        {
          severity: "info",
          protocol: "aave-v3",
          claim: "aave-v3 USDC supply_apy rose over 7d.",
          calculation: "4.25 - 3.80 = 0.45 percentage points",
          stats: STATS,
          points: [POINT, { ...POINT, days: 0, value: 3.8 }],
          citations: [CITATION, { ...CITATION, queryHash: "sha256:other" }],
          confidence: "high",
          caveats: []
        }
      ],
      gaps: [],
      asOf: "2026-09-08T00:05:00.000Z"
    };

    expect(AnalyzeTrendsResultSchema.parse(result).window).toBe("7d");

    expect(() =>
      AnalyzeTrendsResultSchema.parse({ ...result, protocols: ["aave-v3"] })
    ).toThrow();
    expect(() =>
      AnalyzeTrendsResultSchema.parse({ ...result, findings: [] })
    ).toThrow();
    expect(() =>
      AnalyzeTrendsResultSchema.parse({ ...result, window: "90d" })
    ).toThrow();
  });
});
