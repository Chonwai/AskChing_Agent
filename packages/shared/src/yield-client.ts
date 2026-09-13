import { z } from 'zod';

import {
  DexYieldObservationSchema,
  type DexYieldObservation,
  type YieldDiscoveryGap,
} from './schemas.js';
import { CORE_STABLECOIN_ADDRESSES, type DexYieldSource } from './yield-sources.js';

const USDC = CORE_STABLECOIN_ADDRESSES.USDC;
const USDT = CORE_STABLECOIN_ADDRESSES.USDT;
const DAI = CORE_STABLECOIN_ADDRESSES.DAI;

export const GET_UNISWAP_POOLS_QUERY = [
  'query AskChingUniswapPools {',
  `  usdtPools: liquidityPools(first: 100, where: { inputTokens_contains: ["${USDC}", "${USDT}"] }) { id inputTokens { id symbol } }`,
  `  daiPools: liquidityPools(first: 100, where: { inputTokens_contains: ["${USDC}", "${DAI}"] }) { id inputTokens { id symbol } }`,
  '}',
].join('\n');

export const GET_UNISWAP_SNAPSHOTS_QUERY = [
  'query AskChingUniswapSnapshots($pool: String!) {',
  '  liquidityPoolDailySnapshots(first: 5, orderBy: timestamp, orderDirection: desc, where: { pool: $pool }) {',
  '    id timestamp blockNumber dailySupplySideRevenueUSD dailyVolumeUSD totalValueLockedUSD',
  '    pool { id inputTokens { id symbol } }',
  '  }',
  '  _meta { deployment block { number timestamp } }',
  '}',
].join('\n');

export const GET_CURVE_YIELDS_QUERY = [
  'query AskChingCurveYields {',
  'liquidityPools(first: 100, where: { inputTokens_contains: ["' +
    CORE_STABLECOIN_ADDRESSES.USDC +
    '"] }) { id inputTokens { id symbol } }',
  'liquidityPoolDailySnapshots(first: 1000, orderBy: timestamp, orderDirection: desc) { id timestamp blockNumber dailySupplySideRevenueUSD dailyVolumeUSD totalValueLockedUSD pool { id inputTokens { id symbol } } }',
  '_meta { deployment block { number timestamp } }',
  '}',
].join('\n');

const NumberSchema = z.coerce.number().finite();
const UniswapPoolSchema = z.object({
  id: z.string(),
  inputTokens: z.array(z.object({ id: z.string(), symbol: z.string() })).min(2),
});
const UniswapPoolsEnvelopeSchema = z.object({
  data: z
    .object({
      usdtPools: z.array(UniswapPoolSchema).optional(),
      daiPools: z.array(UniswapPoolSchema).optional(),
    })
    .optional(),
  errors: z.array(z.object({ message: z.string() })).optional(),
});
const UniswapSnapshotSchema = z.object({
  id: z.string(),
  timestamp: NumberSchema,
  blockNumber: NumberSchema.optional(),
  dailySupplySideRevenueUSD: NumberSchema.optional(),
  dailyVolumeUSD: NumberSchema.optional(),
  totalValueLockedUSD: NumberSchema.optional(),
  pool: UniswapPoolSchema,
});
const UniswapSnapshotsEnvelopeSchema = z.object({
  data: z
    .object({
      liquidityPoolDailySnapshots: z.array(UniswapSnapshotSchema),
      _meta: z.object({
        deployment: z.string().optional(),
        block: z.object({
          number: z.coerce.number().int().nonnegative(),
          timestamp: z.coerce.number(),
        }),
      }),
    })
    .optional(),
  errors: z.array(z.object({ message: z.string() })).optional(),
});

const CurvePoolSchema = z.object({
  id: z.string(),
  inputTokens: z.array(z.object({ id: z.string(), symbol: z.string() })).min(2),
});
const CurveSnapshotSchema = z.object({
  id: z.string(),
  timestamp: NumberSchema,
  blockNumber: NumberSchema.optional(),
  dailySupplySideRevenueUSD: NumberSchema.optional(),
  dailyVolumeUSD: NumberSchema.optional(),
  totalValueLockedUSD: NumberSchema.optional(),
  pool: CurvePoolSchema,
});
const CurveEnvelopeSchema = z.object({
  data: z
    .object({
      liquidityPools: z.array(CurvePoolSchema).optional(),
      liquidityPoolDailySnapshots: z.array(CurveSnapshotSchema),
      _meta: z.object({
        deployment: z.string().optional(),
        block: z.object({
          number: z.coerce.number().int().nonnegative(),
          timestamp: z.coerce.number(),
        }),
      }),
    })
    .optional(),
  errors: z.array(z.object({ message: z.string() })).optional(),
});

