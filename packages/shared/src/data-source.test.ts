import { describe, expect, it, vi } from "vitest";

import { createMarketDataSource } from "./data-source.js";
import { LIVE_SOURCES } from "./source-config.js";

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

  it("collects per-source gaps when one subgraph fails instead of failing the fan-out", async () => {
    const [first, second] = LIVE_SOURCES;
    const firstUrl = `https://gateway.thegraph.com/api/subgraphs/id/${first!.subgraphId}`;
    const secondUrl = `https://gateway.thegraph.com/api/subgraphs/id/${second!.subgraphId}`;

    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === firstUrl) {
        return new Response("boom", { status: 500 });
      }
      if (url === secondUrl) {
        return new Response(
          JSON.stringify({
            data: {
              markets: [
                {
                  inputToken: { symbol: "USDC" },
                  rates: [
                    { rate: "5.10", side: "LENDER", type: "VARIABLE" }
                  ],
                  indexLastUpdatedTimestamp: "1788825600"
                }
              ],
              _meta: {
                deployment: "QmSecondDeployment",
                block: { number: "22100123", timestamp: "1788825600" }
              }
            }
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      throw new Error(`unexpected URL: ${url}`);
    });

    const source = createMarketDataSource(
      { DEMO_LIVE: "1", GRAPH_API_KEY: "test-graph-key" },
      fetchImpl as unknown as typeof fetch
    );

    // With exactly two sources and one failing, fewer than two cited
    // observations survive — the comparison must fail clearly, and the
    // settled gap must name the failed protocol.
    await expect(
      source.getObservations("usdc_supply_apy", ["aave-v3", "compound-v3"])
    ).rejects.toThrow(/aave-v3: .*HTTP 500/);
  });
});
