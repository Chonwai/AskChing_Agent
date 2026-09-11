import { z } from "zod";

import { getMetricDescriptor, type MetricDescriptor } from "./metrics.js";
import {
  AssetSymbolSchema,
  MarketObservationSchema,
  TrendPointSchema,
  type AssetSymbol,
  type MarketMetricId,
  type MarketObservation,
  type TrendPoint
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

// v1.1: nested daily snapshots give the time dimension without a second round
// trip. `first: 31` covers the widest supported window (30d); the caller slices
// to the requested depth.
export const GET_MARKET_HISTORY_QUERY = `
  query AskChingMarketHistory {
    markets(first: 100, orderBy: totalValueLockedUSD, orderDirection: desc) {
      inputToken { symbol decimals }
      isActive
      dailySnapshots(first: 31, orderBy: days, orderDirection: desc) {
        days
        timestamp
        blockNumber
        rates { rate side type }
        totalDepositBalanceUSD
        totalBorrowBalanceUSD
        totalValueLockedUSD
      }
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

const GraphHistoryEnvelopeSchema = z.object({
  data: z
    .object({
      markets: z.array(
        z.object({
          inputToken: z.object({
            symbol: z.string(),
            decimals: z.coerce.number().optional()
          }),
          isActive: z.boolean().nullish(),
          dailySnapshots: z
            .array(
              z.object({
                days: GraphNumberSchema.nullish(),
                timestamp: GraphNumberSchema.nullish(),
                blockNumber: GraphNumberSchema.nullish(),
                rates: z
                  .array(
                    z.object({
                      rate: GraphNumberSchema,
                      side: z.string(),
                      type: z.string()
                    })
                  )
                  .nullable(),
                totalDepositBalanceUSD: GraphNumberSchema.nullish(),
                totalBorrowBalanceUSD: GraphNumberSchema.nullish(),
                totalValueLockedUSD: GraphNumberSchema.nullish()
              })
            )
            .nullable()
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

/**
 * The four value-bearing fields shared by a `Market` and a
 * `MarketDailySnapshot`, so one extractor serves both the spot and the
 * historical query.
 */
interface MarketValueInput {
  rates: readonly { rate: number; side: string; type: string }[] | null;
  totalValueLockedUSD?: number | null;
  totalDepositBalanceUSD?: number | null;
  totalBorrowBalanceUSD?: number | null;
}

/**
 * Extract every candidate value for a metric from structurally comparable
 * market/snapshot records, best value first. An empty array means the source
 * does not carry this metric — the caller decides whether that is a hard
 * failure (spot) or a skipped point (history).
 */
function extractMetricValues(
  records: readonly MarketValueInput[],
  descriptor: MetricDescriptor
): number[] {
  switch (descriptor.extractor) {
    case "rates": {
      const isBorrow = descriptor.rateSide === "BORROWER";
      return records
        .flatMap((record) =>
          (record.rates ?? []).filter(
            (rate) =>
              rate.side === descriptor.rateSide &&
              rate.type === descriptor.rateType
          )
        )
        .map((rate) => rate.rate)
        .filter(Number.isFinite)
        .sort((a, b) => (isBorrow ? a - b : b - a));
    }
    case "tvl":
      return records
        .map((record) => record.totalValueLockedUSD)
        .filter((amount): amount is number => Number.isFinite(amount))
        .sort((a, b) => b - a);
    case "utilization":
      return records
        .map((record) => {
          const deposit = record.totalDepositBalanceUSD ?? undefined;
          const borrow = record.totalBorrowBalanceUSD ?? undefined;
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
        .filter((ratio): ratio is number => ratio !== undefined)
        .sort((a, b) => b - a);
  }
}

/** True when `candidate` is the better market value for this metric. */
function isBetterValue(
  candidate: number,
  current: number,
  descriptor: MetricDescriptor
): boolean {
  // Mirrors the spot rule: cheapest borrow rate, otherwise the largest value.
  return descriptor.rateSide === "BORROWER"
    ? candidate < current
    : candidate > current;
}

function describeMissingMetric(
  protocol: string,
  asset: string,
  metricId: MarketMetricId,
  descriptor: MetricDescriptor
): string {
  switch (descriptor.extractor) {
    case "rates":
      return `The Graph query for ${protocol} returned no ${asset} ${metricId} rate`;
    case "tvl":
      return `The Graph query for ${protocol} returned no ${asset} totalValueLockedUSD`;
    case "utilization":
      return `No utilization data for ${asset} on ${protocol}`;
  }
}

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

    // M1: branch on the descriptor's declared extractor so the registry is the
    // single source of truth for how each metric is computed.
    // R5: for tvl/utilization the largest market wins, not total protocol TVL;
    // supply_apy picks the best (max) rate, borrow_apy the cheapest (min).
    const value = extractMetricValues(candidates, descriptor)[0];
    if (value === undefined) {
      throw new Error(
        describeMissingMetric(
          source.protocol,
          normalizedAsset,
          metricId,
          descriptor
        )
      );
    }
    const unit: "percent" | "usd" = descriptor.unit;

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
   * Historical counterpart of `getMarketObservation`: one cited series per
   * protocol, newest point last, covering at most `days` daily snapshots.
   */
  async getMarketHistory(
    source: SubgraphSource,
    metricId: MarketMetricId,
    asset: AssetSymbol,
    days: number
  ): Promise<TrendPoint[]> {
    if (!Number.isInteger(days) || days < 2) {
      throw new Error(
        `Trend history requires an integer window of at least 2 days; got ${days}`
      );
    }

    const descriptor = getMetricDescriptor(metricId);
    const { data } = await this.#queryMarketHistory(source);
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

    // One point per snapshot day, keeping the best market value for that day
    // together with its own block/timestamp so the citation stays truthful.
    const byDay = new Map<
      number,
      { value: number; timestampSeconds: number; block: number }
    >();
    let skipped = 0;
    for (const market of candidates) {
      for (const snapshot of market.dailySnapshots ?? []) {
        if (
          snapshot.days == null ||
          snapshot.timestamp == null ||
          snapshot.blockNumber == null
        ) {
          skipped += 1;
          continue;
        }
        const value = extractMetricValues([snapshot], descriptor)[0];
        if (value === undefined) {
          // Fail-closed: a snapshot without a usable value is never guessed.
          skipped += 1;
          continue;
        }
        const current = byDay.get(snapshot.days);
        if (
          current === undefined ||
          isBetterValue(value, current.value, descriptor)
        ) {
          byDay.set(snapshot.days, {
            value,
            timestampSeconds: snapshot.timestamp,
            block: snapshot.blockNumber
          });
        }
      }
    }

    const queryHash = await sha256(GET_MARKET_HISTORY_QUERY);
    const points = [...byDay.entries()]
      .sort(([left], [right]) => left - right)
      .slice(-days)
      .map(([snapshotDays, sample]) =>
        TrendPointSchema.parse({
          metric: metricId,
          asset: normalizedAsset,
          value: sample.value,
          unit: descriptor.unit,
          rateType: descriptor.rateSide ? "variable" : undefined,
          protocol: source.protocol,
          subgraphId: source.subgraphId,
          deploymentId: data._meta.deployment,
          block: sample.block,
          timestamp: new Date(sample.timestampSeconds * 1000).toISOString(),
          queryHash,
          days: snapshotDays
        })
      );

    if (points.length < 2) {
      throw new Error(
        `The Graph query for ${source.protocol} returned ${points.length} usable ${normalizedAsset} ${metricId} snapshot(s); at least 2 are required for a trend` +
          (skipped > 0
            ? ` (${skipped} snapshot(s) skipped for missing rates or citation fields)`
            : "")
      );
    }

    return points;
  }

  /**
   * @deprecated Use getMarketObservation(source, "supply_apy", "USDC") instead.
   */
  async getUsdcSupplyApy(source: SubgraphSource): Promise<MarketObservation> {
    return this.getMarketObservation(source, "supply_apy", "USDC");
  }

  /** Shared transport for every Graph Gateway request this client makes. */
  async #post(
    source: SubgraphSource,
    operationName: string,
    query: string
  ): Promise<unknown> {
    const response = await this.#fetch(
      `https://gateway.thegraph.com/api/subgraphs/id/${source.subgraphId}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.#apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ operationName, query })
      }
    );

    if (!response.ok) {
      throw new Error(
        `The Graph request for ${source.protocol} failed with HTTP ${response.status}`
      );
    }

    const payload = (await response.json()) as {
      errors?: Array<{ message: string }>;
    };
    if (payload.errors?.length) {
      throw new Error(
        `The Graph query for ${source.protocol} failed: ${payload.errors
          .map((error) => error.message)
          .join("; ")}`
      );
    }
    return payload;
  }

  async #queryMarkets(source: SubgraphSource) {
    const envelope = GraphEnvelopeSchema.parse(
      await this.#post(source, "AskChingGetMarkets", GET_MARKETS_QUERY)
    );
    if (!envelope.data) {
      throw new Error(`The Graph query for ${source.protocol} returned no data`);
    }
    return envelope as z.infer<typeof GraphEnvelopeSchema> & {
      data: NonNullable<z.infer<typeof GraphEnvelopeSchema>["data"]>;
    };
  }

  async #queryMarketHistory(source: SubgraphSource) {
    const envelope = GraphHistoryEnvelopeSchema.parse(
      await this.#post(
        source,
        "AskChingMarketHistory",
        GET_MARKET_HISTORY_QUERY
      )
    );
    if (!envelope.data) {
      throw new Error(`The Graph query for ${source.protocol} returned no data`);
    }
    return envelope as z.infer<typeof GraphHistoryEnvelopeSchema> & {
      data: NonNullable<z.infer<typeof GraphHistoryEnvelopeSchema>["data"]>;
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
