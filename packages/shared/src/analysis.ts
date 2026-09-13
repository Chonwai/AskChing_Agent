import {
  AnalyzeMarketsResultSchema,
  AnalyzeTrendsResultSchema,
  MarketObservationSchema,
  TREND_WINDOW_DAYS,
  TrendSeriesSchema,
  type AnalysisCitation,
  type AnalysisConfidence,
  type AnalysisGap,
  type AnalysisObjective,
  type AnalysisSeverity,
  type AnalyzeMarketsResult,
  type AnalyzeTrendsResult,
  type AssetSymbol,
  type MarketMetricId,
  type MarketObservation,
  type TrendDirection,
  type TrendPoint,
  type TrendSeries,
  type TrendStats,
  type TrendWindow,
  type Unit,
} from './schemas.js';

export interface AnalyzeObservationInput {
  objective: AnalysisObjective;
  asset: AssetSymbol;
  protocols: string[];
  metrics: MarketMetricId[];
  observations: MarketObservation[];
  gaps: AnalysisGap[];
  timeframe?: string;
}

export function analyzeMarketObservations(input: AnalyzeObservationInput): AnalyzeMarketsResult {
  const observations = input.observations.map((item) => MarketObservationSchema.parse(item));
  for (const item of observations) {
    if (
      item.asset !== input.asset ||
      !input.protocols.includes(item.protocol) ||
      !input.metrics.includes(item.metric)
    ) {
      throw new Error('Mixed or unexpected observation in analysis input');
    }
  }

  if (input.objective === 'liquidity_stress') {
    return analyzeLiquidityStress(input, observations);
  }
  if (input.objective === 'evidence_quality') {
    return analyzeEvidenceQuality(input, observations);
  }

  const supply = comparable(
    observations.filter((item) => item.metric === 'supply_apy'),
    'supply_apy',
  );
  const ranked = [...supply].sort(
    (a, b) => b.value - a.value || a.protocol.localeCompare(b.protocol),
  );
  const leader = ranked[0]!;
  const runnerUp = ranked[1]!;
  const spread = leader.value - runnerUp.value;
  const utilization = observations.find(
    (item) => item.metric === 'utilization' && item.protocol === leader.protocol,
  );
  const supportingValues = utilization ? [...ranked, utilization] : ranked;
  const citations = dedupeCitations(supportingValues);
  const latest = latestTimestamp(supportingValues);
  const confidence = determineConfidence(ranked, input.gaps);
  const result: AnalyzeMarketsResult = {
    objective: input.objective,
    asset: input.asset,
    protocols: input.protocols,
    metrics: input.metrics,
    summary: `${leader.protocol} has the highest current ${input.asset} supply APY among the analyzed peers.`,
    findings: [
      {
        severity: 'info',
        claim: `${leader.protocol} leads current ${input.asset} supply APY at ${leader.value}%, ahead of ${runnerUp.protocol} at ${runnerUp.value}%.`,
        calculation: `${leader.value} - ${runnerUp.value} = ${spread.toFixed(2)} percentage points`,
        supportingValues,
        citations,
        confidence,
        caveats: [
          'Spot APY is not a forecast or financial recommendation.',
          ...(utilization
            ? [`Leader utilization context: ${utilization.value}%.`]
            : ['No comparable utilization context was available for the leader.']),
        ],
      },
    ],
    gaps: withTimeframeGap(input),
    asOf: latest,
  };
  return AnalyzeMarketsResultSchema.parse(result);
}

