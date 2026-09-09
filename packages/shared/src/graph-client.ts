import { z } from "zod";

import { getMetricDescriptor } from "./metrics.js";
import {
  AssetSymbolSchema,
  MarketObservationSchema,
  type AssetSymbol,
  type MarketMetricId,
  type MarketObservation
} from "./schemas.js";
import type { SubgraphSource } from "./source-config.js";

// D5: single fixed query covering every metric/asset combination.
export const GET_MARKETS_QUERY = `
  query AskChingGetMarkets {
    markets(first: 100, orderBy: totalValueLockedUSD, orderDirection: desc) {
      inputToken { symbol decimals }
      rates { rate side type }
      totalValueLockedUSD
      totalDepositBalanceUSD
      totalBorrowBalanceUSD
      indexLastUpdatedTimestamp
      isActive
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
          inputToken: z.object({
            symbol: z.string(),
            decimals: z.coerce.number().optional()
          }),
          rates: z
            .array(
              z.object({
                rate: GraphNumberSchema,
                side: z.string(),
                type: z.string()
              })
            )
            .nullable(),
          totalValueLockedUSD: GraphNumberSchema.nullish(),
          totalDepositBalanceUSD: GraphNumberSchema.nullish(),
          totalBorrowBalanceUSD: GraphNumberSchema.nullish(),
          indexLastUpdatedTimestamp: GraphNumberSchema.nullish(),
          isActive: z.boolean().nullish()
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

  /**
   * Generalized market observation: one fixed GET_MARKETS query, code-level
   * filtering by asset + metric extraction.
   */
  async getMarketObservation(
    source: SubgraphSource,
    metricId: MarketMetricId,
    asset: AssetSymbol
  ): Promise<MarketObservation> {
    const descriptor = getMetricDescriptor(metricId);
    const { data } = await this.#queryMarkets(source);
    const normalizedAsset = asset.toUpperCase();

    const candidates = data.markets.filter(
      (market) =>
        market.inputToken.symbol.toUpperCase() === normalizedAsset &&
        market.isActive !== false
    );
    if (candidates.length === 0) {
      throw new Error(
        `No ${normalizedAsset} market found for ${source.protocol}`
      );
    }

    const marketTimestamps = candidates
      .map((market) => market.indexLastUpdatedTimestamp)
      .filter((timestamp): timestamp is number => timestamp != null);
    const timestampSeconds = data._meta.block.timestamp ?? marketTimestamps[0];
    if (timestampSeconds === undefined) {
      throw new Error(
        `The Graph query for ${source.protocol} returned no source timestamp`
      );
    }

    let value: number;
    let unit: "percent" | "usd" = descriptor.unit;
    // M1: branch on the descriptor's declared extractor so the registry is the
    // single source of truth for how each metric is computed.
    switch (descriptor.extractor) {
      case "rates": {
        const isBorrow = descriptor.rateSide === "BORROWER";
        const rates = candidates
          .flatMap((market) =>
            (market.rates ?? []).filter(
              (rate) =>
                rate.side === descriptor.rateSide &&
                rate.type === descriptor.rateType
            )
          )
          .map((rate) => rate.rate)
          .filter(Number.isFinite);
        if (rates.length === 0) {
          throw new Error(
            `The Graph query for ${source.protocol} returned no ${normalizedAsset} ${metricId} rate`
          );
        }
        // supply_apy picks the best (max) rate; borrow_apy the cheapest (min).
        value = isBorrow ? Math.min(...rates) : Math.max(...rates);
        break;
      }
      case "tvl": {
        const tvls = candidates
          .map((market) => market.totalValueLockedUSD)
          .filter((amount): amount is number => Number.isFinite(amount));
        if (tvls.length === 0) {
          throw new Error(
            `The Graph query for ${source.protocol} returned no ${normalizedAsset} totalValueLockedUSD`
          );
        }
        // R5: the largest market for this asset, not total protocol TVL
        value = Math.max(...tvls);
        break;
      }
      case "utilization": {
        const utilizations = candidates
          .map((market) => {
            const deposit =
              market.totalDepositBalanceUSD == null
                ? undefined
                : market.totalDepositBalanceUSD;
            const borrow =
              market.totalBorrowBalanceUSD == null
                ? undefined
                : market.totalBorrowBalanceUSD;
            if (
              deposit === undefined ||
              borrow === undefined ||
              !Number.isFinite(deposit) ||
              !Number.isFinite(borrow) ||
              deposit === 0
            ) {
              return undefined;
            }
            return (borrow / deposit) * 100;
          })
          .filter((ratio): ratio is number => ratio !== undefined);
        if (utilizations.length === 0) {
          throw new Error(
            `No utilization data for ${normalizedAsset} on ${source.protocol}`
          );
        }
        value = Math.max(...utilizations);
        break;
      }
    }

    return MarketObservationSchema.parse({
      metric: metricId,
      asset: normalizedAsset,
      value,
      unit,
      rateType: descriptor.rateSide ? "variable" : undefined,
      protocol: source.protocol,
      subgraphId: source.subgraphId,
      deploymentId: data._meta.deployment,
      block: data._meta.block.number,
      timestamp: new Date(timestampSeconds * 1000).toISOString(),
      queryHash: await sha256(GET_MARKETS_QUERY)
    });
  }

  /**
   * @deprecated Use getMarketObservation(source, "supply_apy", "USDC") instead.
   */
  async getUsdcSupplyApy(source: SubgraphSource): Promise<MarketObservation> {
    return this.getMarketObservation(source, "supply_apy", "USDC");
  }

  async #queryMarkets(source: SubgraphSource) {
    const response = await this.#fetch(
      `https://gateway.thegraph.com/api/subgraphs/id/${source.subgraphId}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.#apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          operationName: "AskChingGetMarkets",
          query: GET_MARKETS_QUERY
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
    return envelope as z.infer<typeof GraphEnvelopeSchema> & {
      data: NonNullable<z.infer<typeof GraphEnvelopeSchema>["data"]>;
    };
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
