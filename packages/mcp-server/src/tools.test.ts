import {
  createMarketDataSource,
  type MarketDataSource
} from "@askching/shared";
import { describe, expect, it } from "vitest";

import { compareMarkets, researchBrief, riskScan } from "./tools.js";

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
      }
    };

    await expect(
      compareMarkets(
        { metric: "borrow_tvl", protocols: ["aave-v3", "compound-v3"] },
        dataSource
      )
    ).rejects.toThrow(/Unknown metric/);
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
    expect(result.gaps.some((gap) => gap.includes("No time-series data"))).toBe(
      true
    );
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
      }
    };

    await expect(
      riskScan({ protocols: ["aave-v3"], window: "7d" }, dataSource)
    ).rejects.toThrow(/at least two protocols/);
  });
});
