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
    expect(skill).toContain("asOf");
    expect(skill).not.toMatch(/fetch\(|query AskChing|JCNWRy|AwoxEZ/);
  });
});
