import { describe, expect, it, vi } from 'vitest';

import { createMarketDataSource, type LiveDataSource } from './data-source.js';
import { LIVE_SOURCES } from './source-config.js';

describe('createMarketDataSource (fixture mode)', () => {
  it('exposes DEX yield opportunities through the shared facade', async () => {
    const source = createMarketDataSource({ DEMO_LIVE: '0' });
    const results = await source.getDexYieldOpportunities({
      venues: ['uniswap-v3'],
      stablecoins: ['DAI'],
    });
    expect(results).toHaveLength(1);
    expect(results[0]?.observations.every((value) => value.venue === 'uniswap-v3')).toBe(true);
  });

  it('returns two cited observations without fetching in fixture mode', async () => {
    const fetchImpl = vi.fn(() => {
      throw new Error('fixture mode must not fetch');
    });
    const source = createMarketDataSource({ DEMO_LIVE: '0' }, fetchImpl as unknown as typeof fetch);

    const observations = await source.getObservations('usdc_supply_apy', [
      'aave-v3',
      'compound-v3',
    ]);

    expect(fetchImpl).not.toHaveBeenCalled();
    expect(observations).toHaveLength(2);
    expect(new Set(observations.map((item) => item.subgraphId)).size).toBe(2);
    expect(observations.every((item) => item.queryHash.length > 0)).toBe(true);
  });

  it('resolves the legacy alias to supply_apy/USDC observations', async () => {
    const source = createMarketDataSource({ DEMO_LIVE: '0' });

    const observations = await source.getObservations('usdc_supply_apy', [
      'aave-v3',
      'compound-v3',
    ]);

    expect(observations).toHaveLength(2);
    expect(observations.every((item) => item.metric === 'supply_apy')).toBe(true);
    expect(observations.every((item) => item.asset === 'USDC')).toBe(true);
  });

  it('filters observations by a requested asset', async () => {
    const source = createMarketDataSource({ DEMO_LIVE: '0' });

    const weth = await source.getObservations('supply_apy', ['aave-v3', 'compound-v3'], 'WETH');
    expect(weth).toHaveLength(2);
    expect(weth.every((item) => item.asset === 'WETH')).toBe(true);

    const usdt = await source.getObservations('supply_apy', ['aave-v3', 'compound-v3'], 'usdt');
    expect(usdt).toHaveLength(2);
    expect(usdt.every((item) => item.asset === 'USDT')).toBe(true);
  });

  it('normalizes asset symbols to uppercase', async () => {
    const source = createMarketDataSource({ DEMO_LIVE: '0' });

    const observations = await source.getObservations(
      'supply_apy',
      ['aave-v3', 'compound-v3'],
      'weth',
    );
    expect(observations.every((item) => item.asset === 'WETH')).toBe(true);
  });

  it('rejects an invalid asset symbol', async () => {
    const source = createMarketDataSource({ DEMO_LIVE: '0' });

    await expect(
      source.getObservations('supply_apy', ['aave-v3', 'compound-v3'], 'usd c'),
    ).rejects.toThrow(/Asset symbol/);
  });

  it('returns tvl observations with usd unit for a given asset', async () => {
    const source = createMarketDataSource({ DEMO_LIVE: '0' });

    const observations = await source.getObservations('tvl', ['aave-v3', 'compound-v3'], 'USDC');
    expect(observations).toHaveLength(2);
    expect(observations.every((item) => item.unit === 'usd')).toBe(true);
  });

  it('returns comparable utilization observations for requested protocols', async () => {
    const source = createMarketDataSource({ DEMO_LIVE: '0' });

    const observations = await source.getObservations(
      'utilization',
      ['aave-v3', 'compound-v3'],
      'USDC',
    );
    expect(observations).toHaveLength(2);
    expect(observations[0]!.metric).toBe('utilization');
  });
});

