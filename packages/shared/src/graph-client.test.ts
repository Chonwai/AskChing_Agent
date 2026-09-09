import { describe, expect, it, vi } from "vitest";

import { GET_MARKETS_QUERY, GraphGatewayClient } from "./graph-client.js";
import { LIVE_SOURCES } from "./source-config.js";

const AAVE_V3 = LIVE_SOURCES[0]!;

function envelope(overrides: Record<string, unknown> = {}) {
  return {
    data: {
      markets: [
        {
          inputToken: { symbol: "USDC", decimals: 6 },
          rates: [
            { rate: "4.75", side: "LENDER", type: "VARIABLE" },
            { rate: "9.50", side: "LENDER", type: "STABLE" },
            { rate: "6.25", side: "BORROWER", type: "VARIABLE" },
            { rate: "3.10", side: "BORROWER", type: "STABLE" }
          ],
          totalValueLockedUSD: "1250000000",
          totalDepositBalanceUSD: "1000000000",
          totalBorrowBalanceUSD: "784000000",
          indexLastUpdatedTimestamp: "1788825600",
          isActive: true
        }
      ],
      _meta: {
        deployment: "QmLiveDeployment",
        block: { number: "22100123", timestamp: "1788825600" }
      }
    },
    ...overrides
  } as unknown;
}

function mockFetch(body: unknown) {
  return vi.fn<typeof fetch>(async () =>
    new Response(JSON.stringify(body), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    })
  );
}

