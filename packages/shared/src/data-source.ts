import { MARKET_FIXTURES } from "./fixtures.js";
import { GraphGatewayClient } from "./graph-client.js";
import type {
  MarketMetric,
  MarketObservation,
  ProtocolSlug
} from "./schemas.js";
import { LIVE_SOURCES } from "./source-config.js";

export interface AskChingEnvironment {
  DEMO_LIVE?: string;
  GRAPH_API_KEY?: string;
}

export interface MarketDataSource {
  getObservations(
    metric: MarketMetric,
    protocols?: readonly ProtocolSlug[]
  ): Promise<MarketObservation[]>;
}

export interface LiveDataSource extends MarketDataSource {
  lastGaps: string[];
}

export function createMarketDataSource(
  environment: AskChingEnvironment,
  fetchImpl: typeof fetch = fetch
): MarketDataSource {
  if (environment.DEMO_LIVE !== "1") {
    return {
      async getObservations(metric, protocols) {
        return MARKET_FIXTURES.filter(
          (observation) =>
            observation.metric === metric &&
            (!protocols || protocols.includes(observation.protocol))
        );
      }
    };
  }

  const lastGaps: string[] = [];

  const liveSource: LiveDataSource = {
    lastGaps,
    async getObservations(metric, protocols) {
      if (!environment.GRAPH_API_KEY) {
        throw new Error("GRAPH_API_KEY is required when DEMO_LIVE=1");
      }
      if (metric !== "usdc_supply_apy") {
        throw new Error(`Unsupported live metric: ${metric}`);
      }

      const selected = LIVE_SOURCES.filter(
        (source) => !protocols || protocols.includes(source.protocol)
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
        selected.map((source) => client.getUsdcSupplyApy(source))
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
