import { z } from "zod";

import {
  DexYieldObservationSchema,
  type DexYieldObservation,
  type YieldDiscoveryGap
} from "./schemas.js";
import { CORE_STABLECOIN_ADDRESSES, type DexYieldSource } from "./yield-sources.js";

export const GET_UNISWAP_YIELDS_QUERY = [
  "query AskChingUniswapYields {",
  'usdcAsToken0: pools(first: 100, where: { token0: "' + CORE_STABLECOIN_ADDRESSES.USDC + '" }) { id feeTier token0 { id symbol } token1 { id symbol } poolDayData(first: 3, orderBy: date, orderDirection: desc) { date feesUSD volumeUSD tvlUSD } }',
  'usdcAsToken1: pools(first: 100, where: { token1: "' + CORE_STABLECOIN_ADDRESSES.USDC + '" }) { id feeTier token0 { id symbol } token1 { id symbol } poolDayData(first: 3, orderBy: date, orderDirection: desc) { date feesUSD volumeUSD tvlUSD } }',
  "_meta { deployment block { number timestamp } }",
  "}"
].join("\n");

export const GET_CURVE_YIELDS_QUERY = [
  "query AskChingCurveYields {",
  'liquidityPools(first: 100, where: { inputTokens_contains: ["' + CORE_STABLECOIN_ADDRESSES.USDC + '"] }) { id inputTokens { id symbol } }',
  "liquidityPoolDailySnapshots(first: 1000, orderBy: timestamp, orderDirection: desc) { id timestamp blockNumber dailySupplySideRevenueUSD dailyVolumeUSD totalValueLockedUSD pool { id inputTokens { id symbol } } }",
  "_meta { deployment block { number timestamp } }",
  "}"
].join("\n");

const NumberSchema = z.coerce.number().finite();
const PoolSchema = z.object({
  id: z.string(),
  feeTier: z.coerce.number().int().positive(),
  token0: z.object({ id: z.string(), symbol: z.string() }),
  token1: z.object({ id: z.string(), symbol: z.string() }),
  poolDayData: z.array(z.object({
    date: NumberSchema,
    feesUSD: NumberSchema,
    volumeUSD: NumberSchema,
    tvlUSD: NumberSchema
  }))
});
const EnvelopeSchema = z.object({
  data: z.object({
    usdcAsToken0: z.array(PoolSchema),
    usdcAsToken1: z.array(PoolSchema),
    _meta: z.object({
      deployment: z.string().optional(),
      block: z.object({
        number: z.coerce.number().int().nonnegative(),
        timestamp: z.coerce.number()
      })
    })
  }).optional(),
  errors: z.array(z.object({ message: z.string() })).optional()
});

const CurvePoolSchema = z.object({
  id: z.string(),
  inputTokens: z.array(z.object({ id: z.string(), symbol: z.string() })).min(2)
});
const CurveSnapshotSchema = z.object({
  id: z.string(),
  timestamp: NumberSchema,
  blockNumber: NumberSchema.optional(),
  dailySupplySideRevenueUSD: NumberSchema.optional(),
  dailyVolumeUSD: NumberSchema.optional(),
  totalValueLockedUSD: NumberSchema.optional(),
  pool: CurvePoolSchema
});
const CurveEnvelopeSchema = z.object({
  data: z.object({
    liquidityPools: z.array(CurvePoolSchema).optional(),
    liquidityPoolDailySnapshots: z.array(CurveSnapshotSchema),
    _meta: z.object({
      deployment: z.string().optional(),
      block: z.object({
        number: z.coerce.number().int().nonnegative(),
        timestamp: z.coerce.number()
      })
    })
  }).optional(),
  errors: z.array(z.object({ message: z.string() })).optional()
});

export interface YieldAdapterInput {
  stablecoins: readonly ("USDT" | "DAI")[];
}

export interface YieldAdapterResult {
  venue: "uniswap-v3" | "curve";
  observations: DexYieldObservation[];
  gaps: YieldDiscoveryGap[];
}

export interface UniswapV3YieldAdapterOptions {
  source: DexYieldSource;
  apiKey: string;
  fetchImpl?: typeof fetch;
  now?: () => Date;
}

export interface CurveYieldAdapterOptions {
  source: DexYieldSource;
  apiKey: string;
  fetchImpl?: typeof fetch;
  now?: () => Date;
}

export class UniswapV3YieldAdapter {
  readonly #source: DexYieldSource;
  readonly #apiKey: string;
  readonly #fetch: typeof fetch;
  readonly #now: () => Date;

