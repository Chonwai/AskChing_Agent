import { createMarketDataSource, LIVE_PROTOCOLS } from "@askching/shared";
import { describe, expect, it, vi } from "vitest";

import {
  ASKCHING_TOOLS,
  runGrokOrchestrator,
  type ChatCompletionClient
} from "./loop.js";

describe("runGrokOrchestrator", () => {
  it("executes a model-requested comparison and returns the cited synthesis", async () => {
    const complete = vi
      .fn<ChatCompletionClient["complete"]>()
      .mockResolvedValueOnce({
        role: "assistant",
        content: null,
        tool_calls: [
          {
            id: "call-1",
            type: "function",
            function: {
              name: "compare_markets",
              arguments: JSON.stringify({
                metric: "usdc_supply_apy",
                protocols: ["aave-v3", "compound-v3", "spark-lend"]
              })
            }
          }
        ]
      })
      .mockImplementationOnce(async (request) => {
        const toolMessage = request.messages.find(
          (message) => message.role === "tool"
        );
        expect(toolMessage).toBeDefined();
        expect(JSON.parse(toolMessage!.content).sources).toHaveLength(3);
        return {
          role: "assistant",
          content:
            "Aave V3 leads the fixture comparison. The result includes three cited subgraph sources and an as-of timestamp."
        };
      });
    const client: ChatCompletionClient = { complete };

    const result = await runGrokOrchestrator({
      prompt: "Compare USDC supply APY across the supported protocols.",
      client,
      dataSource: createMarketDataSource({ DEMO_LIVE: "0" }),
      systemPrompt: "Use AskChing tools and preserve every citation."
    });

    expect(result.answer).toContain("three cited subgraph sources");
    expect(result.toolCalls).toHaveLength(1);
    expect(result.toolCalls[0]?.name).toBe("compare_markets");
    expect(complete).toHaveBeenCalledTimes(2);
    expect(complete.mock.calls[0]?.[0].tools.map((tool) => tool.function.name))
      .toEqual([
        "get_info",
        "compare_markets",
        "research_brief",
        "risk_scan",
        "analyze_markets",
        "analyze_trends",
        "discover_yields"
      ]);
  });

  it("exposes generalized metric and asset parameters on ASKCHING_TOOLS", async () => {
    const complete = vi
      .fn<ChatCompletionClient["complete"]>()
      .mockResolvedValueOnce({
        role: "assistant",
        content: null,
        tool_calls: [
          {
            id: "call-1",
            type: "function",
            function: {
              name: "compare_markets",
              arguments: JSON.stringify({
                metric: "tvl",
                asset: "WETH",
                protocols: ["aave-v3", "compound-v3"]
              })
            }
          }
        ]
      })
      .mockResolvedValueOnce({
        role: "assistant",
        content: "WETH TVL comparison complete."
      });
    const client: ChatCompletionClient = { complete };

    const result = await runGrokOrchestrator({
      prompt: "Compare WETH tvl across Aave and Compound.",
      client,
      dataSource: createMarketDataSource({ DEMO_LIVE: "0" }),
      systemPrompt: "Use AskChing tools and preserve every citation."
    });

    expect(result.answer).toContain("WETH TVL");
    expect(result.toolCalls[0]?.arguments).toMatchObject({
      metric: "tvl",
      asset: "WETH"
    });
  });

  it("executes a model-requested cited market analysis", async () => {
    const complete = vi
      .fn<ChatCompletionClient["complete"]>()
      .mockResolvedValueOnce({
        role: "assistant",
        content: null,
        tool_calls: [{
          id: "analysis-1",
          type: "function",
          function: {
            name: "analyze_markets",
            arguments: JSON.stringify({
              objective: "liquidity_stress",
              asset: "USDC",
              protocols: ["aave-v3", "compound-v3", "spark-lend"]
            })
          }
        }]
      })
      .mockImplementationOnce(async (request) => {
        const toolMessage = request.messages.find(message => message.role === "tool");
        const analysis = JSON.parse(toolMessage!.content);
        expect(analysis.objective).toBe("liquidity_stress");
        expect(analysis.findings.some((finding: { severity: string }) => finding.severity === "high")).toBe(true);
        return { role: "assistant", content: "Spark has the highest spot utilization, with cited evidence and caveats." };
      });

    const result = await runGrokOrchestrator({
      prompt: "Analyze liquidity stress across Aave, Compound, and Spark.",
      client: { complete },
      dataSource: createMarketDataSource({ DEMO_LIVE: "0" }),
      systemPrompt: "Use AskChing tools and preserve every citation."
    });

    expect(result.toolCalls[0]?.name).toBe("analyze_markets");
    expect(result.answer).toContain("cited evidence");
  });

  it("executes cross-venue USDC yield discovery with separate rankings", async () => {
    const toolArguments = {
      asset: "USDC",
      chain: "ethereum-mainnet",
      stablecoins: ["USDT", "DAI"],
      venues: ["lending", "uniswap-v3", "curve"],
      minTvlUsd: 1_000_000,
      limitPerCategory: 5
    };
    const complete = vi
      .fn<ChatCompletionClient["complete"]>()
      .mockResolvedValueOnce({
        role: "assistant",
        content: null,
        tool_calls: [{
          id: "yield-1",
          type: "function",
          function: {
            name: "discover_yields",
            arguments: JSON.stringify(toolArguments)
          }
        }]
      })
      .mockImplementationOnce(async (request) => {
        const toolMessage = request.messages.find(message => message.role === "tool");
        const discovery = JSON.parse(toolMessage!.content);
        expect(discovery.lending.length).toBeGreaterThanOrEqual(2);
        expect(discovery.dexLp.length).toBeGreaterThanOrEqual(2);
        expect(discovery.crossDexWinner).not.toBeNull();
        return {
          role: "assistant",
          content: "Lending supply APY and LP fee APR are ranked separately with citations and risks; no transaction was proposed."
        };
      });

    const result = await runGrokOrchestrator({
      prompt: "Where can I earn yield on USDC across lending and stablecoin LPs?",
      client: { complete },
      dataSource: createMarketDataSource({ DEMO_LIVE: "0" }),
      systemPrompt: "Use discovery for cross-venue yield questions."
    });

    expect(result.toolCalls[0]).toMatchObject({
      name: "discover_yields",
      arguments: toolArguments
    });
    expect(result.answer).toContain("ranked separately");
  });

  it("describes discovery as separate category rankings with no transaction execution", () => {
    const discovery = ASKCHING_TOOLS.find(tool => tool.function.name === "discover_yields");
    expect(discovery?.function.description).toMatch(/ranked separately/i);
    expect(discovery?.function.description).toMatch(/no transaction/i);
    const parameters = discovery?.function.parameters as {
      properties?: Record<string, { enum?: string[]; default?: unknown; items?: { enum?: string[] } }>;
    };
    expect(parameters.properties?.asset?.enum).toEqual(["USDC"]);
    expect(parameters.properties?.chain?.enum).toEqual(["ethereum-mainnet"]);
    expect(parameters.properties?.venues?.items?.enum).toEqual(["lending", "uniswap-v3", "curve"]);
  });

  it("routes a historical question to analyze_trends with a cited series", async () => {
    const complete = vi
      .fn<ChatCompletionClient["complete"]>()
      .mockResolvedValueOnce({
        role: "assistant",
        content: null,
        tool_calls: [
          {
            id: "trend-1",
            type: "function",
            function: {
              name: "analyze_trends",
              arguments: JSON.stringify({
                metric: "supply_apy",
                asset: "USDC",
                protocols: ["aave-v3", "compound-v3", "spark-lend"],
                window: "7d"
              })
            }
          }
        ]
      })
      .mockImplementationOnce(async (request) => {
        const toolMessage = request.messages.find(
          (message) => message.role === "tool"
        );
        const analysis = JSON.parse(toolMessage!.content);
        expect(analysis.window).toBe("7d");
        expect(analysis.findings).toHaveLength(3);
        expect(
          analysis.findings.every(
            (finding: { citations: unknown[]; points: unknown[] }) =>
              finding.citations.length >= 2 && finding.points.length === 7
          )
        ).toBe(true);
        return {
          role: "assistant",
          content:
            "Aave V3 supply APY rose while Compound V3 fell over the cited 7d window."
        };
      });

    const result = await runGrokOrchestrator({
      prompt: "How has USDC supply APY moved over the past week?",
      client: { complete },
      dataSource: createMarketDataSource({ DEMO_LIVE: "0" }),
      systemPrompt: "Use AskChing tools and preserve every citation."
    });

    expect(result.toolCalls).toHaveLength(1);
    expect(result.toolCalls[0]?.name).toBe("analyze_trends");
    expect(result.toolCalls[0]?.arguments).toMatchObject({
      metric: "supply_apy",
      window: "7d"
    });
    expect(result.answer).toContain("7d window");
  });

  it("fails closed when analyze_trends cannot assemble two cited series", async () => {
    const complete = vi
      .fn<ChatCompletionClient["complete"]>()
      .mockResolvedValueOnce({
        role: "assistant",
        content: null,
        tool_calls: [
          {
            id: "trend-2",
            type: "function",
            function: {
              name: "analyze_trends",
              arguments: JSON.stringify({
                metric: "supply_apy",
                protocols: ["aave-v3", "zerolend"],
                window: "7d"
              })
            }
          }
        ]
      });

    await expect(
      runGrokOrchestrator({
        prompt: "Trend for Aave compared with Zerolend.",
        client: { complete },
        dataSource: createMarketDataSource({ DEMO_LIVE: "0" }),
        systemPrompt: "Use AskChing tools and preserve every citation."
      })
    ).rejects.toThrow(/at least 2 cited trend series/);
  });
});

describe("ASKCHING_TOOLS protocol enum", () => {
  it("is derived from the registry, not hand-written", () => {
    // A hand-written copy had drifted and still advertised uwu-lend and
    // zerolend, which are not live. The model must never be offered a protocol
    // that assertLiveProtocols would reject.
    for (const tool of ASKCHING_TOOLS) {
      const protocols =
        (tool.function.parameters as { properties?: Record<string, { items?: { enum?: unknown } }> })
          .properties?.protocols?.items?.enum;
      if (protocols === undefined) continue;
      expect(protocols).toEqual([...LIVE_PROTOCOLS]);
    }
  });

  it("offers no protocol that is not live", () => {
    const union = new Set<string>();
    for (const tool of ASKCHING_TOOLS) {
      const protocols =
        (tool.function.parameters as { properties?: Record<string, { items?: { enum?: string[] } }> })
          .properties?.protocols?.items?.enum ?? [];
      for (const protocol of protocols) union.add(protocol);
    }
    expect(union.size).toBeGreaterThan(0);
    for (const protocol of union) {
      expect(LIVE_PROTOCOLS).toContain(protocol);
    }
  });
});