function analyzeLiquidityStress(
  input: AnalyzeObservationInput,
  observations: MarketObservation[],
): AnalyzeMarketsResult {
  const utilization = comparable(
    observations.filter((item) => item.metric === 'utilization'),
    'utilization',
  ).sort((a, b) => b.value - a.value || a.protocol.localeCompare(b.protocol));
  const context = observations.filter((item) => item.metric === 'tvl');
  const confidence = determineConfidence(utilization, input.gaps);
  const findings = utilization.map((item, index) => {
    const severity =
      item.value > 90
        ? ('high' as const)
        : item.value >= 80
          ? ('watch' as const)
          : ('info' as const);
    const band =
      severity === 'high'
        ? 'above the 90% high threshold'
        : severity === 'watch'
          ? 'within the 80–90% watch band'
          : 'below the 80% watch threshold';
    const tvl = context.find((value) => value.protocol === item.protocol);
    const supportingValues = tvl ? [item, tvl] : [item];
    return {
      severity,
      claim: `${item.protocol} is rank ${index + 1} of ${utilization.length} by current ${input.asset} utilization at ${item.value}%.`,
      calculation: `${item.value}% utilization; rank ${index + 1} of ${utilization.length}; ${band}`,
      supportingValues,
      citations: dedupeCitations([...utilization, ...(tvl ? [tvl] : [])]),
      confidence,
      caveats: [
        'Utilization is a spot heuristic signal, not a liquidation or solvency assessment.',
        ...(tvl ? [`TVL of ${tvl.value} USD is scale context, not available liquidity.`] : []),
      ],
    };
  });
  return AnalyzeMarketsResultSchema.parse({
    objective: input.objective,
    asset: input.asset,
    protocols: input.protocols,
    metrics: input.metrics,
    summary: `${utilization[0]!.protocol} has the highest current ${input.asset} utilization among the analyzed peers.`,
    findings,
    gaps: withTimeframeGap(input),
    asOf: latestTimestamp([...utilization, ...context]),
  });
}

function analyzeEvidenceQuality(
  input: AnalyzeObservationInput,
  observations: MarketObservation[],
): AnalyzeMarketsResult {
  const citations = dedupeCitations(observations);
  const sourceCount = new Set(observations.map((item) => item.subgraphId)).size;
  if (sourceCount < 2) {
    throw new Error('Need at least 2 cited sources for evidence_quality');
  }
  const expected = input.protocols.length * input.metrics.length;
  const covered = new Set(observations.map((item) => `${item.protocol}|${item.metric}`)).size;
  const timestamps = observations.map((item) => Date.parse(item.timestamp));
  const skewMs = Math.max(...timestamps) - Math.min(...timestamps);
  const confidence: AnalysisConfidence =
    sourceCount >= 3 && input.gaps.length === 0 && skewMs <= 10 * 60 * 1000
      ? 'high'
      : covered / expected < 0.5
        ? 'low'
        : 'medium';
  return AnalyzeMarketsResultSchema.parse({
    objective: input.objective,
    asset: input.asset,
    protocols: input.protocols,
    metrics: input.metrics,
    summary: `${covered} of ${expected} requested protocol-metric observations are supported by ${sourceCount} cited sources.`,
    findings: [
      {
        severity: confidence === 'low' ? 'watch' : 'info',
        claim: `Evidence coverage is ${covered}/${expected} across ${sourceCount} distinct cited sources.`,
        calculation: `${covered}/${expected} protocol-metric observations; ${sourceCount} distinct sources; ${Math.round(skewMs / 1000)} seconds timestamp skew`,
        supportingValues: observations,
        citations,
        confidence,
        caveats: ['Evidence quality describes coverage and recency, not protocol safety.'],
      },
    ],
    gaps: withTimeframeGap(input),
    asOf: latestTimestamp(observations),
  });
}

function comparable(
  observations: MarketObservation[],
  metric: MarketMetricId,
): MarketObservation[] {
  const valid = observations.filter((item) => item.metric === metric);
  const sources = new Set(valid.map((item) => item.subgraphId));
  if (valid.length < 2 || sources.size < 2) {
    throw new Error(`Need at least 2 cited sources for ${metric}`);
  }
  const first = valid[0]!;
  if (
    valid.some(
      (item) =>
        item.asset !== first.asset || item.unit !== first.unit || item.rateType !== first.rateType,
    )
  ) {
    throw new Error(`Cannot compare mixed definitions for ${metric}`);
  }
  return valid;
}

function dedupeCitations(values: MarketObservation[]): AnalysisCitation[] {
  const seen = new Set<string>();
  return values.flatMap((item) => {
    const key = [
      item.metric,
      item.protocol,
      item.asset,
      item.subgraphId,
      item.timestamp,
      item.queryHash,
    ].join('|');
    if (seen.has(key)) return [];
    seen.add(key);
    return [
      {
        metric: item.metric,
        protocol: item.protocol,
        asset: item.asset,
        subgraphId: item.subgraphId,
        deploymentId: item.deploymentId,
        block: item.block,
        timestamp: item.timestamp,
        queryHash: item.queryHash,
      },
    ];
  });
}

