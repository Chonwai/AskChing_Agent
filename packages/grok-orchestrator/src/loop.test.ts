import { createMarketDataSource } from "@askching/shared";
import { describe, expect, it, vi } from "vitest";

import {
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
      .toEqual(["compare_markets", "research_brief", "risk_scan"]);
  });
});
