import { describe, expect, it } from "vitest";

import { compareObservations } from "./compare.js";

const compound = {
  metric: "usdc_supply_apy" as const,
  value: 3.14,
  unit: "percent" as const,
  protocol: "compound-v3",
  subgraphId: "compound-v3-ethereum",
  deploymentId: "QmCompoundFixture",
  block: 21_100_000,
  timestamp: "2026-09-08T00:00:00.000Z",
  queryHash: "sha256:compound-fixture"
};

const aave = {
  metric: "usdc_supply_apy" as const,
  value: 4.25,
  unit: "percent" as const,
  protocol: "aave-v3",
  subgraphId: "aave-v3-ethereum",
  deploymentId: "QmAaveFixture",
  block: 21_100_100,
  timestamp: "2026-09-08T00:05:00.000Z",
  queryHash: "sha256:aave-fixture"
};

describe("compareObservations", () => {
  it("ranks comparable observations and exposes distinct cited sources with an as-of time", () => {
    const result = compareObservations([compound, aave], "usdc_supply_apy");

    expect(result.rows.map((row) => row.protocol)).toEqual([
      "aave-v3",
      "compound-v3"
    ]);
    expect(result.rows.map((row) => row.rank)).toEqual([1, 2]);
    expect(result.sources.map((source) => source.subgraphId)).toEqual([
      "aave-v3-ethereum",
      "compound-v3-ethereum"
    ]);
    expect(result.asOf).toBe("2026-09-08T00:05:00.000Z");
  });

  it("rejects an observation whose citation is missing a query hash", () => {
    const { queryHash: _queryHash, ...uncited } = compound;

    expect(() =>
      compareObservations([uncited], "usdc_supply_apy")
    ).toThrow(/queryHash/);
  });
});
