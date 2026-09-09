import { z } from "zod";

import { MarketObservationSchema, type MarketObservation } from "./schemas.js";
import type { SubgraphSource } from "./source-config.js";

const USDC_MARKET_QUERY = `
  query AskChingUsdcSupplyApy {
    markets(first: 100) {
      inputToken { symbol }
      rates { rate side type }
      indexLastUpdatedTimestamp
    }
    _meta {
      deployment
      block { number timestamp }
    }
  }
`;

const GraphNumberSchema = z.coerce.number().finite();
const GraphEnvelopeSchema = z.object({
  data: z
    .object({
      markets: z.array(
        z.object({
          inputToken: z.object({ symbol: z.string() }),
          rates: z
            .array(
              z.object({
                rate: GraphNumberSchema,
                side: z.string(),
                type: z.string()
              })
            )
            .nullable(),
          indexLastUpdatedTimestamp: GraphNumberSchema.nullish()
        })
      ),
      _meta: z.object({
        deployment: z.string().optional(),
        block: z.object({
          number: GraphNumberSchema,
          timestamp: GraphNumberSchema.optional()
        })
      })
    })
    .optional(),
  errors: z.array(z.object({ message: z.string() })).optional()
});

export interface GraphGatewayClientOptions {
  apiKey: string;
  fetchImpl?: typeof fetch;
}

export class GraphGatewayClient {
  readonly #apiKey: string;
  readonly #fetch: typeof fetch;

  constructor({ apiKey, fetchImpl = fetch }: GraphGatewayClientOptions) {
    this.#apiKey = apiKey;
    this.#fetch = fetchImpl;
  }

  async getUsdcSupplyApy(source: SubgraphSource): Promise<MarketObservation> {
    const response = await this.#fetch(
      `https://gateway.thegraph.com/api/subgraphs/id/${source.subgraphId}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.#apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          operationName: "AskChingUsdcSupplyApy",
          query: USDC_MARKET_QUERY
        })
      }
    );

    if (!response.ok) {
      throw new Error(
        `The Graph request for ${source.protocol} failed with HTTP ${response.status}`
      );
    }

    const envelope = GraphEnvelopeSchema.parse(await response.json());
    if (envelope.errors?.length) {
      throw new Error(
        `The Graph query for ${source.protocol} failed: ${envelope.errors
          .map((error) => error.message)
          .join("; ")}`
      );
    }
    if (!envelope.data) {
      throw new Error(`The Graph query for ${source.protocol} returned no data`);
    }

    const usdcRates = envelope.data.markets
      .filter((market) => market.inputToken.symbol.toUpperCase() === "USDC")
      .flatMap((market) =>
        (market.rates ?? [])
          .filter(
            (rate) => rate.side === "LENDER" && rate.type === "VARIABLE"
          )
          .map((rate) => ({
            rate: rate.rate,
            timestamp: market.indexLastUpdatedTimestamp
          }))
      )
      .filter((rate) => Number.isFinite(rate.rate));

    const bestRate = usdcRates.sort((left, right) => right.rate - left.rate)[0];
    if (!bestRate) {
      throw new Error(
        `The Graph query for ${source.protocol} returned no USDC lender rate`
      );
    }

    const timestampSeconds =
      bestRate.timestamp ?? envelope.data._meta.block.timestamp;
    if (timestampSeconds === undefined) {
      throw new Error(
        `The Graph query for ${source.protocol} returned no source timestamp`
      );
    }

    return MarketObservationSchema.parse({
      metric: "supply_apy",
      asset: "USDC",
      rateType: "variable",
      value: bestRate.rate,
      unit: "percent",
      protocol: source.protocol,
      subgraphId: source.subgraphId,
      deploymentId: envelope.data._meta.deployment,
      block: envelope.data._meta.block.number,
      timestamp: new Date(timestampSeconds * 1000).toISOString(),
      queryHash: await sha256(USDC_MARKET_QUERY)
    });
  }
}

async function sha256(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const hex = Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");
  return `sha256:${hex}`;
}
