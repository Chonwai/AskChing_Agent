import { describe, expect, it, vi } from "vitest";

import { GraphGatewayClient } from "./graph-client.js";
import { LIVE_SOURCES } from "./source-config.js";

describe("GraphGatewayClient", () => {
  it("normalizes a live USDC lender rate and sends a named authorized query", async () => {
    const fetchImpl = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
      new Response(
        JSON.stringify({
          data: {
            markets: [
              {
                inputToken: { symbol: "USDC" },
                rates: [
                  { rate: "4.75", side: "LENDER", type: "VARIABLE" },
                  { rate: "6.25", side: "BORROWER", type: "VARIABLE" }
                ],
                indexLastUpdatedTimestamp: "1788825600"
              }
            ],
            _meta: {
              deployment: "QmLiveDeployment",
              block: { number: "22100123", timestamp: "1788825600" }
            }
          }
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );
    const client = new GraphGatewayClient({
      apiKey: "test-graph-key",
      fetchImpl: fetchImpl as typeof fetch
    });

    const result = await client.getUsdcSupplyApy(LIVE_SOURCES[0]!);

    expect(result.value).toBe(4.75);
    expect(result.unit).toBe("percent");
    expect(result.protocol).toBe("aave-v3");
    expect(result.deploymentId).toBe("QmLiveDeployment");
    expect(result.block).toBe(22_100_123);
    expect(result.queryHash).toMatch(/^sha256:[a-f0-9]{64}$/);

    const [, request] = fetchImpl.mock.calls[0]!;
    expect(request?.headers).toMatchObject({
      Authorization: "Bearer test-graph-key"
    });
    expect(JSON.parse(String(request?.body))).toMatchObject({
      operationName: "AskChingUsdcSupplyApy"
    });
  });
});
