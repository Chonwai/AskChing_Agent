#!/usr/bin/env node

import { ComparisonSchema, createMarketDataSource } from "@askching/shared";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import {
  CompareMarketsInputSchema,
  ResearchBriefInputSchema,
  RiskScanInputSchema,
  compareMarkets
} from "./tools.js";

const dataSource = createMarketDataSource(process.env);
const server = new McpServer({ name: "askching", version: "0.1.0" });

server.registerTool(
  "compare_markets",
  {
    title: "Compare markets",
    description:
      "Compare a normalized market metric across at least two protocols with citations and an as-of timestamp.",
    inputSchema: CompareMarketsInputSchema.shape,
    outputSchema: ComparisonSchema.shape
  },
  async (input) => {
    const result = await compareMarkets(input, dataSource);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      structuredContent: result
    };
  }
);

server.registerTool(
  "research_brief",
  {
    title: "Research brief",
    description:
      "Prepare a cited research brief. The bootstrap server exposes this surface while implementation follows the compare_markets slice.",
    inputSchema: ResearchBriefInputSchema.shape
  },
  async () => ({
    content: [
      {
        type: "text",
        text: "research_brief is not implemented in the bootstrap slice; use compare_markets for cited USDC APY data."
      }
    ],
    isError: true
  })
);

server.registerTool(
  "risk_scan",
  {
    title: "Risk scan",
    description:
      "Scan protocol metrics for peer-relative changes. The bootstrap server exposes this surface while implementation follows the compare_markets slice.",
    inputSchema: RiskScanInputSchema.shape
  },
  async () => ({
    content: [
      {
        type: "text",
        text: "risk_scan is not implemented in the bootstrap slice; no uncited risk assessment was produced."
      }
    ],
    isError: true
  })
);

await server.connect(new StdioServerTransport());
