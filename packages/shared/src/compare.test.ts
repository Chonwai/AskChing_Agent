import { describe, expect, it } from "vitest";

import { compareObservations } from "./compare.js";

const compound = {
  metric: "supply_apy" as const,
  asset: "USDC" as const,
  rateType: "variable" as const,
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
  metric: "supply_apy" as const,
  asset: "USDC" as const,
  rateType: "variable" as const,
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
    const result = compareObservations([compound, aave], "supply_apy");

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

    expect(() => compareObservations([uncited], "supply_apy")).toThrow(
      /queryHash/
    );
  });

  it("rejects a comparison mixing observations across assets", () => {
    expect(() =>
      compareObservations([compound, { ...aave, asset: "WETH" }], "supply_apy")
    ).toThrow(/same asset/);
  });

  it("propagates the shared asset onto the comparison", () => {
    const result = compareObservations([compound, aave], "supply_apy");
    expect(result.asset).toBe("USDC");
  });

  it("flags utilization as a risk signal rather than a better outcome", () => {
    const utilization = {
      metric: "utilization" as const,
      asset: "USDC" as const,
      value: 78.4,
      unit: "percent" as const,
      protocol: "aave-v3",
      subgraphId: "aave-v3-ethereum",
      deploymentId: "QmAaveFixture",
      block: 21_100_100,
      timestamp: "2026-09-08T00:05:00.000Z",
      queryHash: "sha256:aave-utilization-fixture"
    };
    const utilizationPeer = {
      ...utilization,
      value: 55.0,
      protocol: "compound-v3",
      subgraphId: "compound-v3-ethereum",
      deploymentId: "QmCompoundFixture",
      block: 21_100_000,
      timestamp: "2026-09-08T00:00:00.000Z",
      queryHash: "sha256:compound-utilization-fixture"
    };

    const result = compareObservations(
      [utilization, utilizationPeer],
      "utilization"
    );

    // Highest utilization ranks first, but the caveat reframes it as risk.
    expect(result.rows.map((row) => row.protocol)).toEqual([
      "aave-v3",
      "compound-v3"
    ]);
    expect(result.caveats.some((caveat) => caveat.includes("risk signal"))).toBe(
      true
    );
    expect(
      result.caveats.some((caveat) => caveat.includes("Utilization is ranked"))
    ).toBe(true);
  });
});
