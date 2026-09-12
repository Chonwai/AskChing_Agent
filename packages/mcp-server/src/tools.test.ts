import {
  createMarketDataSource,
  type MarketDataSource
} from "@askching/shared";
import { describe, expect, it } from "vitest";
import { z } from "zod";

import {
  AnalyzeMarketsCoreSchema,
  AnalyzeMarketsInputSchema,
  AnalyzeTrendsCoreSchema,
  AnalyzeTrendsInputSchema,
  CompareMarketsCoreSchema,
  DiscoverYieldsCoreSchema,
  DiscoverYieldsInputSchema,
  ResearchBriefCoreSchema,
  RiskScanCoreSchema,
  analyzeMarkets,
  analyzeTrends,
  compareMarkets,
  discoverYields,
  researchBrief,
  riskScan
} from "./tools.js";

describe("discoverYields", () => {
  it("applies defaults and returns separate cited lending and LP rankings", async () => {
    const result = await discoverYields(
      {},
      createMarketDataSource({ DEMO_LIVE: "0" })
    );

    expect(result.asset).toBe("USDC");
    expect(result.chain).toBe("ethereum-mainnet");
    expect(result.lending.length).toBeGreaterThanOrEqual(2);
    expect(result.dexLp.map(value => value.venue)).toEqual(
      expect.arrayContaining(["uniswap-v3", "curve"])
    );
    expect(result.crossDexWinner).not.toBeNull();
    expect(result.lending.every(value => value.category === "lending")).toBe(true);
    expect(result.dexLp.every(value => value.category === "dex_lp")).toBe(true);
  });

  it("normalizes lowercase fields and deduplicates requested filters", async () => {
    const fixture = createMarketDataSource({ DEMO_LIVE: "0" });
    const calls: unknown[] = [];
    const dataSource: MarketDataSource = {
      ...fixture,
      async getDexYieldOpportunities(input) {
        calls.push(input);
        return fixture.getDexYieldOpportunities(input);
      }
    };
    const result = await discoverYields({
      asset: "usdc",
      chain: "Ethereum-Mainnet",
      stablecoins: ["usdt", "USDT"],
      venues: ["curve", "curve"],
      minTvlUsd: 0,
      limitPerCategory: 2
    }, dataSource);

    expect(result.asset).toBe("USDC");
    expect(calls).toEqual([{ venues: ["curve"], stablecoins: ["USDT"] }]);
    expect(result.lending).toEqual([]);
    expect(result.crossDexWinner).toBeNull();
  });

  it("rejects unsupported assets, chains, and bounds before data access", () => {
    expect(() => DiscoverYieldsInputSchema.parse({ asset: "WETH" })).toThrow(/USDC/);
    expect(() => DiscoverYieldsInputSchema.parse({ chain: "sui-mainnet" })).toThrow(/ethereum-mainnet/);
    expect(() => DiscoverYieldsInputSchema.parse({ minTvlUsd: -1 })).toThrow();
    expect(() => DiscoverYieldsInputSchema.parse({ limitPerCategory: 21 })).toThrow();
    expect(z.object(DiscoverYieldsCoreSchema.shape).safeParse({ asset: "WETH" }).success).toBe(false);
  });

  it("preserves a successful DEX venue and its explicit partial-source gap", async () => {
    const fixture = createMarketDataSource({ DEMO_LIVE: "0" });
    const dataSource: MarketDataSource = {
      ...fixture,
      async getDexYieldOpportunities(input) {
        const [uniswap] = await fixture.getDexYieldOpportunities({
          ...input, venues: ["uniswap-v3"]
        });
        return [uniswap!, {
          venue: "curve",
          observations: [],
          gaps: [{ venue: "curve", reason: "Curve data is unavailable from its configured Graph source." }]
        }];
      }
    };
    const result = await discoverYields({ venues: ["uniswap-v3", "curve"] }, dataSource);
    expect(result.dexLp.length).toBeGreaterThan(0);
    expect(result.crossDexWinner).toBeNull();
    expect(result.gaps).toEqual(expect.arrayContaining([
      expect.objectContaining({ venue: "curve", reason: expect.stringMatching(/unavailable/) })
    ]));
  });
});