export interface YieldAdapterInput {
  stablecoins: readonly ('USDT' | 'DAI')[];
}

export interface YieldAdapterResult {
  venue: 'uniswap-v3' | 'curve';
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

  constructor({
    source,
    apiKey,
    fetchImpl = fetch,
    now = () => new Date(),
  }: UniswapV3YieldAdapterOptions) {
    this.#source = source;
    this.#apiKey = apiKey;
    this.#fetch = fetchImpl;
    this.#now = now;
  }

  async getOpportunities(input: YieldAdapterInput): Promise<YieldAdapterResult> {
    const allowed = new Set<string>(Object.values(CORE_STABLECOIN_ADDRESSES));
    const requestedCounterparts = new Set<string>(
      input.stablecoins.map((symbol) => CORE_STABLECOIN_ADDRESSES[symbol]),
    );
    const now = this.#now();
    const boundary = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) / 1000;

    // Step 1 — single pools query with aliases (no global snapshot scan).
    const pools = await this.#fetchPools();
    const eligiblePools = pools.filter((pool) => {
      const tokenIds = pool.inputTokens.map((token) => token.id.toLowerCase());
      const hasRequestedCounterpart = tokenIds.some((id) => requestedCounterparts.has(id));
      return (
        tokenIds.includes(CORE_STABLECOIN_ADDRESSES.USDC) &&
        hasRequestedCounterpart &&
        tokenIds.every((id) => allowed.has(id))
      );
    });

