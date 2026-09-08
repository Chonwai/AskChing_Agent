import { describe, expect, it, vi } from "vitest";

import { createMarketDataSource } from "./data-source.js";

describe("createMarketDataSource", () => {
  it("returns two cited observations without fetching in fixture mode", async () => {
    const fetchImpl = vi.fn(() => {
      throw new Error("fixture mode must not fetch");
    });
    const source = createMarketDataSource(
      { DEMO_LIVE: "0" },
      fetchImpl as unknown as typeof fetch
    );

    const observations = await source.getObservations("usdc_supply_apy", [
      "aave-v3",
      "compound-v3"
    ]);

    expect(fetchImpl).not.toHaveBeenCalled();
    expect(observations).toHaveLength(2);
    expect(new Set(observations.map((item) => item.subgraphId)).size).toBe(2);
    expect(observations.every((item) => item.queryHash.length > 0)).toBe(true);
  });

  it("fails clearly when live mode has no Graph API key", async () => {
    const source = createMarketDataSource({ DEMO_LIVE: "1" });

    await expect(
      source.getObservations("usdc_supply_apy", ["aave-v3", "compound-v3"])
    ).rejects.toThrow("GRAPH_API_KEY is required when DEMO_LIVE=1");
  });
});
