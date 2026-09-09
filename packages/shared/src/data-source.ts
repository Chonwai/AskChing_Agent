import { MARKET_FIXTURES } from "./fixtures.js";
import { GraphGatewayClient } from "./graph-client.js";
import { getMetricDescriptor, resolveMetricId } from "./metrics.js";
import type {
  MarketMetric,
  MarketMetricId,
  MarketObservation,
  ProtocolSlug
} from "./schemas.js";
import {
  AssetSymbolSchema,
  type AssetSymbol
} from "./schemas.js";
import { LIVE_SOURCES, assertLiveProtocols } from "./source-config.js";

export interface AskChingEnvironment {
  DEMO_LIVE?: string;
  GRAPH_API_KEY?: string;
}

export interface MarketDataSource {
  getObservations(
    metric: MarketMetric | MarketMetricId,
    protocols?: readonly ProtocolSlug[],
    asset?: string
  ): Promise<MarketObservation[]>;
}

export interface LiveDataSource extends MarketDataSource {
  lastGaps: string[];
}

const DEFAULT_ASSET = "USDC" as const;

export function createMarketDataSource(
  environment: AskChingEnvironment,
  fetchImpl: typeof fetch = fetch
): MarketDataSource {
  if (environment.DEMO_LIVE !== "1") {
    return {
      async getObservations(metric, protocols, asset) {
        // Boundary normalization: legacy aliases resolve to the generalized
        // metric id (+ asset hint) so fixture filtering is metric-aware.
        const { metricId, assetHint } = resolveMetricId(metric);
        const normalizedAsset = AssetSymbolSchema.parse(
          (asset ?? assetHint ?? DEFAULT_ASSET).toUpperCase()
        );
        return MARKET_FIXTURES.filter(
          (observation) =>
            observation.metric === metricId &&
            observation.asset === normalizedAsset &&
            (!protocols || protocols.includes(observation.protocol))
        );
      }
    };
  }

  const lastGaps: string[] = [];

  const liveSource: LiveDataSource = {
    lastGaps,
    async getObservations(metric, protocols, asset) {
      if (!environment.GRAPH_API_KEY) {
        throw new Error("GRAPH_API_KEY is required when DEMO_LIVE=1");
      }
      const { metricId, assetHint } = resolveMetricId(metric);
      const descriptor = getMetricDescriptor(metricId);
      const normalizedAsset: AssetSymbol = AssetSymbolSchema.parse(
        (asset ?? assetHint ?? DEFAULT_ASSET).toUpperCase()
      );

      const requested = protocols ?? LIVE_SOURCES.map((source) => source.protocol);
      assertLiveProtocols(requested);
      const selected = LIVE_SOURCES.filter((source) =>
        requested.includes(source.protocol)
      );
      if (selected.length < 2) {
        throw new Error(
          "Live comparison requires at least two configured sources"
        );
      }

      const client = new GraphGatewayClient({
        apiKey: environment.GRAPH_API_KEY,
        fetchImpl
      });
      const settled = await Promise.allSettled(
        selected.map((source) =>
          client.getMarketObservation(source, descriptor.id, normalizedAsset)
        )
      );

      const fulfilled: MarketObservation[] = [];
      lastGaps.length = 0;
      settled.forEach((result, index) => {
        if (result.status === "fulfilled") {
          fulfilled.push(result.value);
        } else {
          lastGaps.push(
            `${selected[index]!.protocol}: ${(result.reason as Error).message}`
          );
        }
      });

      if (fulfilled.length < 2) {
        throw new Error(
          `Need at least 2 cited sources for comparison; got ${fulfilled.length}. Gaps: ${lastGaps.join("; ")}`
        );
      }

      return fulfilled;
    }
  };

  return liveSource;
}
