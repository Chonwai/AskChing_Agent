import { describe, expect, it } from 'vitest';

import { analyzeTrendSeries, computeTrendStats } from './analysis.js';
import { MARKET_FIXTURES, MARKET_HISTORY_FIXTURES } from './fixtures.js';
import {
  AnalyzeTrendsResultSchema,
  TREND_WINDOW_DAYS,
  TrendFindingSchema,
  TrendPointSchema,
  TrendWindowSchema,
  type TrendPoint,
  type TrendSeries,
} from './schemas.js';

const POINT = {
  metric: 'supply_apy',
  asset: 'USDC',
  rateType: 'variable',
  value: 4.25,
  unit: 'percent',
  protocol: 'aave-v3',
  subgraphId: 'JCNWRypm7FYwV8fx5HhzZPSFaMxgkPuw4TnR3Gpi81zk',
  deploymentId: 'fixture:aave-v3-mainnet',
  block: 21_100_100,
  timestamp: '2026-09-08T00:05:00.000Z',
  queryHash: 'sha256:fixture-aave-usdc-supply-apy-d6',
  days: 6,
} as const;

const CITATION = {
  metric: 'supply_apy',
  protocol: 'aave-v3',
  asset: 'USDC',
  subgraphId: 'JCNWRypm7FYwV8fx5HhzZPSFaMxgkPuw4TnR3Gpi81zk',
  timestamp: '2026-09-08T00:05:00.000Z',
  queryHash: 'sha256:fixture-aave-usdc-supply-apy-d6',
} as const;

const STATS = {
  latest: 4.25,
  earliest: 3.8,
  min: 3.8,
  max: 4.25,
  change: 0.45,
  changePct: 11.84,
  slopePerDay: 0.0764,
  direction: 'rising',
  volatility: 0.0229,
} as const;

describe('trend schema contracts', () => {
  it('accepts only the supported trend windows and maps them to lookback days', () => {
    expect(TrendWindowSchema.options).toEqual(['7d', '30d']);
    expect(() => TrendWindowSchema.parse('90d')).toThrow();
    expect(TREND_WINDOW_DAYS).toEqual({ '7d': 7, '30d': 30 });
  });

  it('inherits the citation invariant on every trend point', () => {
    expect(TrendPointSchema.parse(POINT).days).toBe(6);

    // A trend point without the citation spine must fail closed.
    const { queryHash: _omitted, ...uncited } = POINT;
    expect(() => TrendPointSchema.parse(uncited)).toThrow();

    expect(() => TrendPointSchema.parse({ ...POINT, days: -1 })).toThrow();
    expect(() => TrendPointSchema.parse({ ...POINT, days: 1.5 })).toThrow();
  });

  it('requires at least two cited points and a calculation per trend finding', () => {
    const finding = {
      severity: 'info',
      protocol: 'aave-v3',
      claim: 'aave-v3 USDC supply_apy rose over 7d.',
      calculation: '4.25 - 3.80 = 0.45 percentage points',
      stats: STATS,
      points: [POINT, { ...POINT, days: 0, value: 3.8 }],
      citations: [CITATION, { ...CITATION, queryHash: 'sha256:other' }],
      confidence: 'high',
      caveats: ['Historical trend is descriptive, not a forecast.'],
    };

    expect(TrendFindingSchema.parse(finding).points).toHaveLength(2);

    expect(() => TrendFindingSchema.parse({ ...finding, citations: [CITATION] })).toThrow();
    expect(() => TrendFindingSchema.parse({ ...finding, points: [POINT] })).toThrow();
    expect(() => TrendFindingSchema.parse({ ...finding, calculation: '' })).toThrow();
    expect(() =>
      TrendFindingSchema.parse({ ...finding, stats: { ...STATS, direction: 'sideways' } }),
    ).toThrow();
  });

  it('requires at least two protocols and one finding per trends result', () => {
    const result = {
      metric: 'supply_apy',
      asset: 'USDC',
      protocols: ['aave-v3', 'compound-v3'],
      window: '7d',
      summary: 'Aave rose while Compound fell over 7d.',
      findings: [
        {
          severity: 'info',
          protocol: 'aave-v3',
          claim: 'aave-v3 USDC supply_apy rose over 7d.',
          calculation: '4.25 - 3.80 = 0.45 percentage points',
          stats: STATS,
          points: [POINT, { ...POINT, days: 0, value: 3.8 }],
          citations: [CITATION, { ...CITATION, queryHash: 'sha256:other' }],
          confidence: 'high',
          caveats: [],
        },
      ],
      gaps: [],
      asOf: '2026-09-08T00:05:00.000Z',
    };

    expect(AnalyzeTrendsResultSchema.parse(result).window).toBe('7d');

    expect(() => AnalyzeTrendsResultSchema.parse({ ...result, protocols: ['aave-v3'] })).toThrow();
    expect(() => AnalyzeTrendsResultSchema.parse({ ...result, findings: [] })).toThrow();
    expect(() => AnalyzeTrendsResultSchema.parse({ ...result, window: '90d' })).toThrow();
  });
});

