import { MARKET_FIXTURES, MARKET_HISTORY_FIXTURES } from "./fixtures.js";
import { GraphGatewayClient } from "./graph-client.js";
import {
  getMetricDescriptor,
  resolveMetricId,
  type MetricDescriptor
} from "./metrics.js";
import type {
  MarketMetric,
  MarketMetricId,
  MarketObservation,
  ProtocolSlug,
  TrendPoint,
  TrendSeries,
  TrendWindow
} from "./schemas.js";
import {
  AssetSymbolSchema,
  TREND_WINDOW_DAYS,
  TrendSeriesSchema,
  type AssetSymbol
} from "./schemas.js";
import {
  LIVE_SOURCES,
  assertLiveProtocols,
  type SubgraphSource
} from "./source-config.js";

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
  /**
   * v1.1: one cited history series per protocol over the requested window.
   * Returns whatever the configured sources could provide — the analysis
   * layer fails closed when fewer than two distinct cited series survive.
   */
  getHistory(
    metric: MarketMetric | MarketMetricId,
    window: TrendWindow,
    protocols?: readonly ProtocolSlug[],
    asset?: string
  ): Promise<TrendSeries[]>;
}

export interface LiveDataSource extends MarketDataSource {
  lastGaps: string[];
}

const DEFAULT_ASSET = "USDC" as const;

interface LiveFanOut {
  apiKey: string;
  asset: AssetSymbol;
  descriptor: MetricDescriptor;
  selected: readonly SubgraphSource[];
}

/** Shared live-mode preamble for every metric/protocol fan-out. */
function prepareLiveFanOut(
  environment: AskChingEnvironment,
  metric: MarketMetric | MarketMetricId,
  protocols: readonly ProtocolSlug[] | undefined,
  asset: string | undefined
): LiveFanOut {
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
  return {
    apiKey: environment.GRAPH_API_KEY,
    asset: normalizedAsset,
    descriptor,
    selected: LIVE_SOURCES.filter((source) => requested.includes(source.protocol))
  };
}

/**
 * Fixture-mode history: group the cited history points by protocol and keep the
 * newest `days` of each series. Series with fewer than two points are dropped
 * rather than padded.
 */
function buildFixtureSeries(
  metricId: MarketMetricId,
  asset: AssetSymbol,
  days: number,
  protocols: readonly ProtocolSlug[] | undefined
): TrendSeries[] {
  const grouped = new Map<string, TrendPoint[]>();
  for (const point of MARKET_HISTORY_FIXTURES) {
    if (point.metric !== metricId || point.asset !== asset) continue;
    if (protocols && !protocols.includes(point.protocol)) continue;
    const bucket = grouped.get(point.protocol);
    if (bucket) {
      bucket.push(point);
    } else {
      grouped.set(point.protocol, [point]);
    }
  }

  const unit = getMetricDescriptor(metricId).unit;
  return [...grouped.entries()].flatMap(([protocol, points]) => {
    const recent = [...points].sort((a, b) => a.days - b.days).slice(-days);
    return recent.length < 2
      ? []
      : [
          TrendSeriesSchema.parse({
            protocol,
            metric: metricId,
            unit,
            points: recent
          })
        ];
  });
}

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
      },
      async getHistory(metric, window, protocols, asset) {
        const { metricId, assetHint } = resolveMetricId(metric);
        const normalizedAsset = AssetSymbolSchema.parse(
          (asset ?? assetHint ?? DEFAULT_ASSET).toUpperCase()
        );
        return buildFixtureSeries(
          metricId,
          normalizedAsset,
          TREND_WINDOW_DAYS[window],
          protocols
        );
      }
    };
  }

  const lastGaps: string[] = [];

  const liveSource: LiveDataSource = {
    lastGaps,
    async getObservations(metric, protocols, asset) {
      const {
        apiKey,
        asset: normalizedAsset,
        descriptor,
        selected
      } = prepareLiveFanOut(environment, metric, protocols, asset);
      if (selected.length < 2) {
        throw new Error(
          "Live comparison requires at least two configured sources"
        );
      }

      const client = new GraphGatewayClient({ apiKey, fetchImpl });
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
    },
    async getHistory(metric, window, protocols, asset) {
      const {
        apiKey,
        asset: normalizedAsset,
        descriptor,
        selected
      } = prepareLiveFanOut(environment, metric, protocols, asset);
      const days = TREND_WINDOW_DAYS[window];

      const client = new GraphGatewayClient({ apiKey, fetchImpl });
      const settled = await Promise.allSettled(
        selected.map((source) =>
          client.getMarketHistory(source, descriptor.id, normalizedAsset, days)
        )
      );

      const series: TrendSeries[] = [];
      lastGaps.length = 0;
      settled.forEach((result, index) => {
        if (result.status === "fulfilled") {
          series.push(
            TrendSeriesSchema.parse({
              protocol: selected[index]!.protocol,
              metric: descriptor.id,
              unit: descriptor.unit,
              points: result.value
            })
          );
        } else {
          lastGaps.push(
            `${selected[index]!.protocol}: ${(result.reason as Error).message}`
          );
        }
      });

      return series;
    }
  };

  return liveSource;
}
