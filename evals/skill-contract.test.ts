import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

const skillUrl = new URL("../skills/askching/SKILL.md", import.meta.url);

describe("AskChing skill", () => {
  it("is a thin tool playbook rather than a hidden compare engine", async () => {
    const skill = await readFile(skillUrl, "utf8");

    expect(skill.split("\n").length).toBeLessThan(150);
    expect(skill).toContain("compare_markets");
    expect(skill).toContain("research_brief");
    expect(skill).toContain("risk_scan");
    expect(skill).toContain("analyze_markets");
    expect(skill).toContain("analyze_trends");
    expect(skill).toContain("discover_yields");
    expect(skill).toContain("yield_opportunity");
    expect(skill).toContain("liquidity_stress");
    expect(skill).toContain("evidence_quality");
    expect(skill).toContain("above 90%");
    expect(skill).toContain("asOf");
    expect(skill).not.toMatch(/fetch\(|query AskChing|JCNWRy|AwoxEZ/);
  });

  it("teaches safe cross-venue yield discovery without hiding a second engine", async () => {
    const skill = await readFile(skillUrl, "utf8");
    for (const expected of [
      "Uniswap V3",
      "Curve",
      "ranked separately",
      "dailySupplySideFeesUsd",
      "estimatedFeeApr",
      "fee_returns_variable",
      "impermanent_loss",
      "concentrated_liquidity",
      "position_range_dependent",
      "multi_asset_pool",
      "crossDexWinner",
      "no transaction"
    ]) {
      expect(skill).toContain(expected);
    }
  });

  it("tells the model about the generalized metric/asset/protocol surface", async () => {
    const skill = await readFile(skillUrl, "utf8");

    // Metrics
    expect(skill).toContain("supply_apy");
    expect(skill).toContain("borrow_apy");
    expect(skill).toContain("tvl");
    expect(skill).toContain("utilization");
    // Assets
    expect(skill).toContain("USDC");
    expect(skill).toContain("WETH");
    // Four live protocols (verified with pnpm probe:protocols on 2026-09-12)
    for (const protocol of [
      "aave-v3",
      "compound-v3",
      "spark-lend",
      "aave-v2"
    ]) {
      expect(skill).toContain(protocol);
    }
    // The skill must not claim a live protocol that cannot serve USDC.
    expect(skill).not.toMatch(/six live protocols/);
    // Legacy alias still documented
    expect(skill).toContain("usdc_supply_apy");
  });
});
