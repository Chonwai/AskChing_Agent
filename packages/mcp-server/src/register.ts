import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  AnalyzeMarketsResultSchema,
  AnalyzeTrendsResultSchema,
  ComparisonSchema,
  DiscoverYieldsResultSchema,
  type MarketDataSource
} from "@askching/shared";

import {
  AnalyzeMarketsCoreSchema,
  AnalyzeTrendsCoreSchema,
  CompareMarketsCoreSchema,
  DiscoverYieldsCoreSchema,
  GetInfoInputSchema,
  ResearchBriefCoreSchema,
  ResearchBriefResultSchema,
  RiskScanCoreSchema,
  analyzeMarkets,
  analyzeTrends,
  compareMarkets,
  discoverYields,
  getInfo,
  researchBrief,
  riskScan
} from "./tools.js";

import { logToolCall } from "./observability.js";

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
  dataSource: MarketDataSource,
  options: { requestId?: string } = {}
): void {
  const { requestId } = options;
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
      const finish = logToolCall("analyze_markets", input, requestId);
      try {
        const result = await analyzeMarkets(input, dataSource);
        finish(result);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
          structuredContent: result
        };
      } catch (error) {
        finish(undefined, error);
        throw error;
      }
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
      const finish = logToolCall("analyze_trends", input, requestId);
      try {
        const result = await analyzeTrends(input, dataSource);
        finish(result);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
          structuredContent: result
        };
      } catch (error) {
        finish(undefined, error);
        throw error;
      }
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
      const finish = logToolCall("compare_markets", input, requestId);
      try {
        const result = await compareMarkets(input, dataSource);
        finish(result);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
          structuredContent: result
        };
      } catch (error) {
        finish(undefined, error);
        throw error;
      }
    }
  );

  server.registerTool(
    "discover_yields",
    {
      title: "Discover USDC yields",
      description:
        "Discover cited Ethereum-mainnet USDC opportunities across lending, Uniswap V3, and Curve. Lending supply APY and historical LP fee APR are ranked separately with formula inputs, risks, complete UTC-day windows, explicit gaps, and no transaction execution.",
      inputSchema: DiscoverYieldsCoreSchema.shape,
      outputSchema: DiscoverYieldsResultSchema.shape
    },
    async (input) => {
      const finish = logToolCall("discover_yields", input, requestId);
      try {
        const result = await discoverYields(input, dataSource);
        finish(result);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
          structuredContent: result
        };
      } catch (error) {
        finish(undefined, error);
        throw error;
      }
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
      const finish = logToolCall("research_brief", input, requestId);
      try {
        const result = await researchBrief(input, dataSource);
        finish(result);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
          structuredContent: result as unknown as Record<string, unknown>
        };
      } catch (error) {
        finish(undefined, error);
        throw error;
      }
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
      const finish = logToolCall("risk_scan", input, requestId);
      try {
        const result = await riskScan(input, dataSource);
        finish(result);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
          structuredContent: result as unknown as Record<string, unknown>
        };
      } catch (error) {
        finish(undefined, error);
        throw error;
      }
    }
  );

  server.registerTool(
    "get_info",
    {
      title: "Get AskChing info",
      description:
        "Self-description tool: returns what AskChing is, its evidence model, the six research tools with a copy-paste example each, transports, and live sources. Use this when a user asks what this MCP can do or how to use it.",
      inputSchema: GetInfoInputSchema.shape
    },
    async (input) => {
      const finish = logToolCall("get_info", input, requestId);
      try {
        const result = getInfo(input);
        finish(result);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
          structuredContent: result as unknown as Record<string, unknown>
        };
      } catch (error) {
        finish(undefined, error);
        throw error;
      }
    }
  );
}

/** Tool names exposed by every AskChing transport, in canonical order. */
export const ASKCHING_TOOL_NAMES = [
  "analyze_markets",
  "analyze_trends",
  "compare_markets",
  "discover_yields",
  "get_info",
  "research_brief",
  "risk_scan"
] as const;