describe('market history fixtures', () => {
  const seriesKey = (point: (typeof MARKET_HISTORY_FIXTURES)[number]) =>
    `${point.metric}|${point.protocol}`;

  it('covers USDC supply_apy and utilization across three protocols for seven days', () => {
    expect(MARKET_HISTORY_FIXTURES).toHaveLength(42);
    expect(new Set(MARKET_HISTORY_FIXTURES.map(seriesKey)).size).toBe(6);
    expect(new Set(MARKET_HISTORY_FIXTURES.map((point) => point.days))).toEqual(
      new Set([0, 1, 2, 3, 4, 5, 6]),
    );
    expect(new Set(MARKET_HISTORY_FIXTURES.map((point) => point.protocol))).toEqual(
      new Set(['aave-v3', 'compound-v3', 'spark-lend']),
    );
    expect(new Set(MARKET_HISTORY_FIXTURES.map((point) => point.metric))).toEqual(
      new Set(['supply_apy', 'utilization']),
    );
    expect(
      MARKET_HISTORY_FIXTURES.every((point) => point.asset === 'USDC' && point.unit === 'percent'),
    ).toBe(true);
  });

  it('gives every point a unique query hash, an increasing block, and an increasing day', () => {
    const hashes = MARKET_HISTORY_FIXTURES.map((point) => point.queryHash);
    expect(new Set(hashes).size).toBe(hashes.length);
    expect(hashes.every((hash) => hash.startsWith('sha256:fixture-'))).toBe(true);

    const bySeries = new Map<string, TrendPoint[]>();
    for (const point of MARKET_HISTORY_FIXTURES) {
      const key = seriesKey(point);
      const bucket = bySeries.get(key);
      if (bucket) {
        bucket.push(point);
      } else {
        bySeries.set(key, [point]);
      }
    }

    for (const points of bySeries.values()) {
      const ordered = [...points].sort((a, b) => a.days - b.days);
      expect(ordered).toHaveLength(7);
      expect(ordered.map((point) => point.days)).toEqual([0, 1, 2, 3, 4, 5, 6]);
      for (let index = 1; index < ordered.length; index += 1) {
        expect(ordered[index]!.block!).toBeGreaterThan(ordered[index - 1]!.block!);
        expect(ordered[index]!.timestamp > ordered[index - 1]!.timestamp).toBe(true);
      }
      expect(
        ordered.every(
          (point) =>
            point.subgraphId.length > 0 &&
            point.deploymentId !== undefined &&
            point.block !== undefined &&
            point.timestamp.endsWith('Z'),
        ),
      ).toBe(true);
    }
  });

  it('anchors the newest history point to the spot fixture for the same market', () => {
    for (const point of MARKET_HISTORY_FIXTURES.filter((item) => item.days === 6)) {
      const spot = MARKET_FIXTURES.find(
        (item) =>
          item.metric === point.metric && item.protocol === point.protocol && item.asset === 'USDC',
      );
      expect(spot).toBeDefined();
      expect(point.value).toBe(spot!.value);
      expect(point.timestamp).toBe(spot!.timestamp);
      expect(point.block).toBe(spot!.block);
      expect(point.subgraphId).toBe(spot!.subgraphId);
    }
  });

  it('encodes a readable direction per protocol', () => {
    const latestOf = (metric: string, protocol: string, days: number) =>
      MARKET_HISTORY_FIXTURES.find(
        (point) => point.metric === metric && point.protocol === protocol && point.days === days,
      )!.value;

    // supply_apy: Aave rises, Compound falls, Spark is near-flat.
    expect(latestOf('supply_apy', 'aave-v3', 6)).toBeGreaterThan(
      latestOf('supply_apy', 'aave-v3', 0),
    );
    expect(latestOf('supply_apy', 'compound-v3', 6)).toBeLessThan(
      latestOf('supply_apy', 'compound-v3', 0),
    );
    expect(
      Math.abs(latestOf('supply_apy', 'spark-lend', 6) - latestOf('supply_apy', 'spark-lend', 0)),
    ).toBeLessThan(0.1);

    // utilization: Spark climbs into the watch band over the window.
    expect(latestOf('utilization', 'spark-lend', 6)).toBeGreaterThan(90);
    expect(latestOf('utilization', 'spark-lend', 0)).toBeLessThan(80);
  });
});

