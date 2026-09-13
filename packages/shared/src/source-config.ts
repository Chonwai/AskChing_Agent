import type { ProtocolSlug } from './schemas.js';

export type { ProtocolSlug } from './schemas.js';

export interface SubgraphSource {
  protocol: ProtocolSlug;
  network: 'mainnet';
  subgraphId: string;
  explorerUrl: string;
  schemaVersion: string;
  /**
   * True only when a live USDC request for this protocol has been observed to
   * return a cited observation. `pnpm probe:protocols` is the evidence.
   */
  live: boolean;
  /** Why a non-live entry is not live. Required whenever `live` is false. */
  note?: string;
}

export const PROTOCOL_REGISTRY: readonly SubgraphSource[] = [
  // ── LIVE (schema 3.1.0, verified returning USDC data on mainnet) ──
  {
    protocol: 'aave-v3',
    network: 'mainnet',
    subgraphId: 'JCNWRypm7FYwV8fx5HhzZPSFaMxgkPuw4TnR3Gpi81zk',
    explorerUrl:
      'https://thegraph.com/explorer/subgraphs/JCNWRypm7FYwV8fx5HhzZPSFaMxgkPuw4TnR3Gpi81zk',
    schemaVersion: '3.1.0',
    live: true,
  },
  {
    protocol: 'compound-v3',
    network: 'mainnet',
    subgraphId: 'AwoxEZbiWLvv6e3QdvdMZw4WDURdGbvPfHmZRc8Dpfz9',
    explorerUrl:
      'https://thegraph.com/explorer/subgraphs/AwoxEZbiWLvv6e3QdvdMZw4WDURdGbvPfHmZRc8Dpfz9',
    schemaVersion: '3.1.0',
    live: true,
  },
  {
    protocol: 'spark-lend',
    network: 'mainnet',
    subgraphId: 'GbKdmBe4ycCYCQLQSjqGg6UHYoYfbyJyq5WrG35pv1si',
    explorerUrl:
      'https://thegraph.com/explorer/subgraphs/GbKdmBe4ycCYCQLQSjqGg6UHYoYfbyJyq5WrG35pv1si',
    schemaVersion: '3.1.0',
    live: true,
  },
  {
    protocol: 'aave-v2',
    network: 'mainnet',
    subgraphId: 'C2zniPn45RnLDGzVeGZCx2Sw3GXrbc9gL4ZfL8B8Em2j',
    explorerUrl:
      'https://thegraph.com/explorer/subgraphs/C2zniPn45RnLDGzVeGZCx2Sw3GXrbc9gL4ZfL8B8Em2j',
    schemaVersion: '3.1.0',
    live: true,
  },
  // ── VERIFIED REACHABLE BUT NOT USABLE AS LIVE USDC SOURCES ───────
  // Confirmed on 2026-09-12 with the Graph gateway. These stay in the registry
  // as a record so the investigation is not repeated, but they are not live:
  // every USDC query would fail closed and only produce gaps.
  {
    protocol: 'uwu-lend',
    network: 'mainnet',
    subgraphId: 'CZBD7e8VGvNa6WkBHZAaC688bsZ35UvAM1AuDdVng2aE',
    explorerUrl:
      'https://thegraph.com/explorer/subgraphs/CZBD7e8VGvNa6WkBHZAaC688bsZ35UvAM1AuDdVng2aE',
    schemaVersion: '3.1.0',
    live: false,
    note: 'Reachable and schema-compatible, but the mainnet deployment has no USDC market (it lists sifu, sDAI, sSPELL, USDT, DUMMY). Any USDC request fails closed.',
  },
  {
    protocol: 'zerolend',
    network: 'mainnet',
    subgraphId: '4Zf4doH54RDit9KVsfCp3MkjrP3szhJZwvw2z5PHczx9',
    explorerUrl:
      'https://thegraph.com/explorer/subgraphs/4Zf4doH54RDit9KVsfCp3MkjrP3szhJZwvw2z5PHczx9',
    schemaVersion: '3.1.0',
    live: false,
    note: "Every mainnet market returns isActive=false with totalValueLockedUSD=0. ZeroLend's live deployments are on other networks.",
  },
  {
    protocol: 'aave-amm',
    network: 'mainnet',
    subgraphId: '41ooPWnDYKwckqyG1mvg7ZEndy5zMemXinx6uQxscrBS',
    explorerUrl:
      'https://thegraph.com/explorer/subgraphs/41ooPWnDYKwckqyG1mvg7ZEndy5zMemXinx6uQxscrBS',
    schemaVersion: '3.1.0',
    live: false,
    note: 'Schema 3.1.0 and reachable, but the mainnet deployment reports zero active markets.',
  },
  {
    protocol: 'aave-arc',
    network: 'mainnet',
    subgraphId: '5hyqnEzjZbwFBU1rk4JBknCeiF2Mj93qBzsyQfpAa3QA',
    explorerUrl:
      'https://thegraph.com/explorer/subgraphs/5hyqnEzjZbwFBU1rk4JBknCeiF2Mj93qBzsyQfpAa3QA',
    schemaVersion: '3.1.0',
    live: false,
    note: 'Schema 3.1.0 with a USDC market, but ~$57k TVL and 0% APY: technically queryable, analytically worthless.',
  },
  {
    protocol: 'aave-rwa',
    network: 'mainnet',
    subgraphId: 'C8ynQrjVKcmqxb9fWrLvSCBFNf2ChFkxCg7Q8gknJrza',
    explorerUrl:
      'https://thegraph.com/explorer/subgraphs/C8ynQrjVKcmqxb9fWrLvSCBFNf2ChFkxCg7Q8gknJrza',
    schemaVersion: '3.1.0',
    live: false,
    note: 'Schema 3.1.0 with a USDC market, but ~$4.4k TVL and 0% supply APY: technically queryable, analytically worthless.',
  },
  // ── DEFERRED (older schema; the shared query needs fields they lack) ──
  {
    protocol: 'compound-v2',
    network: 'mainnet',
    subgraphId: '4TbqVA8p2DoBd5qDbPMwmDZv3CsJjWtxo8nVSqF2tA9a',
    explorerUrl:
      'https://thegraph.com/explorer/subgraphs/4TbqVA8p2DoBd5qDbPMwmDZv3CsJjWtxo8nVSqF2tA9a',
    schemaVersion: '2.0.1',
    live: false,
    note: 'Schema 2.0.1. Market has no indexLastUpdatedTimestamp field, which GET_MARKETS_QUERY selects.',
  },
  {
    protocol: 'rari-fuse',
    network: 'mainnet',
    subgraphId: 'kecp6SPMvbB4GTqg9r5PXvztYriexj5F3ZCaATpjmb2',
    explorerUrl:
      'https://thegraph.com/explorer/subgraphs/kecp6SPMvbB4GTqg9r5PXvztYriexj5F3ZCaATpjmb2',
    schemaVersion: '2.0.1',
    live: false,
    note: 'Schema 2.0.1. Market has no indexLastUpdatedTimestamp field, which GET_MARKETS_QUERY selects.',
  },
  {
    protocol: 'makerdao',
    network: 'mainnet',
    subgraphId: '8sE6rTNkPhzZXZC6c8UQy2ghFTu5PPdGauwUBm4t7HZ1',
    explorerUrl:
      'https://thegraph.com/explorer/subgraphs/8sE6rTNkPhzZXZC6c8UQy2ghFTu5PPdGauwUBm4t7HZ1',
    schemaVersion: '2.0.1',
    live: false,
    note: 'Schema 2.0.1. Market has no indexLastUpdatedTimestamp field, which GET_MARKETS_QUERY selects.',
  },
  {
    protocol: 'euler',
    network: 'mainnet',
    subgraphId: '95nyAWFFaiz6gykko3HtBCyhRuP5vZzuKYsZiLxHxLhr',
    explorerUrl:
      'https://thegraph.com/explorer/subgraphs/95nyAWFFaiz6gykko3HtBCyhRuP5vZzuKYsZiLxHxLhr',
    schemaVersion: '1.3.0',
    live: false,
    note: 'Schema 1.3.0. Market has no indexLastUpdatedTimestamp field, which GET_MARKETS_QUERY selects.',
  },
] as const;

// ── 衍生視圖 ───────────────────────────────────────────────────────
export const LIVE_SOURCES: readonly SubgraphSource[] = PROTOCOL_REGISTRY.filter(
  (source) => source.live,
);

export const SUPPORTED_PROTOCOLS: readonly string[] = PROTOCOL_REGISTRY.map(
  (source) => source.protocol,
);
export const LIVE_PROTOCOLS: readonly string[] = LIVE_SOURCES.map((source) => source.protocol);

export function getSource(protocol: string): SubgraphSource | undefined {
  return PROTOCOL_REGISTRY.find((source) => source.protocol === protocol);
}

export function requireSource(protocol: string): SubgraphSource {
  const source = getSource(protocol);
  if (!source) {
    throw new Error(`Unknown protocol: ${protocol}. Supported: ${SUPPORTED_PROTOCOLS.join(', ')}`);
  }
  return source;
}

export function assertLiveProtocols(protocols: readonly string[]): void {
  const nonLive = protocols.filter((protocol) => {
    const source = getSource(protocol);
    return !source || !source.live;
  });
  if (nonLive.length) {
    throw new Error(
      `Protocols not yet live: ${nonLive.join(', ')}. Live: ${LIVE_PROTOCOLS.join(', ')}`,
    );
  }
}
