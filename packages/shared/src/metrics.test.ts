import { describe, expect, it } from "vitest";

import {
  LEGACY_METRIC_ALIASES,
  METRIC_REGISTRY,
  getMetricDescriptor,
  resolveMetricId
} from "./metrics.js";

describe("resolveMetricId", () => {
  it("resolves every generalized metric id", () => {
    expect(resolveMetricId("supply_apy")).toEqual({ metricId: "supply_apy" });
    expect(resolveMetricId("borrow_apy")).toEqual({ metricId: "borrow_apy" });
    expect(resolveMetricId("tvl")).toEqual({ metricId: "tvl" });
    expect(resolveMetricId("utilization")).toEqual({ metricId: "utilization" });
  });

  it("maps the legacy usdc_supply_apy alias to supply_apy with a USDC asset hint", () => {
    expect(resolveMetricId("usdc_supply_apy")).toEqual({
      metricId: "supply_apy",
      assetHint: "USDC"
    });
  });

  it("is case-insensitive for the legacy alias", () => {
    expect(resolveMetricId("USDC_SUPPLY_APY")).toEqual({
      metricId: "supply_apy",
      assetHint: "USDC"
    });
  });

  it("throws on an unknown metric and lists the supported ids", () => {
    expect(() => resolveMetricId("borrow_tvl")).toThrow(/Unknown metric: borrow_tvl/);
    expect(() => resolveMetricId("borrow_tvl")).toThrow(/supply_apy/);
    expect(() => resolveMetricId("borrow_tvl")).toThrow(/usdc_supply_apy/);
  });
});

describe("METRIC_REGISTRY", () => {
  it("defines exactly the four generalized metrics with correct units", () => {
    expect(Object.keys(METRIC_REGISTRY)).toEqual([
      "supply_apy",
      "borrow_apy",
      "tvl",
      "utilization"
    ]);
    expect(METRIC_REGISTRY.supply_apy.unit).toBe("percent");
    expect(METRIC_REGISTRY.borrow_apy.unit).toBe("percent");
    expect(METRIC_REGISTRY.tvl.unit).toBe("usd");
    expect(METRIC_REGISTRY.utilization.unit).toBe("percent");
  });

  it("only describes rate sides for the APY metrics", () => {
    expect(METRIC_REGISTRY.supply_apy.rateSide).toBe("LENDER");
    expect(METRIC_REGISTRY.borrow_apy.rateSide).toBe("BORROWER");
    expect(METRIC_REGISTRY.tvl.rateSide).toBeUndefined();
    expect(METRIC_REGISTRY.utilization.rateSide).toBeUndefined();
  });

  it("exposes one extractor per metric", () => {
    expect(METRIC_REGISTRY.supply_apy.extractor).toBe("rates");
    expect(METRIC_REGISTRY.borrow_apy.extractor).toBe("rates");
    expect(METRIC_REGISTRY.tvl.extractor).toBe("tvl");
    expect(METRIC_REGISTRY.utilization.extractor).toBe("utilization");
  });

  it("registers the legacy alias pointing at supply_apy + USDC", () => {
    expect(LEGACY_METRIC_ALIASES.usdc_supply_apy).toEqual({
      metricId: "supply_apy",
      asset: "USDC"
    });
  });
});

describe("getMetricDescriptor", () => {
  it("returns the descriptor for a known metric", () => {
    expect(getMetricDescriptor("tvl").label).toBe("Total Value Locked");
  });

  it("throws for an unknown metric id", () => {
    expect(() =>
      getMetricDescriptor("usdc_supply_apy" as never)
    ).toThrow(/Unknown metric id/);
  });
});