describe("analyzeMarkets", () => {
  it.each([
    ["yield_opportunity", ["supply_apy", "utilization"]],
    ["liquidity_stress", ["utilization", "tvl"]],
    ["evidence_quality", ["supply_apy", "borrow_apy", "tvl", "utilization"]]
  ] as const)("runs the %s objective with its metric defaults", async (objective, metrics) => {
    const result = await analyzeMarkets(
      {
        objective,
        asset: "usdc",
        protocols: ["aave-v3", "compound-v3"]
      },
      createMarketDataSource({ DEMO_LIVE: "0" })
    );

    expect(result.objective).toBe(objective);
    expect(result.asset).toBe("USDC");
    expect(result.metrics).toEqual(metrics);
    expect(result.findings.length).toBeGreaterThan(0);
    expect(result.findings.every((finding) => finding.citations.length >= 2)).toBe(true);
  });

  it("rejects missing primary objective metrics", () => {
    expect(() => AnalyzeMarketsInputSchema.parse({
      objective: "yield_opportunity",
      metrics: ["utilization"],
      protocols: ["aave-v3", "compound-v3"]
    })).toThrow(/supply_apy/);
    expect(() => AnalyzeMarketsInputSchema.parse({
      objective: "liquidity_stress",
      metrics: ["tvl"],
      protocols: ["aave-v3", "compound-v3"]
    })).toThrow(/utilization/);
  });

  it("turns missing protocol-metric coverage and timeframe intent into explicit gaps", async () => {
    const result = await analyzeMarkets(
      {
        objective: "evidence_quality",
        metrics: ["supply_apy", "tvl"],
        timeframe: "7d",
        protocols: ["aave-v3", "spark-lend"]
      },
      createMarketDataSource({ DEMO_LIVE: "0" })
    );

    expect(result.gaps).toEqual(expect.arrayContaining([
      expect.objectContaining({ metric: "tvl", protocol: "spark-lend" }),
      expect.objectContaining({ reason: expect.stringContaining("spot-only") })
    ]));
  });

  it("exposes objective, metric, asset, and protocol validation in the MCP shape", () => {
    const exposed = z.object(AnalyzeMarketsCoreSchema.shape);
    expect(exposed.safeParse({
      objective: "yield_opportunity",
      metrics: ["borrow_tvl"],
      protocols: ["aave-v3", "compound-v3"]
    }).success).toBe(false);
    expect(exposed.safeParse({
      objective: "yield_opportunity",
      asset: "ETH!!",
      protocols: ["aave-v3", "compound-v3"]
    }).success).toBe(false);
  });
});

