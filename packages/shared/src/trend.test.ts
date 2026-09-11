import { describe, expect, it } from "vitest";

import { MARKET_FIXTURES, MARKET_HISTORY_FIXTURES } from "./fixtures.js";
import {
  AnalyzeTrendsResultSchema,
  TREND_WINDOW_DAYS,
  TrendFindingSchema,
  TrendPointSchema,
  TrendWindowSchema,
  type TrendPoint
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

describe("market history fixtures", () => {
  const seriesKey = (point: (typeof MARKET_HISTORY_FIXTURES)[number]) =>
    `${point.metric}|${point.protocol}`;

  it("covers USDC supply_apy and utilization across three protocols for seven days", () => {
    expect(MARKET_HISTORY_FIXTURES).toHaveLength(42);
    expect(new Set(MARKET_HISTORY_FIXTURES.map(seriesKey)).size).toBe(6);
    expect(new Set(MARKET_HISTORY_FIXTURES.map((point) => point.days))).toEqual(
      new Set([0, 1, 2, 3, 4, 5, 6])
    );
    expect(
      new Set(MARKET_HISTORY_FIXTURES.map((point) => point.protocol))
    ).toEqual(new Set(["aave-v3", "compound-v3", "spark-lend"]));
    expect(
      new Set(MARKET_HISTORY_FIXTURES.map((point) => point.metric))
    ).toEqual(new Set(["supply_apy", "utilization"]));
    expect(
      MARKET_HISTORY_FIXTURES.every(
        (point) => point.asset === "USDC" && point.unit === "percent"
      )
    ).toBe(true);
  });

  it("gives every point a unique query hash, an increasing block, and an increasing day", () => {
    const hashes = MARKET_HISTORY_FIXTURES.map((point) => point.queryHash);
    expect(new Set(hashes).size).toBe(hashes.length);
    expect(hashes.every((hash) => hash.startsWith("sha256:fixture-"))).toBe(
      true
    );

    const bySeries = new Map<string, TrendPoint[]>();
    for (const point of MARKET_HISTORY_FIXTURES) {
      const key = seriesKey(point);
      const bucket = bySeries.get(key);
      if (bucket) {
        bucket.push(point);
      } else {
        bySeries.set(key, [point]);
      }
    }

    for (const points of bySeries.values()) {
      const ordered = [...points].sort((a, b) => a.days - b.days);
      expect(ordered).toHaveLength(7);
      expect(ordered.map((point) => point.days)).toEqual([
        0, 1, 2, 3, 4, 5, 6
      ]);
      for (let index = 1; index < ordered.length; index += 1) {
        expect(ordered[index]!.block!).toBeGreaterThan(
          ordered[index - 1]!.block!
        );
        expect(ordered[index]!.timestamp > ordered[index - 1]!.timestamp).toBe(
          true
        );
      }
      expect(
        ordered.every(
          (point) =>
            point.subgraphId.length > 0 &&
            point.deploymentId !== undefined &&
            point.block !== undefined &&
            point.timestamp.endsWith("Z")
        )
      ).toBe(true);
    }
  });

  it("anchors the newest history point to the spot fixture for the same market", () => {
    for (const point of MARKET_HISTORY_FIXTURES.filter(
      (item) => item.days === 6
    )) {
      const spot = MARKET_FIXTURES.find(
        (item) =>
          item.metric === point.metric &&
          item.protocol === point.protocol &&
          item.asset === "USDC"
      );
      expect(spot).toBeDefined();
      expect(point.value).toBe(spot!.value);
      expect(point.timestamp).toBe(spot!.timestamp);
      expect(point.block).toBe(spot!.block);
      expect(point.subgraphId).toBe(spot!.subgraphId);
    }
  });

  it("encodes a readable direction per protocol", () => {
    const latestOf = (metric: string, protocol: string, days: number) =>
      MARKET_HISTORY_FIXTURES.find(
        (point) =>
          point.metric === metric &&
          point.protocol === protocol &&
          point.days === days
      )!.value;

    // supply_apy: Aave rises, Compound falls, Spark is near-flat.
    expect(latestOf("supply_apy", "aave-v3", 6)).toBeGreaterThan(
      latestOf("supply_apy", "aave-v3", 0)
    );
    expect(latestOf("supply_apy", "compound-v3", 6)).toBeLessThan(
      latestOf("supply_apy", "compound-v3", 0)
    );
    expect(
      Math.abs(
        latestOf("supply_apy", "spark-lend", 6) -
          latestOf("supply_apy", "spark-lend", 0)
      )
    ).toBeLessThan(0.1);

    // utilization: Spark climbs into the watch band over the window.
    expect(latestOf("utilization", "spark-lend", 6)).toBeGreaterThan(90);
    expect(latestOf("utilization", "spark-lend", 0)).toBeLessThan(80);
  });
});
