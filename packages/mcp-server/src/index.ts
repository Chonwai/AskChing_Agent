#!/usr/bin/env node

import { ComparisonSchema, createMarketDataSource } from "@askching/shared";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import {
  CompareMarketsInputSchema,
  ResearchBriefInputSchema,
  ResearchBriefResultSchema,
  RiskScanInputSchema,
  compareMarkets,
  researchBrief,
  riskScan
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
      "Prepare a cited research brief: conclusion, key figures with sources, as-of time, risks, and a suggested follow-up.",
    inputSchema: ResearchBriefInputSchema.shape,
    outputSchema: ResearchBriefResultSchema.shape
  },
  async (input) => {
    const result = await researchBrief(input, dataSource);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      structuredContent: result as unknown as Record<string, unknown>
    };
  }
);

server.registerTool(
  "risk_scan",
  {
    title: "Risk scan",
    description:
      "Scan protocol metrics for peer-relative signals and explicit gaps: which peer has the highest rate, spread vs peers, and an honest time-series limitation note.",
    inputSchema: RiskScanInputSchema.shape
  },
  async (input) => {
    const result = await riskScan(input, dataSource);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      structuredContent: result as unknown as Record<string, unknown>
    };
  }
);

await server.connect(new StdioServerTransport());
