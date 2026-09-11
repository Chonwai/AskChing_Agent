import { describe, expect, it, vi } from "vitest";

import {
  GET_MARKET_HISTORY_QUERY,
  GET_MARKETS_QUERY,
  GraphGatewayClient
} from "./graph-client.js";
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

const HISTORY_BASE_TIMESTAMP = 1_788_825_600; // 2026-09-08T00:00:00.000Z
const HISTORY_BASE_BLOCK = 22_100_123;

function snapshot(
  days: number,
  rate: string,
  extra: Record<string, unknown> = {}
) {
  const offset = 6 - days;
  return {
    days: String(days),
    timestamp: String(HISTORY_BASE_TIMESTAMP - offset * 86_400),
    blockNumber: String(HISTORY_BASE_BLOCK - offset * 7_200),
    rates: [{ rate, side: "LENDER", type: "VARIABLE" }],
    totalDepositBalanceUSD: "1000000000",
    totalBorrowBalanceUSD: "784000000",
    totalValueLockedUSD: "1250000000",
    ...extra
  };
}

function historyEnvelope(
  dailySnapshots: unknown[],
  options: { inputToken?: Record<string, unknown>; isActive?: boolean } = {}
) {
  return {
    data: {
      markets: [
        {
          inputToken: { symbol: "USDC", decimals: 6, ...options.inputToken },
          isActive: options.isActive ?? true,
          dailySnapshots
        }
      ],
      _meta: {
        deployment: "QmLiveDeployment",
        block: { number: "22100123", timestamp: String(HISTORY_BASE_TIMESTAMP) }
      }
    }
  } as unknown;
}

