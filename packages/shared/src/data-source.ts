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

  return {
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
      const client = new GraphGatewayClient({
        apiKey: environment.GRAPH_API_KEY,
        fetchImpl
      });
      return Promise.all(
        selected.map((source) => client.getUsdcSupplyApy(source))
      );
    }
  };
}
