import {
  ComparisonSchema,
  ComparisonSourceSchema,
  MarketMetricIdSchema,
  MarketObservationSchema,
  type Comparison,
  type MarketMetricId
} from "./schemas.js";

export function compareObservations(
  observations: readonly unknown[],
  requestedMetric: MarketMetricId
): Comparison {
  const metric = MarketMetricIdSchema.parse(requestedMetric);
  const parsed = observations.map((observation) =>
    MarketObservationSchema.parse(observation)
  );

  if (parsed.length < 2) {
    throw new Error("compare_markets requires at least two cited observations");
  }

  if (parsed.some((observation) => observation.metric !== metric)) {
    throw new Error(`All observations must use the requested metric: ${metric}`);
  }

  // Cross-asset guard: all observations must share the same asset
  const assets = new Set(parsed.map((observation) => observation.asset));
  if (assets.size > 1) {
    throw new Error(
      `All observations must share the same asset. Found: ${[...assets].join(", ")}`
    );
  }
  const asset = [...assets][0]!;

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
  const caveats: string[] = [];
  if (new Set(timestamps).size > 1) {
    caveats.push("Source observations were recorded at different timestamps.");
  }
  if (metric === "tvl") {
    caveats.push(
      "TVL reflects the largest market for this asset, not total protocol TVL."
    );
  }

  return ComparisonSchema.parse({
    metric,
    asset,
    asOf,
    rows,
    caveats,
    sources: rows.map((row) => ComparisonSourceSchema.parse(row))
  });
}
