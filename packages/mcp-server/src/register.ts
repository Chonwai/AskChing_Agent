import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  AnalyzeMarketsResultSchema,
  AnalyzeTrendsResultSchema,
  ComparisonSchema,
  type MarketDataSource
} from "@askching/shared";

import {
  AnalyzeMarketsCoreSchema,
  AnalyzeTrendsCoreSchema,
  CompareMarketsCoreSchema,
  ResearchBriefCoreSchema,
  ResearchBriefResultSchema,
  RiskScanCoreSchema,
  analyzeMarkets,
  analyzeTrends,
  compareMarkets,
  researchBrief,
  riskScan
} from "./tools.js";

/**
 * Register every AskChing research tool on an MCP server.
 *
 * Shared by both transports so the stdio server (`index.ts`) and the remote
 * HTTP server (`http.ts`) expose an identical tool surface with a single
 * source of truth. The caller supplies the data source because each transport
 * decides how its environment is resolved.
 */
export function registerAskChingTools(
  server: McpServer,
  dataSource: MarketDataSource
): void {
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
    "analyze_trends",
    {
      title: "Analyze trends",
      description:
        "Analyze cited daily history for a market metric over a 7d or 30d window: per-protocol change, change percent, least-squares slope per day, direction, volatility, min/max, every cited data point, confidence, caveats, gaps, and an as-of timestamp. Descriptive, not a forecast.",
      inputSchema: AnalyzeTrendsCoreSchema.shape,
      outputSchema: AnalyzeTrendsResultSchema.shape
    },
    async (input) => {
      const result = await analyzeTrends(input, dataSource);
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
}

/** Tool names exposed by every AskChing transport, in canonical order. */
export const ASKCHING_TOOL_NAMES = [
  "analyze_markets",
  "analyze_trends",
  "compare_markets",
  "research_brief",
  "risk_scan"
] as const;
