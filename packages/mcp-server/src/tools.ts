import {
  compareObservations,
  type Comparison,
  type MarketDataSource
} from "@askching/shared";
import { z } from "zod";

export const CompareMarketsInputSchema = z.object({
  metric: z.literal("usdc_supply_apy"),
  protocols: z.array(z.enum(["aave-v3", "compound-v3"])).min(2),
  timeframe: z.string().min(1).optional()
});

export async function compareMarkets(
  rawInput: unknown,
  dataSource: MarketDataSource
): Promise<Comparison> {
  const input = CompareMarketsInputSchema.parse(rawInput);
  const observations = await dataSource.getObservations(
    input.metric,
    input.protocols
  );
  const comparison = compareObservations(observations, input.metric);

  if (!input.timeframe) {
    return comparison;
  }

  return {
    ...comparison,
    caveats: [
      ...comparison.caveats,
      `The bootstrap metric is a current spot value; timeframe '${input.timeframe}' was not applied.`
    ]
  };
}

