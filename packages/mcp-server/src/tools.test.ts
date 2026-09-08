import {
  createMarketDataSource,
  type MarketDataSource
} from "@askching/shared";
import { describe, expect, it } from "vitest";

import { compareMarkets } from "./tools.js";

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
