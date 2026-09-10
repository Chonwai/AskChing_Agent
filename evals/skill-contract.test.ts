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
    expect(skill).toContain("yield_opportunity");
    expect(skill).toContain("liquidity_stress");
    expect(skill).toContain("evidence_quality");
    expect(skill).toContain("above 90%");
    expect(skill).toContain("asOf");
    expect(skill).not.toMatch(/fetch\(|query AskChing|JCNWRy|AwoxEZ/);
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
    // Six live protocols
    for (const protocol of [
      "aave-v3",
      "compound-v3",
      "spark-lend",
      "aave-v2",
      "uwu-lend",
      "zerolend"
    ]) {
      expect(skill).toContain(protocol);
    }
    // Legacy alias still documented
    expect(skill).toContain("usdc_supply_apy");
  });
});
