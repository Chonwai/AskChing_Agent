import {
  compareObservations,
  ComparisonSourceSchema,
  type Comparison,
  type MarketDataSource,
  ProtocolSchema
} from "@askching/shared";
import { z } from "zod";

export const CompareMarketsInputSchema = z.object({
  metric: z.literal("usdc_supply_apy"),
  protocols: z.array(ProtocolSchema).min(2),
  timeframe: z.string().min(1).optional()
});

export const ResearchBriefInputSchema = z.object({
  question: z.string().min(1),
  protocols: z.array(ProtocolSchema).optional()
});

export const RiskScanInputSchema = z.object({
  protocols: z.array(ProtocolSchema).min(1),
  assets: z.array(z.string().min(1)).optional(),
  window: z.string().min(1)
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

export interface ResearchBrief {
  conclusion: string;
  keyFigures: Array<{
    protocol: string;
    metric: string;
    value: number;
    unit: string;
    source: string;
  }>;
  asOf: string;
  risks: string[];
  suggestedFollowUp?: string;
}

export interface ResearchBriefResult {
  brief: ResearchBrief;
  sources: Comparison["sources"];
  caveats: string[];
}

export const ResearchBriefResultSchema = z.object({
  brief: z.object({
    conclusion: z.string().min(1),
    keyFigures: z
      .array(
        z.object({
          protocol: z.string(),
          metric: z.string(),
          value: z.number().finite(),
          unit: z.string(),
          source: z.string()
        })
      )
      .min(2),
    asOf: z.string().datetime(),
    risks: z.array(z.string()),
    suggestedFollowUp: z.string().optional()
  }),
  sources: z.array(ComparisonSourceSchema),
  caveats: z.array(z.string())
});

export async function researchBrief(
  rawInput: unknown,
  dataSource: MarketDataSource
): Promise<ResearchBriefResult> {
  const input = ResearchBriefInputSchema.parse(rawInput);
  if (!input.protocols || input.protocols.length < 2) {
    throw new Error(
      "research_brief requires at least two protocols for a cited comparison"
    );
  }
  const metrics = ["usdc_supply_apy"] as const;
  const metric = metrics[0]!;
  const comparison = await compareMarkets(
    { metric, protocols: input.protocols },
    dataSource
  );

  const best = comparison.rows[0]!;
  const second = comparison.rows[1]!;
  const conclusion = `${best.protocol} leads ${second.protocol} on ${metric} (${best.value}% vs ${second.value}%) as of ${comparison.asOf}.`;
  const risks =
    comparison.caveats.length > 0
      ? comparison.caveats
      : ["APY definitions may differ between protocols"];

  return {
    brief: {
      conclusion,
      keyFigures: comparison.rows.map((row) => ({
        protocol: row.protocol,
        metric,
        value: row.value,
        unit: row.unit,
        source: row.subgraphId
      })),
      asOf: comparison.asOf,
      risks,
      suggestedFollowUp: "Check if these rates have changed in the last 24 hours"
    },
    sources: comparison.sources,
    caveats: comparison.caveats
  };
}