describe('createMarketDataSource (live mode)', () => {
  it('fails clearly when live mode has no Graph API key', async () => {
    const source = createMarketDataSource({ DEMO_LIVE: '1' });

    await expect(
      source.getObservations('usdc_supply_apy', ['aave-v3', 'compound-v3']),
    ).rejects.toThrow('GRAPH_API_KEY is required when DEMO_LIVE=1');
  });

  it('rejects a deferred protocol in live mode', async () => {
    const source = createMarketDataSource({
      DEMO_LIVE: '1',
      GRAPH_API_KEY: 'test-graph-key',
    });

    await expect(source.getObservations('supply_apy', ['aave-v3', 'compound-v2'])).rejects.toThrow(
      /Protocols not yet live: compound-v2/,
    );
  });

  it('collects per-source gaps when one subgraph fails instead of failing the fan-out', async () => {
    const [first, second] = LIVE_SOURCES;
    const firstUrl = `https://gateway.thegraph.com/api/subgraphs/id/${first!.subgraphId}`;
    const secondUrl = `https://gateway.thegraph.com/api/subgraphs/id/${second!.subgraphId}`;

    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === firstUrl) {
        return new Response('boom', { status: 500 });
      }
      if (url === secondUrl) {
        return new Response(
          JSON.stringify({
            data: {
              markets: [
                {
                  inputToken: { symbol: 'USDC' },
                  rates: [{ rate: '5.10', side: 'LENDER', type: 'VARIABLE' }],
                  totalValueLockedUSD: '500000000',
                  totalDepositBalanceUSD: '400000000',
                  totalBorrowBalanceUSD: '300000000',
                  indexLastUpdatedTimestamp: '1788825600',
                  isActive: true,
                },
              ],
              _meta: {
                deployment: 'QmSecondDeployment',
                block: { number: '22100123', timestamp: '1788825600' },
              },
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }
      throw new Error(`unexpected URL: ${url}`);
    });

    const source = createMarketDataSource(
      { DEMO_LIVE: '1', GRAPH_API_KEY: 'test-graph-key' },
      fetchImpl as unknown as typeof fetch,
    );

    // With exactly two sources and one failing, fewer than two cited
    // observations survive — the comparison must fail clearly, and the
    // settled gap must name the failed protocol.
    await expect(
      source.getObservations('usdc_supply_apy', ['aave-v3', 'compound-v3']),
    ).rejects.toThrow(/aave-v3: .*HTTP 500/);
  });

  it('fans out getMarketObservation across live protocols for any metric', async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            data: {
              markets: [
                {
                  inputToken: { symbol: 'USDC' },
                  rates: [
                    { rate: '4.75', side: 'LENDER', type: 'VARIABLE' },
                    { rate: '6.25', side: 'BORROWER', type: 'VARIABLE' },
                  ],
                  totalValueLockedUSD: '1250000000',
                  totalDepositBalanceUSD: '1000000000',
                  totalBorrowBalanceUSD: '784000000',
                  indexLastUpdatedTimestamp: '1788825600',
                  isActive: true,
                },
              ],
              _meta: {
                deployment: 'QmLiveDeployment',
                block: { number: '22100123', timestamp: '1788825600' },
              },
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
    );
    const source = createMarketDataSource(
      { DEMO_LIVE: '1', GRAPH_API_KEY: 'test-graph-key' },
      fetchImpl as unknown as typeof fetch,
    );

    const observations = await source.getObservations('tvl', ['aave-v3', 'compound-v3']);

    expect(observations).toHaveLength(2);
    expect(observations.every((item) => item.metric === 'tvl')).toBe(true);
    expect(observations.every((item) => item.unit === 'usd')).toBe(true);
    expect(observations.every((item) => item.asset === 'USDC')).toBe(true);
  });
});

