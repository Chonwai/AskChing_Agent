import type { MarketMetricId, Unit } from "./schemas.js";

export type RateSide = "LENDER" | "BORROWER";
export type RateTypeFilter = "VARIABLE" | "STABLE" | "FIXED";

export interface MetricDescriptor {
  id: MarketMetricId;
  label: string;
  unit: Unit;
  /** 僅 apy 類 metric 有 rate 過濾條件 */
  rateSide?: RateSide;
  rateType?: RateTypeFilter;
  /** 用於 graph-client 選擇提取欄位 */
  extractor: "rates" | "tvl" | "utilization";
  description: string;
}

export const METRIC_REGISTRY: Record<MarketMetricId, MetricDescriptor> = {
  supply_apy: {
    id: "supply_apy",
    label: "Supply APY",
    unit: "percent",
    rateSide: "LENDER",
    rateType: "VARIABLE",
    extractor: "rates",
    description: "Variable supply APY for the given asset (best market rate)"
  },
  borrow_apy: {
    id: "borrow_apy",
    label: "Borrow APY",
    unit: "percent",
    rateSide: "BORROWER",
    rateType: "VARIABLE",
    extractor: "rates",
    description: "Variable borrow APY for the given asset (best market rate)"
  },
  tvl: {
    id: "tvl",
    label: "Total Value Locked",
    unit: "usd",
    extractor: "tvl",
    description: "Total value locked (USD) for the given asset market"
  },
  utilization: {
    id: "utilization",
    label: "Utilization Rate",
    unit: "percent",
    extractor: "utilization",
    description: "Borrow / deposit utilization ratio for the given asset market"
  }
} as const;

// ── Legacy alias（D2）───────────────────────────────────────────────
export const LEGACY_METRIC_ALIASES: Record<
  string,
  { metricId: MarketMetricId; asset: string }
> = {
  usdc_supply_apy: { metricId: "supply_apy", asset: "USDC" }
} as const;

export function resolveMetricId(
  raw: string
): { metricId: MarketMetricId; assetHint?: string } {
  const lower = raw.toLowerCase();
  if (lower in LEGACY_METRIC_ALIASES) {
    const aliased = LEGACY_METRIC_ALIASES[lower]!;
    return { metricId: aliased.metricId, assetHint: aliased.asset };
  }
  if (raw in METRIC_REGISTRY) {
    return { metricId: raw as MarketMetricId };
  }
  throw new Error(
    `Unknown metric: ${raw}. Supported: ${Object.keys(METRIC_REGISTRY).join(
      ", "
    )} (legacy: ${Object.keys(LEGACY_METRIC_ALIASES).join(", ")})`
  );
}

export function getMetricDescriptor(metricId: MarketMetricId): MetricDescriptor {
  const desc = METRIC_REGISTRY[metricId];
  if (!desc) throw new Error(`Unknown metric id: ${metricId}`);
  return desc;
}
