import { describe, expect, it } from 'vitest';

import {
  LIVE_PROTOCOLS,
  LIVE_SOURCES,
  PROTOCOL_REGISTRY,
  SUPPORTED_PROTOCOLS,
  assertLiveProtocols,
  getSource,
  requireSource,
} from './source-config.js';

describe('PROTOCOL_REGISTRY', () => {
  it('registers exactly thirteen protocols', () => {
    // 4 live + 5 reachable-but-unusable + 4 older-schema deferred.
    expect(PROTOCOL_REGISTRY).toHaveLength(13);
  });

  it('marks exactly four protocols live, all on schema 3.1.0', () => {
    // Verified 2026-09-12 with `pnpm probe:protocols` against the live gateway.
    // uwu-lend, zerolend and aave-amm are schema 3.1.0 but cannot serve USDC;
    // aave-arc and aave-rwa can serve USDC but at ~0% APY and ~$5k TVL.
    expect(LIVE_SOURCES).toHaveLength(4);
    expect(LIVE_PROTOCOLS).toEqual(['aave-v3', 'compound-v3', 'spark-lend', 'aave-v2']);
    expect(LIVE_SOURCES.every((source) => source.live)).toBe(true);
    expect(LIVE_SOURCES.every((source) => source.schemaVersion === '3.1.0')).toBe(true);
  });

  it('requires a reason on every non-live entry', () => {
    for (const source of PROTOCOL_REGISTRY) {
      if (source.live) continue;
      expect(source.note, `${source.protocol} needs a note`).toBeTruthy();
      expect((source.note ?? '').length).toBeGreaterThan(20);
    }
  });

  it('gives no live entry a note', () => {
    for (const source of LIVE_SOURCES) {
      expect(source.note).toBeUndefined();
    }
  });

  it('pins every subgraph id to the verified task values', () => {
    const byProtocol = Object.fromEntries(
      PROTOCOL_REGISTRY.map((source) => [source.protocol, source.subgraphId]),
    );
    expect(byProtocol).toMatchObject({
      'aave-v3': 'JCNWRypm7FYwV8fx5HhzZPSFaMxgkPuw4TnR3Gpi81zk',
      'compound-v3': 'AwoxEZbiWLvv6e3QdvdMZw4WDURdGbvPfHmZRc8Dpfz9',
      'spark-lend': 'GbKdmBe4ycCYCQLQSjqGg6UHYoYfbyJyq5WrG35pv1si',
      'aave-v2': 'C2zniPn45RnLDGzVeGZCx2Sw3GXrbc9gL4ZfL8B8Em2j',
      'uwu-lend': 'CZBD7e8VGvNa6WkBHZAaC688bsZ35UvAM1AuDdVng2aE',
      zerolend: '4Zf4doH54RDit9KVsfCp3MkjrP3szhJZwvw2z5PHczx9',
      'aave-amm': '41ooPWnDYKwckqyG1mvg7ZEndy5zMemXinx6uQxscrBS',
      'aave-arc': '5hyqnEzjZbwFBU1rk4JBknCeiF2Mj93qBzsyQfpAa3QA',
      'aave-rwa': 'C8ynQrjVKcmqxb9fWrLvSCBFNf2ChFkxCg7Q8gknJrza',
      // Was ...F2tA9a9a (an extra trailing "9a") until 2026-09-12, which the
      // gateway rejected with 'invalid subgraph ID'. The Messari deployment
      // manifest has ...F2tA9a.
      'compound-v2': '4TbqVA8p2DoBd5qDbPMwmDZv3CsJjWtxo8nVSqF2tA9a',
      'rari-fuse': 'kecp6SPMvbB4GTqg9r5PXvztYriexj5F3ZCaATpjmb2',
      makerdao: '8sE6rTNkPhzZXZC6c8UQy2ghFTu5PPdGauwUBm4t7HZ1',
      euler: '95nyAWFFaiz6gykko3HtBCyhRuP5vZzuKYsZiLxHxLhr',
    });
  });

  it('keeps non-live protocols out of the live list', () => {
    const notLive = [
      'uwu-lend',
      'zerolend',
      'aave-amm',
      'aave-arc',
      'aave-rwa',
      'compound-v2',
      'rari-fuse',
      'makerdao',
      'euler',
    ];
    for (const protocol of notLive) {
      const source = getSource(protocol);
      expect(source?.live).toBe(false);
      expect(LIVE_PROTOCOLS).not.toContain(protocol);
    }
  });

  it('exposes supported protocol slugs for registry validation', () => {
    expect(SUPPORTED_PROTOCOLS).toEqual([
      'aave-v3',
      'compound-v3',
      'spark-lend',
      'aave-v2',
      'uwu-lend',
      'zerolend',
      'aave-amm',
      'aave-arc',
      'aave-rwa',
      'compound-v2',
      'rari-fuse',
      'makerdao',
      'euler',
    ]);
  });
});

describe('getSource / requireSource', () => {
  it('resolves a known protocol', () => {
    expect(getSource('aave-v3')?.subgraphId).toBe('JCNWRypm7FYwV8fx5HhzZPSFaMxgkPuw4TnR3Gpi81zk');
    expect(requireSource('aave-v2').live).toBe(true);
  });

  it('returns undefined for an unknown protocol', () => {
    expect(getSource('dforce')).toBeUndefined();
  });

  it('throws for an unknown protocol and lists supported slugs', () => {
    expect(() => requireSource('dforce')).toThrow(/Unknown protocol: dforce/);
    expect(() => requireSource('dforce')).toThrow(/aave-v3/);
    expect(() => requireSource('dforce')).toThrow(/euler/);
  });
});

describe('assertLiveProtocols', () => {
  it('accepts only live protocols', () => {
    expect(() => assertLiveProtocols(['aave-v3', 'compound-v3', 'aave-v2'])).not.toThrow();
  });

  it('rejects non-live protocols with a live list hint', () => {
    expect(() => assertLiveProtocols(['aave-v3', 'compound-v2'])).toThrow(
      /Protocols not yet live: compound-v2/,
    );
    expect(() => assertLiveProtocols(['aave-v3', 'zerolend'])).toThrow(
      /Protocols not yet live: zerolend\. Live: aave-v3, compound-v3, spark-lend, aave-v2/,
    );
  });
});