describe('createMarketDataSource.getHistory (fixture mode)', () => {
  it('returns one cited series per protocol without fetching', async () => {
    const fetchImpl = vi.fn(() => {
      throw new Error('fixture mode must not fetch');
    });
    const source = createMarketDataSource({ DEMO_LIVE: '0' }, fetchImpl as unknown as typeof fetch);

    const series = await source.getHistory('supply_apy', '7d', [
      'aave-v3',
      'compound-v3',
      'spark-lend',
    ]);

    expect(fetchImpl).not.toHaveBeenCalled();
    expect(series).toHaveLength(3);
    expect(series.map((item) => item.protocol).sort()).toEqual([
      'aave-v3',
      'compound-v3',
      'spark-lend',
    ]);
    expect(
      series.every(
        (item) =>
          item.metric === 'supply_apy' && item.unit === 'percent' && item.points.length === 7,
      ),
    ).toBe(true);
    expect(
      series.every((item) =>
        item.points.every(
          (point) =>
            point.protocol === item.protocol &&
            point.metric === 'supply_apy' &&
            point.asset === 'USDC' &&
            point.unit === 'percent' &&
            point.queryHash.length > 0 &&
            point.block !== undefined,
        ),
      ),
    ).toBe(true);
    expect(series[0]!.points.map((point) => point.days)).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  it('filters the series by the requested protocols and asset', async () => {
    const source = createMarketDataSource({ DEMO_LIVE: '0' });

    const filtered = await source.getHistory('supply_apy', '7d', ['aave-v3', 'compound-v3']);
    expect(filtered.map((item) => item.protocol)).toEqual(['aave-v3', 'compound-v3']);

    const weth = await source.getHistory('supply_apy', '7d', ['aave-v3', 'compound-v3'], 'WETH');
    expect(weth).toEqual([]);
  });

  it('returns no series for a protocol without history fixtures', async () => {
    const source = createMarketDataSource({ DEMO_LIVE: '0' });

    const series = await source.getHistory('supply_apy', '7d', ['zerolend']);
    expect(series).toEqual([]);
  });

  it('keeps only the available points when the window is wider than the fixture', async () => {
    const source = createMarketDataSource({ DEMO_LIVE: '0' });

    const series = await source.getHistory('utilization', '30d', ['aave-v3', 'spark-lend']);

    expect(series).toHaveLength(2);
    // 7 fixture days exist; nothing is padded or extrapolated to 30.
    expect(series.every((item) => item.points.length === 7)).toBe(true);
    expect(series.every((item) => item.points.every((point) => point.unit === 'percent'))).toBe(
      true,
    );
  });

  it('resolves the legacy alias and slices to the requested window', async () => {
    const source = createMarketDataSource({ DEMO_LIVE: '0' });

    const series = await source.getHistory('usdc_supply_apy', '7d', ['aave-v3', 'compound-v3']);

    expect(series.every((item) => item.metric === 'supply_apy')).toBe(true);
    expect(series.every((item) => item.points.every((point) => point.asset === 'USDC'))).toBe(true);
  });
});

describe('createMarketDataSource.getHistory (live mode)', () => {
  it('fails clearly when live mode has no Graph API key', async () => {
    const source = createMarketDataSource({ DEMO_LIVE: '1' });

    await expect(source.getHistory('supply_apy', '7d', ['aave-v3', 'compound-v3'])).rejects.toThrow(
      'GRAPH_API_KEY is required when DEMO_LIVE=1',
    );
  });

  it('rejects a deferred protocol in live mode', async () => {
    const source = createMarketDataSource({
      DEMO_LIVE: '1',
      GRAPH_API_KEY: 'test-graph-key',
    });

    await expect(source.getHistory('supply_apy', '7d', ['aave-v3', 'compound-v2'])).rejects.toThrow(
      /Protocols not yet live: compound-v2/,
    );
  });

  it('collects per-source gaps when one subgraph fails instead of failing the fan-out', async () => {
    const [first, second] = LIVE_SOURCES;
    const firstUrl = `https://gateway.thegraph.com/api/subgraphs/id/${first!.subgraphId}`;
    const secondUrl = `https://gateway.thegraph.com/api/subgraphs/id/${second!.subgraphId}`;

    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === firstUrl) {
        return new Response('boom', { status: 500 });
      }
      if (url === secondUrl) {
        return new Response(
          JSON.stringify({
            data: {
              markets: [
                {
                  inputToken: { symbol: 'USDC' },
                  isActive: true,
                  dailySnapshots: [
                    {
                      days: '0',
                      timestamp: '1788307200',
                      blockNumber: '22100000',
                      rates: [{ rate: '3.30', side: 'LENDER', type: 'VARIABLE' }],
                      totalDepositBalanceUSD: '1000000000',
                      totalBorrowBalanceUSD: '784000000',
                      totalValueLockedUSD: '1250000000',
                    },
                    {
                      days: '1',
                      timestamp: '1788393600',
                      blockNumber: '22107200',
                      rates: [{ rate: '3.14', side: 'LENDER', type: 'VARIABLE' }],
                      totalDepositBalanceUSD: '1000000000',
                      totalBorrowBalanceUSD: '786000000',
                      totalValueLockedUSD: '1250000000',
                    },
                  ],
                },
              ],
              _meta: {
                deployment: 'QmSecondDeployment',
                block: { number: '22100123', timestamp: '1788825600' },
              },
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }
      throw new Error(`unexpected URL: ${url}`);
    });

    const source = createMarketDataSource(
      { DEMO_LIVE: '1', GRAPH_API_KEY: 'test-graph-key' },
      fetchImpl as unknown as typeof fetch,
    );

    const series = await source.getHistory('supply_apy', '7d', ['aave-v3', 'compound-v3']);

    expect(series).toHaveLength(1);
    expect(series[0]!.protocol).toBe(second!.protocol);
    expect(series[0]!.points.map((point) => point.value)).toEqual([3.3, 3.14]);
    expect((source as LiveDataSource).lastGaps).toEqual([
      expect.stringMatching(/^aave-v3: .*HTTP 500/),
    ]);
  });

  it('returns an empty series list when every source fails, leaving gaps for the analysis layer', async () => {
    const fetchImpl = vi.fn(async () => new Response('boom', { status: 500 }));
    const source = createMarketDataSource(
      { DEMO_LIVE: '1', GRAPH_API_KEY: 'test-graph-key' },
      fetchImpl as unknown as typeof fetch,
    );

    const series = await source.getHistory('supply_apy', '7d', ['aave-v3', 'compound-v3']);

    expect(series).toEqual([]);
    expect((source as LiveDataSource).lastGaps).toHaveLength(2);
  });
});
