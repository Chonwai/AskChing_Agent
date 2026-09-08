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
    expect(result.findings[0]!.note).toContain("Highest USDC supply APY");
    expect(result.gaps.length).toBeGreaterThan(0);
    expect(result.gaps[0]).toContain("No time-series data");
    expect(result.asOf).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(result.sources).toHaveLength(2);
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