  constructor({ source, apiKey, fetchImpl = fetch, now = () => new Date() }: UniswapV3YieldAdapterOptions) {
    this.#source = source;
    this.#apiKey = apiKey;
    this.#fetch = fetchImpl;
    this.#now = now;
  }

  async getOpportunities(input: YieldAdapterInput): Promise<YieldAdapterResult> {
    let response: Response;
    try {
      response = await this.#fetch(
        "https://gateway.thegraph.com/api/subgraphs/id/" + this.#source.subgraphId,
        {
          method: "POST",
          headers: {
            Authorization: "Bearer " + this.#apiKey,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            operationName: "AskChingUniswapYields",
            query: GET_UNISWAP_YIELDS_QUERY
          })
        }
      );
    } catch {
      throw new Error("Uniswap V3 Graph request failed");
    }
    if (!response.ok) {
      throw new Error("Uniswap V3 Graph request failed with HTTP " + response.status);
    }

    const envelope = EnvelopeSchema.parse(await response.json());
    if (envelope.errors?.length || !envelope.data) {
      throw new Error("Uniswap V3 Graph query returned no usable data");
    }

    const allowed = new Set<string>(
      input.stablecoins.map(symbol => CORE_STABLECOIN_ADDRESSES[symbol])
    );
    const now = this.#now();
    const boundary = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) / 1000;
    const pools = new Map(
      [...envelope.data.usdcAsToken0, ...envelope.data.usdcAsToken1].map(
        pool => [pool.id.toLowerCase(), pool]
      )
    );
    const observations: DexYieldObservation[] = [];
    const gaps: YieldDiscoveryGap[] = [];
    const queryHash = await sha256(GET_UNISWAP_YIELDS_QUERY);

    for (const pool of pools.values()) {
      const ids = [pool.token0.id.toLowerCase(), pool.token1.id.toLowerCase()];
      const other = ids[0] === CORE_STABLECOIN_ADDRESSES.USDC ? ids[1] : ids[0];
      if (!ids.includes(CORE_STABLECOIN_ADDRESSES.USDC) || !allowed.has(other!)) continue;
      const snapshot = [...pool.poolDayData]
        .filter(value => value.date + 86_400 <= boundary)
        .sort((a, b) => b.date - a.date)[0];
      if (!snapshot) {
        gaps.push({ venue: "uniswap-v3", poolAddress: pool.id.toLowerCase(), reason: "No complete UTC daily snapshot." });
        continue;
      }
      if (snapshot.tvlUSD <= 0) {
        gaps.push({ venue: "uniswap-v3", poolAddress: pool.id.toLowerCase(), reason: "A positive TVL is required to calculate fee APR." });
        continue;
      }
      observations.push(DexYieldObservationSchema.parse({
        venue: "uniswap-v3",
        poolAddress: pool.id.toLowerCase(),
        asset: "USDC",
        tokenSymbols: [pool.token0.symbol.toUpperCase(), pool.token1.symbol.toUpperCase()],
        feeTier: pool.feeTier,
        dailySupplySideFeesUsd: snapshot.feesUSD,
        volume24hUsd: snapshot.volumeUSD,
        tvlUsd: snapshot.tvlUSD,
        estimatedFeeApr: snapshot.feesUSD / snapshot.tvlUSD * 365 * 100,
        windowStart: new Date(snapshot.date * 1000).toISOString(),
        windowEnd: new Date((snapshot.date + 86_400) * 1000).toISOString(),
        subgraphId: this.#source.subgraphId,
        deploymentId: envelope.data._meta.deployment,
        block: envelope.data._meta.block.number,
        timestamp: new Date(envelope.data._meta.block.timestamp * 1000).toISOString(),
        queryHash
      }));
    }
    return {
      venue: "uniswap-v3",
      observations: observations.sort((a, b) => a.poolAddress.localeCompare(b.poolAddress)),
      gaps
    };
  }
}

export class CurveYieldAdapter {
  readonly #source: DexYieldSource;
  readonly #apiKey: string;
  readonly #fetch: typeof fetch;
  readonly #now: () => Date;

  constructor({ source, apiKey, fetchImpl = fetch, now = () => new Date() }: CurveYieldAdapterOptions) {
    this.#source = source;
    this.#apiKey = apiKey;
    this.#fetch = fetchImpl;
    this.#now = now;
  }

