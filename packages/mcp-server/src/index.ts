#!/usr/bin/env node

import {
  AnalyzeMarketsResultSchema,
  ComparisonSchema,
  createMarketDataSource
} from "@askching/shared";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import {
  AnalyzeMarketsCoreSchema,
  CompareMarketsCoreSchema,
  ResearchBriefCoreSchema,
  ResearchBriefResultSchema,
  RiskScanCoreSchema,
  analyzeMarkets,
  compareMarkets,
  researchBrief,
  riskScan
} from "./tools.js";

const dataSource = createMarketDataSource(process.env);
const server = new McpServer({ name: "askching", version: "0.1.0" });

server.registerTool(
  "analyze_markets",
  {
    title: "Analyze markets",
    description:
      "Produce transparent, cited yield-opportunity, liquidity-stress, or evidence-quality findings from current market observations, with calculations, confidence, caveats, gaps, and an as-of timestamp.",
    inputSchema: AnalyzeMarketsCoreSchema.shape,
    outputSchema: AnalyzeMarketsResultSchema.shape
  },
  async (input) => {
    const result = await analyzeMarkets(input, dataSource);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      structuredContent: result
    };
  }
);

server.registerTool(
  "compare_markets",
  {
    title: "Compare markets",
    description:
      "Compare a market metric (supply_apy/borrow_apy/tvl/utilization) for a given asset across at least two supported protocols with citations and an as-of timestamp.",
    inputSchema: CompareMarketsCoreSchema.shape,
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
      "Prepare a cited research brief: conclusion, key figures with sources, as-of time, risks, and a suggested follow-up, for a given metric and asset.",
    inputSchema: ResearchBriefCoreSchema.shape,
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
      "Scan protocol metrics for peer-relative signals and explicit gaps across one or more assets: which peer has the highest rate, spread vs peers, and an honest time-series limitation note.",
    inputSchema: RiskScanCoreSchema.shape
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