const TREND_PROTOCOLS = ['aave-v3', 'compound-v3', 'spark-lend'] as const;

function fixtureSeries(
  metric: 'supply_apy' | 'utilization',
  protocols: readonly string[] = TREND_PROTOCOLS,
): TrendSeries[] {
  return protocols.map((protocol) => {
    const points = MARKET_HISTORY_FIXTURES.filter(
      (point) => point.metric === metric && point.protocol === protocol,
    );
    return { protocol, metric, unit: 'percent' as const, points };
  });
}

function analyzeFixture(
  metric: 'supply_apy' | 'utilization',
  overrides: Partial<Parameters<typeof analyzeTrendSeries>[0]> = {},
) {
  return analyzeTrendSeries({
    metric,
    asset: 'USDC',
    protocols: [...TREND_PROTOCOLS],
    window: '7d',
    series: fixtureSeries(metric),
    gaps: [],
    ...overrides,
  });
}

describe('computeTrendStats', () => {
  it('requires at least two points', () => {
    expect(() =>
      computeTrendStats(
        MARKET_HISTORY_FIXTURES.filter(
          (point) =>
            point.metric === 'supply_apy' && point.protocol === 'aave-v3' && point.days === 6,
        ),
      ),
    ).toThrow(/at least two points/);
  });

  it('summarizes a rising series with a least-squares slope', () => {
    const stats = computeTrendStats(fixtureSeries('supply_apy', ['aave-v3'])[0]!.points);

    expect(stats.earliest).toBe(3.8);
    expect(stats.latest).toBe(4.25);
    expect(stats.min).toBe(3.8);
    expect(stats.max).toBe(4.25);
    expect(stats.change).toBe(0.45);
    expect(stats.changePct).toBeCloseTo(11.842105, 6);
    expect(stats.slopePerDay).toBeCloseTo(0.076429, 6);
    expect(stats.direction).toBe('rising');
    expect(stats.volatility).toBeGreaterThan(0);
    expect(stats.volatility).toBeLessThan(0.05);
    expect(Number.isFinite(stats.volatility)).toBe(true);
  });

  it('summarizes a falling series', () => {
    const stats = computeTrendStats(fixtureSeries('supply_apy', ['compound-v3'])[0]!.points);

    expect(stats.change).toBe(-0.16);
    expect(stats.changePct).toBeCloseTo(-4.848485, 6);
    expect(stats.slopePerDay).toBeLessThan(0);
    expect(stats.direction).toBe('falling');
  });

  it('labels a near-flat series as flat', () => {
    const stats = computeTrendStats(fixtureSeries('supply_apy', ['spark-lend'])[0]!.points);

    expect(stats.direction).toBe('flat');
    expect(Math.abs(stats.changePct)).toBeLessThan(2);
  });

  it('uses the real snapshot day index, not the array position', () => {
    const points = fixtureSeries('supply_apy', ['aave-v3'])[0]!.points;
    const sparse = [points[0]!, points[6]!].map((point, index) => ({
      ...point,
      days: index === 0 ? 0 : 2,
    }));

    // Two points two days apart: slope is the full change split over 2 days,
    // not the change itself.
    expect(computeTrendStats(sparse).slopePerDay).toBeCloseTo(0.225, 6);
  });

  it('reports zero volatility for a constant series', () => {
    const points = fixtureSeries('supply_apy', ['aave-v3'])[0]!.points;
    const constant = points.map((point) => ({ ...point, value: 4.25 }));

    const stats = computeTrendStats(constant);
    expect(stats.volatility).toBe(0);
    expect(stats.change).toBe(0);
    expect(stats.changePct).toBe(0);
    expect(stats.slopePerDay).toBe(0);
    expect(stats.direction).toBe('flat');
  });
});