  async getOpportunities(input: YieldAdapterInput): Promise<YieldAdapterResult> {
    let response: Response;
    try {
      response = await this.#fetch(
        "https://gateway.thegraph.com/api/subgraphs/id/" + this.#source.subgraphId,
        {
          method: "POST",
          headers: {
            Authorization: "Bearer " + this.#apiKey,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            operationName: "AskChingCurveYields",
            query: GET_CURVE_YIELDS_QUERY
          })
        }
      );
    } catch {
      throw new Error("Curve Graph request failed");
    }
    if (!response.ok) {
      throw new Error("Curve Graph request failed with HTTP " + response.status);
    }

    const envelope = CurveEnvelopeSchema.parse(await response.json());
    if (envelope.errors?.length || !envelope.data) {
      throw new Error("Curve Graph query returned no usable data");
    }

    const allowed = new Set<string>(Object.values(CORE_STABLECOIN_ADDRESSES));
    const requestedCounterparts = new Set<string>(
      input.stablecoins.map(symbol => CORE_STABLECOIN_ADDRESSES[symbol])
    );
    const now = this.#now();
    const boundary = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) / 1000;
    const snapshotsByPool = new Map<string, Array<z.infer<typeof CurveSnapshotSchema>>>();

    for (const snapshot of envelope.data.liquidityPoolDailySnapshots) {
      const poolAddress = snapshot.pool.id.toLowerCase();
      const tokenIds = snapshot.pool.inputTokens.map(token => token.id.toLowerCase());
      const hasRequestedCounterpart = tokenIds.some(id => requestedCounterparts.has(id));
      if (
        !tokenIds.includes(CORE_STABLECOIN_ADDRESSES.USDC) ||
        !hasRequestedCounterpart ||
        tokenIds.some(id => !allowed.has(id))
      ) continue;
      const snapshots = snapshotsByPool.get(poolAddress) ?? [];
      snapshots.push(snapshot);
      snapshotsByPool.set(poolAddress, snapshots);
    }

    const observations: DexYieldObservation[] = [];
    const gaps: YieldDiscoveryGap[] = [];
    const queryHash = await sha256(GET_CURVE_YIELDS_QUERY);
    for (const [poolAddress, poolSnapshots] of snapshotsByPool) {
      const complete = poolSnapshots
        .filter(snapshot => snapshot.timestamp + 86_400 <= boundary)
        .sort((a, b) => b.timestamp - a.timestamp);
      if (complete.length === 0) {
        gaps.push({ venue: "curve", poolAddress, reason: "No complete UTC daily snapshot." });
        continue;
      }
      const snapshot = complete.find(value =>
        value.dailySupplySideRevenueUSD !== undefined &&
        value.dailyVolumeUSD !== undefined &&
        value.totalValueLockedUSD !== undefined
      );
      if (!snapshot) {
        gaps.push({ venue: "curve", poolAddress, reason: "Fee revenue, volume, and TVL must come from the same daily snapshot." });
        continue;
      }
      if (snapshot.totalValueLockedUSD! <= 0) {
        gaps.push({ venue: "curve", poolAddress, reason: "A positive TVL is required to calculate fee APR." });
        continue;
      }
      if (snapshot.dailySupplySideRevenueUSD! < 0 || snapshot.dailyVolumeUSD! < 0) {
        gaps.push({ venue: "curve", poolAddress, reason: "Daily fee revenue and volume must be non-negative." });
        continue;
      }
      observations.push(DexYieldObservationSchema.parse({
        venue: "curve",
        poolAddress,
        asset: "USDC",
        tokenSymbols: snapshot.pool.inputTokens.map(token => token.symbol.toUpperCase()),
        dailySupplySideFeesUsd: snapshot.dailySupplySideRevenueUSD,
        volume24hUsd: snapshot.dailyVolumeUSD,
        tvlUsd: snapshot.totalValueLockedUSD,
        estimatedFeeApr: snapshot.dailySupplySideRevenueUSD! / snapshot.totalValueLockedUSD! * 365 * 100,
        windowStart: new Date(snapshot.timestamp * 1000).toISOString(),
        windowEnd: new Date((snapshot.timestamp + 86_400) * 1000).toISOString(),
        subgraphId: this.#source.subgraphId,
        deploymentId: envelope.data._meta.deployment,
        block: snapshot.blockNumber ?? envelope.data._meta.block.number,
        timestamp: new Date(envelope.data._meta.block.timestamp * 1000).toISOString(),
        queryHash
      }));
    }
    return {
      venue: "curve",
      observations: observations.sort((a, b) => a.poolAddress.localeCompare(b.poolAddress)),
      gaps: gaps.sort((a, b) => (a.poolAddress ?? "").localeCompare(b.poolAddress ?? ""))
    };
  }
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return "sha256:" + [...new Uint8Array(digest)]
    .map(byte => byte.toString(16).padStart(2, "0"))
    .join("");
}
