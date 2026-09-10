import {
  AnalyzeMarketsResultSchema,
  MarketObservationSchema,
  type AnalysisCitation,
  type AnalysisConfidence,
  type AnalysisGap,
  type AnalysisObjective,
  type AnalyzeMarketsResult,
  type AssetSymbol,
  type MarketMetricId,
  type MarketObservation
} from "./schemas.js";

export interface AnalyzeObservationInput {
  objective: AnalysisObjective;
  asset: AssetSymbol;
  protocols: string[];
  metrics: MarketMetricId[];
  observations: MarketObservation[];
  gaps: AnalysisGap[];
  timeframe?: string;
}

export function analyzeMarketObservations(
  input: AnalyzeObservationInput
): AnalyzeMarketsResult {
  const observations = input.observations.map(item => MarketObservationSchema.parse(item));
  for (const item of observations) {
    if (
      item.asset !== input.asset ||
      !input.protocols.includes(item.protocol) ||
      !input.metrics.includes(item.metric)
    ) {
      throw new Error("Mixed or unexpected observation in analysis input");
    }
  }

  if (input.objective !== "yield_opportunity") {
    throw new Error(`Analysis objective not implemented: ${input.objective}`);
  }

  const supply = comparable(
    observations.filter(item => item.metric === "supply_apy"),
    "supply_apy"
  );
  const ranked = [...supply].sort(
    (a, b) => b.value - a.value || a.protocol.localeCompare(b.protocol)
  );
  const leader = ranked[0]!;
  const runnerUp = ranked[1]!;
  const spread = leader.value - runnerUp.value;
  const utilization = observations.find(
    item => item.metric === "utilization" && item.protocol === leader.protocol
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
        severity: "info",
        claim: `${leader.protocol} leads current ${input.asset} supply APY at ${leader.value}%, ahead of ${runnerUp.protocol} at ${runnerUp.value}%.`,
        calculation: `${leader.value} - ${runnerUp.value} = ${spread.toFixed(2)} percentage points`,
        supportingValues,
        citations,
        confidence,
        caveats: [
          "Spot APY is not a forecast or financial recommendation.",
          ...(utilization
            ? [`Leader utilization context: ${utilization.value}%.`]
            : ["No comparable utilization context was available for the leader."])
        ]
      }
    ],
    gaps: withTimeframeGap(input),
    asOf: latest
  };
  return AnalyzeMarketsResultSchema.parse(result);
}

function comparable(
  observations: MarketObservation[],
  metric: MarketMetricId
): MarketObservation[] {
  const valid = observations.filter(item => item.metric === metric);
  const sources = new Set(valid.map(item => item.subgraphId));
  if (valid.length < 2 || sources.size < 2) {
    throw new Error(`Need at least 2 cited sources for ${metric}`);
  }
  const first = valid[0]!;
  if (
    valid.some(
      item =>
        item.asset !== first.asset ||
        item.unit !== first.unit ||
        item.rateType !== first.rateType
    )
  ) {
    throw new Error(`Cannot compare mixed definitions for ${metric}`);
  }
  return valid;
}

function dedupeCitations(values: MarketObservation[]): AnalysisCitation[] {
  const seen = new Set<string>();
  return values.flatMap(item => {
    const key = [item.metric, item.protocol, item.asset, item.subgraphId, item.timestamp, item.queryHash].join("|");
    if (seen.has(key)) return [];
    seen.add(key);
    return [{
      metric: item.metric,
      protocol: item.protocol,
      asset: item.asset,
      subgraphId: item.subgraphId,
      deploymentId: item.deploymentId,
      block: item.block,
      timestamp: item.timestamp,
      queryHash: item.queryHash
    }];
  });
}

function latestTimestamp(values: MarketObservation[]): string {
  return values.reduce(
    (latest, item) => item.timestamp > latest ? item.timestamp : latest,
    values[0]!.timestamp
  );
}

function determineConfidence(
  values: MarketObservation[],
  gaps: AnalysisGap[]
): AnalysisConfidence {
  const timestamps = values.map(item => Date.parse(item.timestamp));
  const skew = Math.max(...timestamps) - Math.min(...timestamps);
  return new Set(values.map(item => item.subgraphId)).size >= 3 &&
    gaps.length === 0 &&
    skew <= 10 * 60 * 1000
    ? "high"
    : "medium";
}

function withTimeframeGap(input: AnalyzeObservationInput): AnalysisGap[] {
  return input.timeframe
    ? [
        ...input.gaps,
        {
          reason: `Requested timeframe '${input.timeframe}' was not applied; analysis is spot-only.`
        }
      ]
    : [...input.gaps];
}