    // Step 2 — per-pool snapshots in parallel. A single-pool failure becomes a gap,
    // only the pools query failure is fatal.
    const perPool = await Promise.all(
      eligiblePools.map(async (pool) => {
        try {
          return { pool, ...(await this.#fetchSnapshots(pool.id)) };
        } catch {
          return { pool, snapshots: [], meta: undefined };
        }
      }),
    );

    // Step 3 — merge into observations/gaps, mirroring the Curve adapter.
    const observations: DexYieldObservation[] = [];
    const gaps: YieldDiscoveryGap[] = [];
    const queryHash = await sha256(GET_UNISWAP_POOLS_QUERY + '|' + GET_UNISWAP_SNAPSHOTS_QUERY);
    for (const { pool, snapshots, meta } of perPool) {
      const poolAddress = pool.id.toLowerCase();
      const complete = snapshots
        .filter((snapshot) => utcDayStart(snapshot.timestamp) + 86_400 <= boundary)
        .sort((a, b) => b.timestamp - a.timestamp);
      if (complete.length === 0) {
        gaps.push({ venue: 'uniswap-v3', poolAddress, reason: 'No complete UTC daily snapshot.' });
        continue;
      }
      const snapshot = complete.find(
        (value) =>
          value.dailySupplySideRevenueUSD !== undefined &&
          value.dailyVolumeUSD !== undefined &&
          value.totalValueLockedUSD !== undefined,
      );
      if (!snapshot) {
        gaps.push({
          venue: 'uniswap-v3',
          poolAddress,
          reason: 'Fee revenue, volume, and TVL must come from the same daily snapshot.',
        });
        continue;
      }
      if (snapshot.totalValueLockedUSD! <= 0) {
        gaps.push({
          venue: 'uniswap-v3',
          poolAddress,
          reason: 'A positive TVL is required to calculate fee APR.',
        });
        continue;
      }
      if (snapshot.dailySupplySideRevenueUSD! < 0 || snapshot.dailyVolumeUSD! < 0) {
        gaps.push({
          venue: 'uniswap-v3',
          poolAddress,
          reason: 'Daily fee revenue and volume must be non-negative.',
        });
        continue;
      }
      const windowStart = utcDayStart(snapshot.timestamp);
      observations.push(
        DexYieldObservationSchema.parse({
          venue: 'uniswap-v3',
          poolAddress,
          asset: 'USDC',
          tokenSymbols: snapshot.pool.inputTokens.map((token) => token.symbol.toUpperCase()),
          dailySupplySideFeesUsd: snapshot.dailySupplySideRevenueUSD,
          volume24hUsd: snapshot.dailyVolumeUSD,
          tvlUsd: snapshot.totalValueLockedUSD,
          estimatedFeeApr:
            (snapshot.dailySupplySideRevenueUSD! / snapshot.totalValueLockedUSD!) * 365 * 100,
          windowStart: new Date(windowStart * 1000).toISOString(),
          windowEnd: new Date((windowStart + 86_400) * 1000).toISOString(),
          subgraphId: this.#source.subgraphId,
          deploymentId: meta?.deployment,
          block: snapshot.blockNumber ?? meta?.block.number,
          timestamp: new Date((meta?.block.timestamp ?? snapshot.timestamp) * 1000).toISOString(),
          queryHash,
        }),
      );
    }
    return {
      venue: 'uniswap-v3',
      observations: observations.sort((a, b) => a.poolAddress.localeCompare(b.poolAddress)),
      gaps: gaps.sort((a, b) => (a.poolAddress ?? '').localeCompare(b.poolAddress ?? '')),
    };
  }

  async #fetchPools(): Promise<Array<z.infer<typeof UniswapPoolSchema>>> {
    let response: Response;
    try {
      response = await this.#fetch(
        'https://gateway.thegraph.com/api/subgraphs/id/' + this.#source.subgraphId,
        {
          method: 'POST',
          headers: {
            Authorization: 'Bearer ' + this.#apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            operationName: 'AskChingUniswapPools',
            query: GET_UNISWAP_POOLS_QUERY,
          }),
        },
      );
    } catch {
      throw new Error('Uniswap V3 Graph request failed');
    }
    if (!response.ok) {
      throw new Error('Uniswap V3 Graph request failed with HTTP ' + response.status);
    }
    const envelope = UniswapPoolsEnvelopeSchema.parse(await response.json());
    if (envelope.errors?.length || !envelope.data) {
      throw new Error('Uniswap V3 Graph query returned no usable data');
    }
    return [...(envelope.data.usdtPools ?? []), ...(envelope.data.daiPools ?? [])];
  }

  async #fetchSnapshots(poolId: string): Promise<{
    snapshots: Array<z.infer<typeof UniswapSnapshotSchema>>;
    meta: { deployment?: string; block: { number: number; timestamp: number } };
  }> {
    let response: Response;
    try {
      response = await this.#fetch(
        'https://gateway.thegraph.com/api/subgraphs/id/' + this.#source.subgraphId,
        {
          method: 'POST',
          headers: {
            Authorization: 'Bearer ' + this.#apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            operationName: 'AskChingUniswapSnapshots',
            query: GET_UNISWAP_SNAPSHOTS_QUERY,
            variables: { pool: poolId },
          }),
        },
      );
    } catch {
      throw new Error('Uniswap V3 Graph snapshot request failed');
    }
    if (!response.ok) {
      throw new Error('Uniswap V3 Graph snapshot request failed with HTTP ' + response.status);
    }
    const envelope = UniswapSnapshotsEnvelopeSchema.parse(await response.json());
    if (envelope.errors?.length || !envelope.data) {
      throw new Error('Uniswap V3 Graph snapshot query returned no usable data');
    }
    return {
      snapshots: envelope.data.liquidityPoolDailySnapshots,
      meta: envelope.data._meta,
    };
  }
}

export class CurveYieldAdapter {
  readonly #source: DexYieldSource;
  readonly #apiKey: string;
  readonly #fetch: typeof fetch;
  readonly #now: () => Date;

  constructor({
    source,
    apiKey,
    fetchImpl = fetch,
    now = () => new Date(),
  }: CurveYieldAdapterOptions) {
    this.#source = source;
    this.#apiKey = apiKey;
    this.#fetch = fetchImpl;
    this.#now = now;
  }