describe('analyzeTrendSeries', () => {
  it('produces one cited finding per protocol with high confidence on full fixture coverage', () => {
    const result = analyzeFixture('supply_apy');

    expect(result.metric).toBe('supply_apy');
    expect(result.asset).toBe('USDC');
    expect(result.window).toBe('7d');
    expect(result.protocols).toEqual([...TREND_PROTOCOLS]);
    expect(result.findings).toHaveLength(3);
    expect(result.gaps).toEqual([]);
    expect(result.asOf).toBe('2026-09-08T00:05:00.000Z');

    for (const finding of result.findings) {
      expect(finding.points.length).toBeGreaterThanOrEqual(2);
      expect(finding.citations.length).toBeGreaterThanOrEqual(2);
      expect(finding.calculation).toContain('slopePerDay');
      expect(finding.claim.length).toBeGreaterThan(0);
      expect(finding.caveats).toContain(
        'Historical trend is descriptive, not a forecast or financial recommendation.',
      );
      expect(finding.points.map((point) => point.days)).toEqual([0, 1, 2, 3, 4, 5, 6]);
      expect(
        finding.citations.every(
          (citation) =>
            Boolean(citation.subgraphId) &&
            Boolean(citation.timestamp) &&
            Boolean(citation.queryHash) &&
            citation.metric === 'supply_apy',
        ),
      ).toBe(true);
    }

    const aave = result.findings.find((finding) => finding.protocol === 'aave-v3')!;
    expect(aave.stats.direction).toBe('rising');
    expect(aave.severity).toBe('info');
    expect(aave.confidence).toBe('high');
    expect(aave.claim).toContain('rising over 7d');

    const compound = result.findings.find((finding) => finding.protocol === 'compound-v3')!;
    expect(compound.stats.direction).toBe('falling');

    const spark = result.findings.find((finding) => finding.protocol === 'spark-lend')!;
    expect(spark.stats.direction).toBe('flat');

    expect(result.summary).toContain('aave-v3 rising');
    expect(result.summary).toContain('3 cited source(s)');
  });

  it('raises severity when the trend move is large enough to matter', () => {
    const result = analyzeFixture('utilization');
    const spark = result.findings.find((finding) => finding.protocol === 'spark-lend')!;

    expect(spark.stats.changePct).toBeCloseTo(18.589744, 6);
    expect(spark.stats.direction).toBe('rising');
    expect(spark.severity).toBe('watch');
    expect(spark.confidence).toBe('high');
  });

  it('reports a wider window as an explicit gap instead of padding the series', () => {
    const result = analyzeFixture('supply_apy', { window: '30d' });

    expect(result.window).toBe('30d');
    expect(result.findings).toHaveLength(3);
    expect(result.gaps).toHaveLength(3);
    expect(
      result.gaps.every(
        (gap) =>
          gap.metric === 'supply_apy' &&
          gap.reason.includes('Requested 30d window has 7 usable') &&
          gap.reason.includes('available points'),
      ),
    ).toBe(true);
    // Gaps must downgrade confidence away from high.
    expect(result.findings.every((finding) => finding.confidence === 'medium')).toBe(true);
  });

  it('stays at medium confidence when the caller reported gaps', () => {
    const result = analyzeFixture('supply_apy', {
      gaps: [{ metric: 'supply_apy', protocol: 'aave-v2', reason: 'not live' }],
    });

    expect(result.gaps).toHaveLength(1);
    expect(result.gaps[0]!.protocol).toBe('aave-v2');
    expect(result.findings.every((finding) => finding.confidence === 'medium')).toBe(true);
  });

  it('drops to medium confidence when a series has fewer than five points', () => {
    const result = analyzeFixture('supply_apy', {
      series: fixtureSeries('supply_apy').map((series) => ({
        ...series,
        points: series.points.slice(-4),
      })),
    });

    expect(result.findings.every((finding) => finding.points.length === 4)).toBe(true);
    expect(result.findings.every((finding) => finding.confidence === 'medium')).toBe(true);
  });

  it('fails closed when fewer than two cited series survive', () => {
    expect(() =>
      analyzeFixture('supply_apy', {
        protocols: ['aave-v3', 'aave-v2'],
        series: fixtureSeries('supply_apy', ['aave-v3']),
        gaps: [{ metric: 'supply_apy', protocol: 'aave-v2', reason: 'not live' }],
      }),
    ).toThrow(/at least 2 cited trend series.*aave-v2: not live/s);
  });

  it('fails closed when no series survives at all', () => {
    expect(() => analyzeFixture('supply_apy', { series: [], gaps: [] })).toThrow(
      /got 0 from 0 source\(s\).*none reported/s,
    );
  });

  it('rejects series that do not match the requested metric or asset', () => {
    expect(() =>
      analyzeFixture('supply_apy', {
        series: fixtureSeries('utilization'),
      }),
    ).toThrow(/Mixed or unexpected metric/);

    expect(() =>
      analyzeFixture('supply_apy', {
        series: fixtureSeries('supply_apy').map((series) => ({
          ...series,
          points: series.points.map((point) => ({ ...point, asset: 'WETH' })),
        })),
      }),
    ).toThrow(/Mixed or unexpected point/);
  });
});
