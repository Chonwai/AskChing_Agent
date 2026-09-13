import type { AskChingEnvironment } from './data-source.js';
import { DEX_YIELD_FIXTURES } from './yield-fixtures.js';
import {
  CurveYieldAdapter,
  UniswapV3YieldAdapter,
  type YieldAdapterResult,
} from './yield-client.js';
import { DEX_YIELD_SOURCES } from './yield-sources.js';

export type DexYieldVenue = 'uniswap-v3' | 'curve';
export type StablecoinCounterpart = 'USDT' | 'DAI';

export interface DexYieldRequest {
  venues: readonly DexYieldVenue[];
  stablecoins: readonly StablecoinCounterpart[];
}

export interface DexYieldDataSource {
  getDexYieldOpportunities(input: DexYieldRequest): Promise<YieldAdapterResult[]>;
}

export function createDexYieldDataSource(
  environment: AskChingEnvironment,
  fetchImpl: typeof fetch = fetch,
  now: () => Date = () => new Date(),
): DexYieldDataSource {
  if (environment.DEMO_LIVE !== '1') {
    return {
      async getDexYieldOpportunities(input) {
        const selected = [...new Set(input.venues)];
        return selected.map((venue) => ({
          venue,
          observations: DEX_YIELD_FIXTURES.filter(
            (observation) =>
              observation.venue === venue &&
              matchesStablecoins(observation.tokenSymbols, input.stablecoins),
          ),
          gaps: [],
        }));
      },
    };
  }

  return {
    async getDexYieldOpportunities(input) {
      if (!environment.GRAPH_API_KEY) {
        throw new Error('GRAPH_API_KEY is required when DEMO_LIVE=1');
      }
      const selected = [...new Set(input.venues)];
      const settled = await Promise.allSettled(
        selected.map((venue) => {
          const source = DEX_YIELD_SOURCES.find((candidate) => candidate.venue === venue);
          if (!source) throw new Error('Unregistered DEX yield venue');
          const options = {
            source,
            apiKey: environment.GRAPH_API_KEY!,
            fetchImpl,
            now,
          };
          const adapter =
            venue === 'uniswap-v3'
              ? new UniswapV3YieldAdapter(options)
              : new CurveYieldAdapter(options);
          return adapter.getOpportunities({ stablecoins: input.stablecoins });
        }),
      );
      return settled.map((result, index) =>
        result.status === 'fulfilled'
          ? result.value
          : {
              venue: selected[index]!,
              observations: [],
              gaps: [
                {
                  venue: selected[index]!,
                  reason: `${displayVenue(selected[index]!)} data is unavailable from its configured Graph source.`,
                },
              ],
            },
      );
    },
  };
}

function matchesStablecoins(
  tokens: readonly string[],
  stablecoins: readonly StablecoinCounterpart[],
): boolean {
  const allowed = new Set<string>(['USDC', 'USDT', 'DAI']);
  return (
    tokens.includes('USDC') &&
    stablecoins.some((stablecoin) => tokens.includes(stablecoin)) &&
    tokens.every((token) => allowed.has(token))
  );
}

function displayVenue(venue: DexYieldVenue): string {
  return venue === 'uniswap-v3' ? 'Uniswap V3' : 'Curve';
}