describe("compareMarkets", () => {
  it("returns a normalized comparison with two fixture citations", async () => {
    const dataSource = createMarketDataSource({ DEMO_LIVE: "0" });

    const result = await compareMarkets(
      {
        metric: "usdc_supply_apy",
        protocols: ["aave-v3", "compound-v3"]
      },
      dataSource
    );

    expect(result.rows).toHaveLength(2);
    expect(result.sources).toHaveLength(2);
    expect(new Set(result.sources.map((source) => source.subgraphId)).size).toBe(
      2
    );
    expect(result.asOf).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("resolves the legacy alias to supply_apy/USDC on the comparison", async () => {
    const dataSource = createMarketDataSource({ DEMO_LIVE: "0" });

    const result = await compareMarkets(
      { metric: "usdc_supply_apy", protocols: ["aave-v3", "compound-v3"] },
      dataSource
    );

    expect(result.metric).toBe("supply_apy");
    expect(result.asset).toBe("USDC");
  });

  it("defaults asset to USDC when omitted", async () => {
    const dataSource = createMarketDataSource({ DEMO_LIVE: "0" });

    const result = await compareMarkets(
      { metric: "supply_apy", protocols: ["aave-v3", "compound-v3"] },
      dataSource
    );

    expect(result.asset).toBe("USDC");
  });

  it("compares a non-default asset when requested", async () => {
    const dataSource = createMarketDataSource({ DEMO_LIVE: "0" });

    const result = await compareMarkets(
      { metric: "supply_apy", asset: "WETH", protocols: ["aave-v3", "compound-v3"] },
      dataSource
    );

    expect(result.asset).toBe("WETH");
    expect(result.rows.every((row) => row.asset === "WETH")).toBe(true);
  });

  it("compares tvl with usd unit", async () => {
    const dataSource = createMarketDataSource({ DEMO_LIVE: "0" });

    const result = await compareMarkets(
      { metric: "tvl", asset: "USDC", protocols: ["aave-v3", "compound-v3"] },
      dataSource
    );

    expect(result.metric).toBe("tvl");
    expect(result.rows.every((row) => row.unit === "usd")).toBe(true);
    expect(result.caveats.some((caveat) => caveat.includes("largest"))).toBe(true);
  });

  it("rejects requests with fewer than two protocols before data access", async () => {
    const dataSource: MarketDataSource = {
      async getObservations() {
        throw new Error("data source should not be called");
      },
      async getHistory() {
        throw new Error("data source should not be called");
      }
    };

    await expect(
      compareMarkets(
        { metric: "usdc_supply_apy", protocols: ["aave-v3"] },
        dataSource
      )
    ).rejects.toThrow(/at least 2/);
  });

  it("rejects an unknown metric with a registry hint", async () => {
    const dataSource: MarketDataSource = {
      async getObservations() {
        throw new Error("data source should not be called");
      },
      async getHistory() {
        throw new Error("data source should not be called");
      }
    };

    await expect(
      compareMarkets(
        { metric: "borrow_tvl", protocols: ["aave-v3", "compound-v3"] },
        dataSource
      )
    ).rejects.toThrow(/Unknown metric/);
  });

  it("exposes metric/asset validation in the MCP input schema (shape)", () => {
    // The MCP SDK re-wraps the registered .shape via objectFromShape, so the
    // field-level refinements must reject an unknown metric / bad asset even
    // without the runtime superRefine path.
    const exposed = CompareMarketsCoreSchema.shape;
    const shapeSchema = z
      .object(exposed)
      .extend({
        protocols: z.array(z.string()).min(2)
      });

    const badMetric = shapeSchema.safeParse({
      metric: "borrow_tvl",
      protocols: ["aave-v3", "compound-v3"]
    });
    expect(badMetric.success).toBe(false);

    const badAsset = shapeSchema.safeParse({
      metric: "supply_apy",
      asset: "ETH!!",
      protocols: ["aave-v3", "compound-v3"]
    });
    expect(badAsset.success).toBe(false);

    const good = shapeSchema.safeParse({
      metric: "supply_apy",
      asset: "WETH",
      protocols: ["aave-v3", "compound-v3"]
    });
    expect(good.success).toBe(true);
  });

  it("exposes the same validation on research_brief and risk_scan shapes", () => {
    const researchShape = z.object(ResearchBriefCoreSchema.shape);
    // research_brief requires question
    expect(
      researchShape.safeParse({ metric: "borrow_tvl", question: "q" }).success
    ).toBe(false);
    expect(
      researchShape.safeParse({
        metric: "supply_apy",
        asset: "ETH!!",
        question: "q"
      }).success
    ).toBe(false);
    expect(
      researchShape.safeParse({
        metric: "supply_apy",
        asset: "USDT",
        question: "q"
      }).success
    ).toBe(true);

    const riskShape = z.object(RiskScanCoreSchema.shape);
    // risk_scan requires protocols + window
    expect(
      riskShape.safeParse({
        metric: "borrow_tvl",
        protocols: ["aave-v3"],
        window: "7d"
      }).success
    ).toBe(false);
    expect(
      riskShape.safeParse({
        metric: "supply_apy",
        asset: "ETH!!",
        protocols: ["aave-v3"],
        window: "7d"
      }).success
    ).toBe(false);
    expect(
      riskShape.safeParse({
        metric: "supply_apy",
        asset: "USDT",
        protocols: ["aave-v3"],
        window: "7d"
      }).success
    ).toBe(true);
  });
});

describe("researchBrief", () => {
  it("returns a cited brief with conclusion and key figures from fixtures", async () => {
    const dataSource = createMarketDataSource({ DEMO_LIVE: "0" });

    const result = await researchBrief(
      {
        question: "Compare USDC supply APY across Aave V3 and Compound V3",
        protocols: ["aave-v3", "compound-v3"]
      },
      dataSource
    );

    expect(result.brief.conclusion).toBeTruthy();
    expect(result.brief.keyFigures).toHaveLength(2);
    expect(result.brief.keyFigures[0]!.protocol).toBe("aave-v3");
    expect(result.brief.keyFigures[0]!.value).toBe(4.25);
    expect(result.brief.asOf).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(result.brief.risks.length).toBeGreaterThan(0);
    expect(result.sources).toHaveLength(2);
    expect(result.caveats).toBeInstanceOf(Array);
  });

  it("honors the requested metric and asset in the brief", async () => {
    const dataSource = createMarketDataSource({ DEMO_LIVE: "0" });

    const result = await researchBrief(
      {
        question: "Compare WETH supply APY across Aave and Compound",
        protocols: ["aave-v3", "compound-v3"],
        metric: "supply_apy",
        asset: "WETH"
      },
      dataSource
    );

    expect(result.brief.conclusion).toContain("WETH");
    expect(result.brief.keyFigures.every((figure) => figure.metric === "supply_apy")).toBe(
      true
    );
  });

  it("rejects fewer than two protocols", async () => {
    const dataSource: MarketDataSource = {
      async getObservations() {
        throw new Error("data source should not be called");
      },
      async getHistory() {
        throw new Error("data source should not be called");
      }
    };

    await expect(
      researchBrief(
        { question: "single protocol", protocols: ["aave-v3"] },
        dataSource
      )
    ).rejects.toThrow(/at least two protocols/);
  });
});

describe("analyzeTrends", () => {
  const fixtureSource = () => createMarketDataSource({ DEMO_LIVE: "0" });

  it("returns one cited trend finding per protocol over the fixture window", async () => {
    const result = await analyzeTrends(
      {
        metric: "supply_apy",
        asset: "usdc",
        protocols: ["aave-v3", "compound-v3", "spark-lend"],
        window: "7d"
      },
      fixtureSource()
    );

    expect(result.metric).toBe("supply_apy");
    expect(result.asset).toBe("USDC");
    expect(result.window).toBe("7d");
    expect(result.findings).toHaveLength(3);
    expect(result.gaps).toEqual([]);
    expect(result.asOf).toBe("2026-09-08T00:05:00.000Z");

    const aave = result.findings.find((finding) => finding.protocol === "aave-v3")!;
    expect(aave.stats.direction).toBe("rising");
    expect(aave.stats.change).toBe(0.45);
    expect(aave.stats.slopePerDay).toBeGreaterThan(0);
    expect(aave.severity).toBe("info");
    expect(aave.confidence).toBe("high");
    expect(aave.points).toHaveLength(7);
    expect(aave.citations.length).toBeGreaterThanOrEqual(2);
    expect(aave.caveats).toContain(
      "Historical trend is descriptive, not a forecast or financial recommendation."
    );

    const spark = result.findings.find((finding) => finding.protocol === "spark-lend")!;
    expect(spark.stats.direction).toBe("flat");
  });

  it("raises severity for a utilization trend that moves far enough", async () => {
    const result = await analyzeTrends(
      {
        metric: "utilization",
        protocols: ["aave-v3", "compound-v3", "spark-lend"],
        window: "7d"
      },
      fixtureSource()
    );

    const spark = result.findings.find((finding) => finding.protocol === "spark-lend")!;
    expect(spark.stats.changePct).toBeCloseTo(18.589744, 6);
    expect(spark.severity).toBe("watch");
    expect(result.metric).toBe("utilization");
  });

  it("resolves the legacy alias and defaults the asset to USDC", () => {
    const parsed = AnalyzeTrendsInputSchema.parse({
      metric: "usdc_supply_apy",
      protocols: ["aave-v3", "compound-v3"],
      window: "7d"
    });

    expect(parsed.metric).toBe("supply_apy");
    expect(parsed.asset).toBe("USDC");
  });

  it("turns a window wider than the available history into explicit gaps", async () => {
    const result = await analyzeTrends(
      {
        metric: "supply_apy",
        protocols: ["aave-v3", "compound-v3", "spark-lend"],
        window: "30d"
      },
      fixtureSource()
    );

    expect(result.window).toBe("30d");
    expect(result.gaps).toHaveLength(3);
    expect(
      result.gaps.every((gap) => gap.reason.includes("Requested 30d window has 7 usable"))
    ).toBe(true);
    expect(result.findings.every((finding) => finding.confidence === "medium")).toBe(true);
  });

  it("reports a requested protocol without history as an explicit gap", async () => {
    const result = await analyzeTrends(
      {
        metric: "supply_apy",
        protocols: ["aave-v3", "compound-v3", "zerolend"],
        window: "7d"
      },
      fixtureSource()
    );

    expect(result.findings.map((finding) => finding.protocol)).toEqual([
      "aave-v3",
      "compound-v3"
    ]);
    expect(result.gaps).toEqual([
      expect.objectContaining({
        metric: "supply_apy",
        protocol: "zerolend",
        reason: expect.stringContaining("No USDC supply_apy history returned for zerolend")
      })
    ]);
    expect(result.findings.every((finding) => finding.confidence === "medium")).toBe(true);
  });

  it("fails closed when fewer than two cited series survive", async () => {
    await expect(
      analyzeTrends(
        {
          metric: "supply_apy",
          protocols: ["aave-v3", "zerolend"],
          window: "7d"
        },
        fixtureSource()
      )
    ).rejects.toThrow(/at least 2 cited trend series.*zerolend/s);
  });

  it("rejects fewer than two protocols before data access", async () => {
    const dataSource: MarketDataSource = {
      async getObservations() {
        throw new Error("data source should not be called");
      },
      async getHistory() {
        throw new Error("data source should not be called");
      }
    };

    await expect(
      analyzeTrends(
        { metric: "supply_apy", protocols: ["aave-v3"], window: "7d" },
        dataSource
      )
    ).rejects.toThrow(/at least 2/);
  });

  it("exposes window, metric, and asset validation in the MCP shape", () => {
    const exposed = z.object(AnalyzeTrendsCoreSchema.shape);
    const protocols = ["aave-v3", "compound-v3"];

    expect(
      exposed.safeParse({ metric: "borrow_tvl", protocols, window: "7d" }).success
    ).toBe(false);
    expect(
      exposed.safeParse({ metric: "supply_apy", protocols, window: "90d" }).success
    ).toBe(false);
    expect(
      exposed.safeParse({
        metric: "supply_apy",
        asset: "ETH!!",
        protocols,
        window: "7d"
      }).success
    ).toBe(false);
    expect(
      exposed.safeParse({ metric: "supply_apy", protocols, window: "7d" }).success
    ).toBe(true);
  });
});

describe("riskScan", () => {
  it("returns peer-relative findings with an explicit time-series gap", async () => {
    const dataSource = createMarketDataSource({ DEMO_LIVE: "0" });

    const result = await riskScan(
      {
        protocols: ["aave-v3", "compound-v3"],
        window: "7d"
      },
      dataSource
    );

    expect(result.findings).toHaveLength(2);
    expect(result.findings[0]!.protocol).toBe("aave-v3");
    expect(result.findings[0]!.asset).toBe("USDC");
    expect(result.findings[0]!.note).toContain("Highest USDC supply_apy");
    expect(result.gaps.length).toBeGreaterThan(0);
    expect(
      result.gaps.some((gap) => gap.reason.includes("No time-series data"))
    ).toBe(true);
    expect(
      result.gaps.every(
        (gap) =>
          typeof gap.asset === "string" &&
          typeof gap.protocol === "string" &&
          typeof gap.reason === "string"
      )
    ).toBe(true);
    expect(result.asOf).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(result.sources).toHaveLength(2);
  });

  it("scans multiple assets and groups findings by asset", async () => {
    const dataSource = createMarketDataSource({ DEMO_LIVE: "0" });

    const result = await riskScan(
      {
        protocols: ["aave-v3", "compound-v3"],
        assets: ["USDC", "WETH"],
        window: "7d"
      },
      dataSource
    );

    const assets = new Set(result.findings.map((finding) => finding.asset));
    expect(assets).toEqual(new Set(["USDC", "WETH"]));
    expect(result.findings).toHaveLength(4);
  });

  it("supports the single asset alias", async () => {
    const dataSource = createMarketDataSource({ DEMO_LIVE: "0" });

    const result = await riskScan(
      {
        protocols: ["aave-v3", "compound-v3"],
        asset: "WETH",
        window: "7d"
      },
      dataSource
    );

    expect(result.findings.every((finding) => finding.asset === "WETH")).toBe(true);
  });

  it("rejects fewer than two protocols", async () => {
    const dataSource: MarketDataSource = {
      async getObservations() {
        throw new Error("data source should not be called");
      },
      async getHistory() {
        throw new Error("data source should not be called");
      }
    };

    await expect(
      riskScan({ protocols: ["aave-v3"], window: "7d" }, dataSource)
    ).rejects.toThrow(/at least two protocols/);
  });
});