function latestTimestamp(values: MarketObservation[]): string {
  return values.reduce(
    (latest, item) => (item.timestamp > latest ? item.timestamp : latest),
    values[0]!.timestamp,
  );
}

function determineConfidence(values: MarketObservation[], gaps: AnalysisGap[]): AnalysisConfidence {
  const timestamps = values.map((item) => Date.parse(item.timestamp));
  const skew = Math.max(...timestamps) - Math.min(...timestamps);
  return new Set(values.map((item) => item.subgraphId)).size >= 3 &&
    gaps.length === 0 &&
    skew <= 10 * 60 * 1000
    ? 'high'
    : 'medium';
}

function withTimeframeGap(input: AnalyzeObservationInput): AnalysisGap[] {
  return input.timeframe
    ? [
        ...input.gaps,
        {
          reason: `Requested timeframe '${input.timeframe}' was not applied; analysis is spot-only.`,
        },
      ]
    : [...input.gaps];
}

// ── Trend analysis (v1.1) ─────────────────────────────────────────
export interface AnalyzeTrendInput {
  metric: MarketMetricId;
  asset: AssetSymbol;
  /** Requested protocols; findings are only emitted for series that survived. */
  protocols: string[];
  window: TrendWindow;
  series: TrendSeries[];
  gaps: AnalysisGap[];
}

const TREND_CAVEAT = 'Historical trend is descriptive, not a forecast or financial recommendation.';
/** Relative slope band that still counts as "flat" — 0.5% of the series mean. */
const FLAT_SLOPE_RATIO = 0.005;

/**
 * Compute the descriptive statistics that back a trend finding.
 *
 * All of these are summaries of the cited points themselves; nothing here
 * extrapolates or predicts.
 */
export function computeTrendStats(points: readonly TrendPoint[]): TrendStats {
  if (points.length < 2) {
    throw new Error('Trend statistics require at least two points');
  }
  const ordered = [...points].sort((a, b) => a.days - b.days);
  const values = ordered.map((point) => point.value);
  const earliest = values[0]!;
  const latest = values[values.length - 1]!;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;

  // Least-squares slope against the real snapshot day index, so a series with
  // missing days is not distorted by treating gaps as adjacent points.
  const meanDays = ordered.reduce((sum, point) => sum + point.days, 0) / ordered.length;
  let covariance = 0;
  let dayVariance = 0;
  ordered.forEach((point, index) => {
    const dayDelta = point.days - meanDays;
    covariance += dayDelta * (values[index]! - mean);
    dayVariance += dayDelta * dayDelta;
  });
  const slopePerDay = dayVariance === 0 ? 0 : covariance / dayVariance;

  const flatBand = Math.abs(mean) * FLAT_SLOPE_RATIO;
  const direction: TrendDirection =
    Math.abs(slopePerDay) <= flatBand ? 'flat' : slopePerDay > 0 ? 'rising' : 'falling';

  const deltas = values.slice(1).map((value, index) => value - values[index]!);

  return {
    latest,
    earliest,
    min: Math.min(...values),
    max: Math.max(...values),
    change: roundStatistic(latest - earliest),
    changePct: earliest === 0 ? 0 : roundStatistic(((latest - earliest) / earliest) * 100),
    slopePerDay: roundStatistic(slopePerDay),
    direction,
    volatility: roundStatistic(standardDeviation(deltas)),
  };
}