describe("GraphGatewayClient.getMarketHistory", () => {
  const RATES = ["3.80", "3.86", "3.95", "4.02", "4.10", "4.18", "4.25"];

  it("returns a cited daily series ordered oldest to newest", async () => {
    const fetchImpl = mockFetch(
      historyEnvelope(RATES.map((rate, days) => snapshot(days, rate)))
    );
    const client = new GraphGatewayClient({
      apiKey: "test-graph-key",
      fetchImpl: fetchImpl as typeof fetch
    });

    const points = await client.getMarketHistory(
      AAVE_V3,
      "supply_apy",
      "USDC",
      7
    );

    expect(points).toHaveLength(7);
    expect(points.map((point) => point.days)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(points.map((point) => point.value)).toEqual([
      3.8, 3.86, 3.95, 4.02, 4.1, 4.18, 4.25
    ]);
    expect(points.every((point) => point.metric === "supply_apy")).toBe(true);
    expect(points.every((point) => point.asset === "USDC")).toBe(true);
    expect(points.every((point) => point.unit === "percent")).toBe(true);
    expect(points.every((point) => point.rateType === "variable")).toBe(true);
    expect(points.every((point) => point.protocol === "aave-v3")).toBe(true);

    // Every point must carry a complete citation, and blocks must increase.
    for (const point of points) {
      expect(point.subgraphId).toBe(AAVE_V3.subgraphId);
      expect(point.deploymentId).toBe("QmLiveDeployment");
      expect(point.queryHash).toMatch(/^sha256:[a-f0-9]{64}$/);
      expect(point.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    }
    for (let index = 1; index < points.length; index += 1) {
      expect(points[index]!.block!).toBeGreaterThan(points[index - 1]!.block!);
      expect(points[index]!.timestamp > points[index - 1]!.timestamp).toBe(true);
    }
  });

  it("slices the series to the requested window", async () => {
    const fetchImpl = mockFetch(
      historyEnvelope(RATES.map((rate, days) => snapshot(days, rate)))
    );
    const client = new GraphGatewayClient({
      apiKey: "test-graph-key",
      fetchImpl: fetchImpl as typeof fetch
    });

    const points = await client.getMarketHistory(
      AAVE_V3,
      "supply_apy",
      "USDC",
      3
    );

    expect(points.map((point) => point.days)).toEqual([4, 5, 6]);
    expect(points.map((point) => point.value)).toEqual([4.1, 4.18, 4.25]);
  });

  it("derives utilization snapshots from borrow/deposit balances", async () => {
    const fetchImpl = mockFetch(
      historyEnvelope([
        snapshot(0, "0", {
          rates: null,
          totalDepositBalanceUSD: "1000000000",
          totalBorrowBalanceUSD: "780000000"
        }),
        snapshot(1, "0", {
          rates: null,
          totalDepositBalanceUSD: "1000000000",
          totalBorrowBalanceUSD: "925000000"
        })
      ])
    );
    const client = new GraphGatewayClient({
      apiKey: "test-graph-key",
      fetchImpl: fetchImpl as typeof fetch
    });

    const points = await client.getMarketHistory(
      AAVE_V3,
      "utilization",
      "USDC",
      7
    );

    expect(points.map((point) => point.value)).toEqual([78, 92.5]);
    expect(points.every((point) => point.unit === "percent")).toBe(true);
    expect(points.every((point) => point.rateType === undefined)).toBe(true);
  });

  it("skips snapshots whose rates are empty instead of inventing a value", async () => {
    const fetchImpl = mockFetch(
      historyEnvelope([
        snapshot(0, "3.80"),
        snapshot(1, "3.86", { rates: [] }),
        snapshot(2, "3.95", { rates: null }),
        snapshot(3, "4.02", { rates: [] }),
        snapshot(4, "4.10"),
        snapshot(5, "4.18", { rates: [] })
      ])
    );
    const client = new GraphGatewayClient({
      apiKey: "test-graph-key",
      fetchImpl: fetchImpl as typeof fetch
    });

    const points = await client.getMarketHistory(
      AAVE_V3,
      "supply_apy",
      "USDC",
      7
    );

    // days 1, 2, 3 and 5 carried no rates, so only days 0 and 4 are citable.
    expect(points).toHaveLength(2);
    expect(points.map((point) => point.days)).toEqual([0, 4]);
    expect(points.map((point) => point.value)).toEqual([3.8, 4.1]);
  });

  it("fails closed when fewer than two usable snapshots survive", async () => {
    const fetchImpl = mockFetch(
      historyEnvelope([
        snapshot(0, "3.80", { rates: [] }),
        snapshot(1, "3.86"),
        snapshot(2, "3.95", { rates: [] })
      ])
    );
    const client = new GraphGatewayClient({
      apiKey: "test-graph-key",
      fetchImpl: fetchImpl as typeof fetch
    });

    await expect(
      client.getMarketHistory(AAVE_V3, "supply_apy", "USDC", 7)
    ).rejects.toThrow(/at least 2 are required for a trend/);
  });

  it("fails closed when a snapshot has no citation timestamp or block", async () => {
    const fetchImpl = mockFetch(
      historyEnvelope([
        snapshot(0, "3.80", { timestamp: null }),
        snapshot(1, "3.86", { blockNumber: null }),
        snapshot(2, "3.95")
      ])
    );
    const client = new GraphGatewayClient({
      apiKey: "test-graph-key",
      fetchImpl: fetchImpl as typeof fetch
    });

    await expect(
      client.getMarketHistory(AAVE_V3, "supply_apy", "USDC", 7)
    ).rejects.toThrow(/at least 2 are required for a trend/);
  });

  it("rejects a window that cannot produce a trend", async () => {
    const fetchImpl = mockFetch(historyEnvelope([snapshot(6, "4.25")]));
    const client = new GraphGatewayClient({
      apiKey: "test-graph-key",
      fetchImpl: fetchImpl as typeof fetch
    });

    await expect(
      client.getMarketHistory(AAVE_V3, "supply_apy", "USDC", 1)
    ).rejects.toThrow(/at least 2 days/);
    await expect(
      client.getMarketHistory(AAVE_V3, "supply_apy", "USDC", 7.5)
    ).rejects.toThrow(/at least 2 days/);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("keeps each day's winning value paired with its own block and timestamp", async () => {
    const fetchImpl = mockFetch({
      data: {
        markets: [
          {
            inputToken: { symbol: "USDC", decimals: 6 },
            isActive: true,
            dailySnapshots: [snapshot(0, "3.80"), snapshot(1, "3.86")]
          },
          {
            inputToken: { symbol: "USDC", decimals: 6 },
            isActive: true,
            dailySnapshots: [
              { ...snapshot(0, "5.00"), blockNumber: "9000001", timestamp: "1788307200" },
              { ...snapshot(1, "5.10"), blockNumber: "9000002", timestamp: "1788393600" }
            ]
          }
        ],
        _meta: {
          deployment: "QmLiveDeployment",
          block: { number: "22100123", timestamp: String(HISTORY_BASE_TIMESTAMP) }
        }
      }
    } as unknown);
    const client = new GraphGatewayClient({
      apiKey: "test-graph-key",
      fetchImpl: fetchImpl as typeof fetch
    });

    const points = await client.getMarketHistory(
      AAVE_V3,
      "supply_apy",
      "USDC",
      7
    );

    // supply_apy keeps the highest rate, and with it that market's own citation.
    expect(points.map((point) => point.value)).toEqual([5, 5.1]);
    expect(points.map((point) => point.block)).toEqual([9_000_001, 9_000_002]);
    expect(points.map((point) => point.timestamp)).toEqual([
      "2026-09-02T00:00:00.000Z",
      "2026-09-03T00:00:00.000Z"
    ]);
  });

  it("ignores inactive markets and fails closed when no market matches the asset", async () => {
    const inactive = mockFetch(
      historyEnvelope([snapshot(6, "4.25")], { isActive: false })
    );
    const inactiveClient = new GraphGatewayClient({
      apiKey: "test-graph-key",
      fetchImpl: inactive as typeof fetch
    });

    await expect(
      inactiveClient.getMarketHistory(AAVE_V3, "supply_apy", "USDC", 7)
    ).rejects.toThrow(/No USDC market found for aave-v3/);

    const other = mockFetch(historyEnvelope([snapshot(6, "4.25")]));
    const otherClient = new GraphGatewayClient({
      apiKey: "test-graph-key",
      fetchImpl: other as typeof fetch
    });

    await expect(
      otherClient.getMarketHistory(AAVE_V3, "supply_apy", "WETH", 7)
    ).rejects.toThrow(/No WETH market found for aave-v3/);
  });

  it("sends the fixed history query with the named operation", async () => {
    const fetchImpl = mockFetch(historyEnvelope([snapshot(0, "3.80"), snapshot(1, "3.86")]));
    const client = new GraphGatewayClient({
      apiKey: "test-graph-key",
      fetchImpl: fetchImpl as typeof fetch
    });

    await client.getMarketHistory(AAVE_V3, "supply_apy", "USDC", 7);

    const [, request] = fetchImpl.mock.calls[0]!;
    const body = JSON.parse(String(request?.body));
    expect(body.operationName).toBe("AskChingMarketHistory");
    expect(body.query).toContain("dailySnapshots(first: 31");
    expect(body.query).toContain("orderBy: days");
    expect(body.query).toContain("blockNumber");
  });
});

describe("GET_MARKET_HISTORY_QUERY", () => {
  it("is a single fixed nested-snapshot query covering every metric field", () => {
    expect(GET_MARKET_HISTORY_QUERY).toContain("AskChingMarketHistory");
    expect(GET_MARKET_HISTORY_QUERY).toContain("dailySnapshots");
    expect(GET_MARKET_HISTORY_QUERY).toContain("days");
    expect(GET_MARKET_HISTORY_QUERY).toContain("blockNumber");
    expect(GET_MARKET_HISTORY_QUERY).toContain("rates { rate side type }");
    expect(GET_MARKET_HISTORY_QUERY).toContain("totalValueLockedUSD");
    expect(GET_MARKET_HISTORY_QUERY).toContain("totalDepositBalanceUSD");
    expect(GET_MARKET_HISTORY_QUERY).toContain("totalBorrowBalanceUSD");
    expect(GET_MARKET_HISTORY_QUERY).toContain("isActive");
    expect(GET_MARKET_HISTORY_QUERY).toContain("_meta");
  });
});