describe("GraphGatewayClient.getMarketObservation", () => {
  it("extracts the max LENDER/VARIABLE rate for supply_apy/USDC", async () => {
    const fetchImpl = mockFetch(envelope());
    const client = new GraphGatewayClient({
      apiKey: "test-graph-key",
      fetchImpl: fetchImpl as typeof fetch
    });

    const result = await client.getMarketObservation(
      AAVE_V3,
      "supply_apy",
      "USDC"
    );

    expect(result.metric).toBe("supply_apy");
    expect(result.asset).toBe("USDC");
    expect(result.value).toBe(4.75);
    expect(result.unit).toBe("percent");
    expect(result.rateType).toBe("variable");
    expect(result.protocol).toBe("aave-v3");
    expect(result.deploymentId).toBe("QmLiveDeployment");
    expect(result.block).toBe(22_100_123);
    expect(result.timestamp).toBe("2026-09-08T00:00:00.000Z");
    expect(result.queryHash).toMatch(/^sha256:[a-f0-9]{64}$/);
  });

  it("extracts the min BORROWER/VARIABLE rate for borrow_apy", async () => {
    const fetchImpl = mockFetch(
      envelope({
        data: {
          markets: [
            {
              inputToken: { symbol: "USDC", decimals: 6 },
              rates: [
                { rate: "7.50", side: "BORROWER", type: "VARIABLE" },
                { rate: "6.25", side: "BORROWER", type: "VARIABLE" },
                { rate: "4.75", side: "LENDER", type: "VARIABLE" }
              ],
              totalValueLockedUSD: "1250000000",
              totalDepositBalanceUSD: "1000000000",
              totalBorrowBalanceUSD: "784000000",
              indexLastUpdatedTimestamp: "1788825600",
              isActive: true
            }
          ],
          _meta: {
            deployment: "QmLiveDeployment",
            block: { number: "22100123", timestamp: "1788825600" }
          }
        }
      })
    );
    const client = new GraphGatewayClient({
      apiKey: "test-graph-key",
      fetchImpl: fetchImpl as typeof fetch
    });

    const result = await client.getMarketObservation(
      AAVE_V3,
      "borrow_apy",
      "USDC"
    );

    expect(result.metric).toBe("borrow_apy");
    expect(result.value).toBe(6.25);
    expect(result.unit).toBe("percent");
  });

  it("extracts the max totalValueLockedUSD for tvl with usd unit", async () => {
    const fetchImpl = mockFetch(
      envelope({
        data: {
          markets: [
            {
              inputToken: { symbol: "USDC", decimals: 6 },
              rates: null,
              totalValueLockedUSD: "890000000",
              totalDepositBalanceUSD: "700000000",
              totalBorrowBalanceUSD: "500000000",
              indexLastUpdatedTimestamp: "1788825600",
              isActive: true
            },
            {
              inputToken: { symbol: "USDC", decimals: 6 },
              rates: null,
              totalValueLockedUSD: "1250000000",
              totalDepositBalanceUSD: "1000000000",
              totalBorrowBalanceUSD: "784000000",
              indexLastUpdatedTimestamp: "1788825600",
              isActive: true
            }
          ],
          _meta: {
            deployment: "QmLiveDeployment",
            block: { number: "22100123", timestamp: "1788825600" }
          }
        }
      })
    );
    const client = new GraphGatewayClient({
      apiKey: "test-graph-key",
      fetchImpl: fetchImpl as typeof fetch
    });

    const result = await client.getMarketObservation(AAVE_V3, "tvl", "USDC");

    expect(result.metric).toBe("tvl");
    expect(result.value).toBe(1_250_000_000);
    expect(result.unit).toBe("usd");
    expect(result.rateType).toBeUndefined();
  });

  it("computes utilization as borrow/deposit ratio and picks the max market", async () => {
    const fetchImpl = mockFetch(
      envelope({
        data: {
          markets: [
            {
              inputToken: { symbol: "USDC", decimals: 6 },
              rates: null,
              totalValueLockedUSD: "1250000000",
              totalDepositBalanceUSD: "1000000000",
              totalBorrowBalanceUSD: "784000000",
              indexLastUpdatedTimestamp: "1788825600",
              isActive: true
            },
            {
              inputToken: { symbol: "USDC", decimals: 6 },
              rates: null,
              totalValueLockedUSD: "100000000",
              totalDepositBalanceUSD: "50000000",
              totalBorrowBalanceUSD: "45000000",
              indexLastUpdatedTimestamp: "1788825600",
              isActive: true
            }
          ],
          _meta: {
            deployment: "QmLiveDeployment",
            block: { number: "22100123", timestamp: "1788825600" }
          }
        }
      })
    );
    const client = new GraphGatewayClient({
      apiKey: "test-graph-key",
      fetchImpl: fetchImpl as typeof fetch
    });

    const result = await client.getMarketObservation(
      AAVE_V3,
      "utilization",
      "USDC"
    );

    expect(result.metric).toBe("utilization");
    expect(result.unit).toBe("percent");
    // 784/1000 = 78.4% vs 45/50 = 90% → max = 90
    expect(result.value).toBe(90);
  });

  it("skips markets with zero deposits when computing utilization", async () => {
    const fetchImpl = mockFetch(
      envelope({
        data: {
          markets: [
            {
              inputToken: { symbol: "USDC", decimals: 6 },
              rates: null,
              totalValueLockedUSD: "0",
              totalDepositBalanceUSD: "0",
              totalBorrowBalanceUSD: "100",
              indexLastUpdatedTimestamp: "1788825600",
              isActive: true
            }
          ],
          _meta: {
            deployment: "QmLiveDeployment",
            block: { number: "22100123", timestamp: "1788825600" }
          }
        }
      })
    );
    const client = new GraphGatewayClient({
      apiKey: "test-graph-key",
      fetchImpl: fetchImpl as typeof fetch
    });

    await expect(
      client.getMarketObservation(AAVE_V3, "utilization", "USDC")
    ).rejects.toThrow(/No utilization data/);
  });

  it("filters by asset symbol and fails closed when no market matches", async () => {
    const fetchImpl = mockFetch(envelope());
    const client = new GraphGatewayClient({
      apiKey: "test-graph-key",
      fetchImpl: fetchImpl as typeof fetch
    });

    await expect(
      client.getMarketObservation(AAVE_V3, "supply_apy", "WETH")
    ).rejects.toThrow(/No WETH market found for aave-v3/);
  });

  it("ignores inactive markets during asset filtering", async () => {
    const fetchImpl = mockFetch(
      envelope({
        data: {
          markets: [
            {
              inputToken: { symbol: "USDC", decimals: 6 },
              rates: [
                { rate: "4.75", side: "LENDER", type: "VARIABLE" }
              ],
              totalValueLockedUSD: "1250000000",
              totalDepositBalanceUSD: "1000000000",
              totalBorrowBalanceUSD: "784000000",
              indexLastUpdatedTimestamp: "1788825600",
              isActive: false
            }
          ],
          _meta: {
            deployment: "QmLiveDeployment",
            block: { number: "22100123", timestamp: "1788825600" }
          }
        }
      })
    );
    const client = new GraphGatewayClient({
      apiKey: "test-graph-key",
      fetchImpl: fetchImpl as typeof fetch
    });

    await expect(
      client.getMarketObservation(AAVE_V3, "supply_apy", "USDC")
    ).rejects.toThrow(/No USDC market found/);
  });

  it("fails closed when the rate side is missing for the requested metric", async () => {
    const fetchImpl = mockFetch(
      envelope({
        data: {
          markets: [
            {
              inputToken: { symbol: "USDC", decimals: 6 },
              rates: [
                { rate: "6.25", side: "BORROWER", type: "VARIABLE" }
              ],
              totalValueLockedUSD: "1250000000",
              totalDepositBalanceUSD: "1000000000",
              totalBorrowBalanceUSD: "784000000",
              indexLastUpdatedTimestamp: "1788825600",
              isActive: true
            }
          ],
          _meta: {
            deployment: "QmLiveDeployment",
            block: { number: "22100123", timestamp: "1788825600" }
          }
        }
      })
    );
    const client = new GraphGatewayClient({
      apiKey: "test-graph-key",
      fetchImpl: fetchImpl as typeof fetch
    });

    await expect(
      client.getMarketObservation(AAVE_V3, "supply_apy", "USDC")
    ).rejects.toThrow(/no USDC supply_apy rate/);
  });

  it("fails closed on a non-200 HTTP response", async () => {
    const fetchImpl = vi.fn(async () => new Response("rate limited", { status: 429 }));
    const client = new GraphGatewayClient({
      apiKey: "test-graph-key",
      fetchImpl: fetchImpl as typeof fetch
    });

    await expect(
      client.getMarketObservation(AAVE_V3, "supply_apy", "USDC")
    ).rejects.toThrow(/HTTP 429/);
  });

  it("fails closed when the subgraph returns GraphQL errors", async () => {
    const fetchImpl = mockFetch({ errors: [{ message: "subgraph index failed" }] });
    const client = new GraphGatewayClient({
      apiKey: "test-graph-key",
      fetchImpl: fetchImpl as typeof fetch
    });

    await expect(
      client.getMarketObservation(AAVE_V3, "supply_apy", "USDC")
    ).rejects.toThrow(/subgraph index failed/);
  });

  it("fails closed when the block timestamp is missing", async () => {
    const fetchImpl = mockFetch(
      envelope({
        data: {
          markets: [
            {
              inputToken: { symbol: "USDC", decimals: 6 },
              rates: [
                { rate: "4.75", side: "LENDER", type: "VARIABLE" }
              ],
              totalValueLockedUSD: "1250000000",
              totalDepositBalanceUSD: "1000000000",
              totalBorrowBalanceUSD: "784000000",
              isActive: true
            }
          ],
          _meta: {
            deployment: "QmLiveDeployment",
            block: { number: "22100123" }
          }
        }
      })
    );
    const client = new GraphGatewayClient({
      apiKey: "test-graph-key",
      fetchImpl: fetchImpl as typeof fetch
    });

    await expect(
      client.getMarketObservation(AAVE_V3, "supply_apy", "USDC")
    ).rejects.toThrow(/no source timestamp/);
  });

  it("sends the fixed GET_MARKETS query with the named operation", async () => {
    const fetchImpl = mockFetch(envelope());
    const client = new GraphGatewayClient({
      apiKey: "test-graph-key",
      fetchImpl: fetchImpl as typeof fetch
    });

    await client.getMarketObservation(AAVE_V3, "supply_apy", "USDC");

    const [, request] = fetchImpl.mock.calls[0]!;
    expect(request?.headers).toMatchObject({
      Authorization: "Bearer test-graph-key"
    });
    const body = JSON.parse(String(request?.body));
    expect(body.operationName).toBe("AskChingGetMarkets");
    expect(body.query).toContain("totalValueLockedUSD");
    expect(body.query).toContain("totalDepositBalanceUSD");
    expect(body.query).toContain("totalBorrowBalanceUSD");
    expect(body.query).toContain("indexLastUpdatedTimestamp");
    expect(body.query).toContain("isActive");
    expect(body.query).toContain("rates { rate side type }");
  });

  it("keeps the deprecated getUsdcSupplyApy wrapper delegating to the generalized path", async () => {
    const fetchImpl = mockFetch(envelope());
    const client = new GraphGatewayClient({
      apiKey: "test-graph-key",
      fetchImpl: fetchImpl as typeof fetch
    });

    const result = await client.getUsdcSupplyApy(AAVE_V3);

    expect(result.metric).toBe("supply_apy");
    expect(result.asset).toBe("USDC");
    expect(result.value).toBe(4.75);
    const requestInit = fetchImpl.mock.calls[0]?.[1] as RequestInit | undefined;
    expect(JSON.parse(String(requestInit?.body))).toMatchObject({
      operationName: "AskChingGetMarkets"
    });
  });
});

describe("GET_MARKETS_QUERY", () => {
  it("is a single fixed query string covering all metric fields", () => {
    expect(GET_MARKETS_QUERY).toContain("AskChingGetMarkets");
    expect(GET_MARKETS_QUERY).toContain("rates { rate side type }");
    expect(GET_MARKETS_QUERY).toContain("totalValueLockedUSD");
    expect(GET_MARKETS_QUERY).toContain("totalDepositBalanceUSD");
    expect(GET_MARKETS_QUERY).toContain("totalBorrowBalanceUSD");
    expect(GET_MARKETS_QUERY).toContain("indexLastUpdatedTimestamp");
    expect(GET_MARKETS_QUERY).toContain("isActive");
    expect(GET_MARKETS_QUERY).toContain("_meta");
  });
});
