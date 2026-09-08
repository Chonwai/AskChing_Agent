import {
  ComparisonSchema,
  MarketMetricSchema,
  MarketObservationSchema,
  type Comparison,
  type MarketMetric
} from "./schemas.js";

export function compareObservations(
  observations: readonly unknown[],
  requestedMetric: MarketMetric
): Comparison {
  const metric = MarketMetricSchema.parse(requestedMetric);
  const parsed = observations.map((observation) =>
    MarketObservationSchema.parse(observation)
  );

  if (parsed.length < 2) {
    throw new Error("compare_markets requires at least two cited observations");
  }

  if (parsed.some((observation) => observation.metric !== metric)) {
    throw new Error(`All observations must use the requested metric: ${metric}`);
  }

  const rows = [...parsed]
    .sort((left, right) => right.value - left.value)
    .map((observation, index) => ({ ...observation, rank: index + 1 }));

  const distinctSources = new Set(rows.map((row) => row.subgraphId));
  if (distinctSources.size < 2) {
    throw new Error("compare_markets requires at least two distinct subgraph sources");
  }

  const timestamps = rows.map((row) => row.timestamp);
  const asOf = timestamps.reduce((latest, current) =>
    current > latest ? current : latest
  );
  const caveats =
    new Set(timestamps).size > 1
      ? ["Source observations were recorded at different timestamps."]
      : [];

  return ComparisonSchema.parse({
    metric,
    asOf,
    rows,
    caveats,
    sources: rows.map(
      ({
        protocol,
        subgraphId,
        deploymentId,
        block,
        timestamp,
        queryHash
      }) => ({
        protocol,
        subgraphId,
        deploymentId,
        block,
        timestamp,
        queryHash
      })
    )
  });
}