export function analyzeTrendSeries(input: AnalyzeTrendInput): AnalyzeTrendsResult {
  const series = input.series.map((item) => TrendSeriesSchema.parse(item));
  for (const item of series) {
    if (item.metric !== input.metric) {
      throw new Error('Mixed or unexpected metric in trend input');
    }
    for (const point of item.points) {
      if (
        point.metric !== item.metric ||
        point.asset !== input.asset ||
        point.protocol !== item.protocol ||
        point.unit !== item.unit
      ) {
        throw new Error('Mixed or unexpected point in trend input');
      }
    }
  }

  const usable = series.filter((item) => item.points.length >= 2);
  const sources = new Set(usable.flatMap((item) => item.points.map((point) => point.subgraphId)));
  if (usable.length < 2 || sources.size < 2) {
    throw new Error(
      `Need at least 2 cited trend series for analysis; got ${usable.length} from ${sources.size} source(s). Gaps: ${formatGaps(input.gaps)}`,
    );
  }

  // A window wider than the available snapshots is reported, never padded.
  const windowDays = TREND_WINDOW_DAYS[input.window];
  const gaps: AnalysisGap[] = [...input.gaps];
  for (const item of usable) {
    if (item.points.length < windowDays) {
      gaps.push({
        metric: input.metric,
        protocol: item.protocol,
        reason: `Requested ${input.window} window has ${item.points.length} usable ${input.asset} ${input.metric} snapshot(s) for ${item.protocol}; the trend is computed from the available points.`,
      });
    }
  }

  const confidence: AnalysisConfidence =
    sources.size >= 3 && gaps.length === 0 && usable.every((item) => item.points.length >= 5)
      ? 'high'
      : 'medium';

  const findings = usable.map((item) => {
    const points = [...item.points].sort((a, b) => a.days - b.days);
    const stats = computeTrendStats(points);
    const citations = dedupeCitations(points);
    if (citations.length < 2) {
      throw new Error(`Trend for ${item.protocol} has fewer than 2 distinct cited points`);
    }
    const firstDay = points[0]!.days;
    const lastDay = points[points.length - 1]!.days;
    const suffix = unitSuffix(item.unit);
    return {
      severity: trendSeverity(stats.changePct),
      protocol: item.protocol,
      claim: `${item.protocol} ${input.asset} ${input.metric} is ${stats.direction} over ${input.window}: ${stats.earliest}${suffix} to ${stats.latest}${suffix} (${formatSigned(stats.changePct)}%).`,
      calculation: `change = ${stats.latest} - ${stats.earliest} = ${stats.change}; changePct = ${stats.changePct}%; slopePerDay = ${stats.slopePerDay} (least squares over ${points.length} points on snapshot days ${firstDay}-${lastDay}); direction = ${stats.direction}; volatility = ${stats.volatility}; min = ${stats.min}; max = ${stats.max}`,
      stats,
      points,
      citations,
      confidence,
      caveats: [
        TREND_CAVEAT,
        `Trend computed from ${points.length} cited daily snapshot(s) spanning snapshot days ${firstDay}-${lastDay}.`,
      ],
    };
  });

  const latest = usable.reduce(
    (current, item) =>
      item.points.reduce(
        (inner, point) => (point.timestamp > inner ? point.timestamp : inner),
        current,
      ),
    usable[0]!.points[0]!.timestamp,
  );

  return AnalyzeTrendsResultSchema.parse({
    metric: input.metric,
    asset: input.asset,
    protocols: input.protocols,
    window: input.window,
    summary: `${input.asset} ${input.metric} over ${input.window}: ${findings
      .map(
        (finding) =>
          `${finding.protocol} ${finding.stats.direction} (${formatSigned(finding.stats.changePct)}%)`,
      )
      .join(', ')} across ${sources.size} cited source(s).`,
    findings,
    gaps,
    asOf: latest,
  });
}

/** Population standard deviation; returns 0 for an empty or single sample. */
function standardDeviation(values: readonly number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

/**
 * Derived statistics are rounded so float artifacts never leak into an MCP
 * response. Citation-backed values (latest/earliest/min/max) stay exact.
 */
function roundStatistic(value: number): number {
  return Number(value.toFixed(6));
}

function trendSeverity(changePct: number): AnalysisSeverity {
  const magnitude = Math.abs(changePct);
  return magnitude >= 30 ? 'high' : magnitude >= 15 ? 'watch' : 'info';
}

function unitSuffix(unit: Unit): string {
  return unit === 'usd' ? ' USD' : '%';
}

function formatSigned(value: number): string {
  return value >= 0 ? `+${value}` : `${value}`;
}

function formatGaps(gaps: AnalysisGap[]): string {
  return gaps.length === 0
    ? 'none reported'
    : gaps.map((gap) => `${gap.protocol ?? 'unknown'}: ${gap.reason}`).join('; ');
}