  async getOpportunities(input: YieldAdapterInput): Promise<YieldAdapterResult> {
    let response: Response;
    try {
      response = await this.#fetch(
        'https://gateway.thegraph.com/api/subgraphs/id/' + this.#source.subgraphId,
        {
          method: 'POST',
          headers: {
            Authorization: 'Bearer ' + this.#apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            operationName: 'AskChingCurveYields',
            query: GET_CURVE_YIELDS_QUERY,
          }),
        },
      );
    } catch {
      throw new Error('Curve Graph request failed');
    }
    if (!response.ok) {
      throw new Error('Curve Graph request failed with HTTP ' + response.status);
    }

    const envelope = CurveEnvelopeSchema.parse(await response.json());
    if (envelope.errors?.length || !envelope.data) {
      throw new Error('Curve Graph query returned no usable data');
    }

    const allowed = new Set<string>(Object.values(CORE_STABLECOIN_ADDRESSES));
    const requestedCounterparts = new Set<string>(
      input.stablecoins.map((symbol) => CORE_STABLECOIN_ADDRESSES[symbol]),
    );
    const now = this.#now();
    const boundary = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) / 1000;
    const snapshotsByPool = new Map<string, Array<z.infer<typeof CurveSnapshotSchema>>>();

    for (const snapshot of envelope.data.liquidityPoolDailySnapshots) {
      const poolAddress = snapshot.pool.id.toLowerCase();
      const tokenIds = snapshot.pool.inputTokens.map((token) => token.id.toLowerCase());
      const hasRequestedCounterpart = tokenIds.some((id) => requestedCounterparts.has(id));
      if (
        !tokenIds.includes(CORE_STABLECOIN_ADDRESSES.USDC) ||
        !hasRequestedCounterpart ||
        tokenIds.some((id) => !allowed.has(id))
      )
        continue;
      const snapshots = snapshotsByPool.get(poolAddress) ?? [];
      snapshots.push(snapshot);
      snapshotsByPool.set(poolAddress, snapshots);
    }

    const observations: DexYieldObservation[] = [];
    const gaps: YieldDiscoveryGap[] = [];
    const queryHash = await sha256(GET_CURVE_YIELDS_QUERY);
    for (const [poolAddress, poolSnapshots] of snapshotsByPool) {
      const complete = poolSnapshots
        .filter((snapshot) => utcDayStart(snapshot.timestamp) + 86_400 <= boundary)
        .sort((a, b) => b.timestamp - a.timestamp);
      if (complete.length === 0) {
        gaps.push({ venue: 'curve', poolAddress, reason: 'No complete UTC daily snapshot.' });
        continue;
      }
      const snapshot = complete.find(
        (value) =>
          value.dailySupplySideRevenueUSD !== undefined &&
          value.dailyVolumeUSD !== undefined &&
          value.totalValueLockedUSD !== undefined,
      );
      if (!snapshot) {
        gaps.push({
          venue: 'curve',
          poolAddress,
          reason: 'Fee revenue, volume, and TVL must come from the same daily snapshot.',
        });
        continue;
      }
      if (snapshot.totalValueLockedUSD! <= 0) {
        gaps.push({
          venue: 'curve',
          poolAddress,
          reason: 'A positive TVL is required to calculate fee APR.',
        });
        continue;
      }
      if (snapshot.dailySupplySideRevenueUSD! < 0 || snapshot.dailyVolumeUSD! < 0) {
        gaps.push({
          venue: 'curve',
          poolAddress,
          reason: 'Daily fee revenue and volume must be non-negative.',
        });
        continue;
      }
      const windowStart = utcDayStart(snapshot.timestamp);
      observations.push(
        DexYieldObservationSchema.parse({
          venue: 'curve',
          poolAddress,
          asset: 'USDC',
          tokenSymbols: snapshot.pool.inputTokens.map((token) => token.symbol.toUpperCase()),
          dailySupplySideFeesUsd: snapshot.dailySupplySideRevenueUSD,
          volume24hUsd: snapshot.dailyVolumeUSD,
          tvlUsd: snapshot.totalValueLockedUSD,
          estimatedFeeApr:
            (snapshot.dailySupplySideRevenueUSD! / snapshot.totalValueLockedUSD!) * 365 * 100,
          windowStart: new Date(windowStart * 1000).toISOString(),
          windowEnd: new Date((windowStart + 86_400) * 1000).toISOString(),
          subgraphId: this.#source.subgraphId,
          deploymentId: envelope.data._meta.deployment,
          block: snapshot.blockNumber ?? envelope.data._meta.block.number,
          timestamp: new Date(envelope.data._meta.block.timestamp * 1000).toISOString(),
          queryHash,
        }),
      );
    }
    return {
      venue: 'curve',
      observations: observations.sort((a, b) => a.poolAddress.localeCompare(b.poolAddress)),
      gaps: gaps.sort((a, b) => (a.poolAddress ?? '').localeCompare(b.poolAddress ?? '')),
    };
  }
}

function utcDayStart(timestamp: number): number {
  return Math.floor(timestamp / 86_400) * 86_400;
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return (
    'sha256:' +
    [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
  );
}
