import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

async function read(relativePath: string): Promise<string> {
  return readFile(new URL(`../${relativePath}`, import.meta.url), "utf8");
}

describe("hackathon showcase package", () => {
  it("keeps the prompts aligned with the three-source implementation", async () => {
    const prompts = await read("demos/prompts.md");

    for (const expected of [
      "Aave V3",
      "Compound V3",
      "Spark Lend",
      "risk_scan",
      "analyze_markets",
      "yield-opportunity",
      "liquidity-stress",
      "as-of",
      "JCNWRypm7FYwV8fx5HhzZPSFaMxgkPuw4TnR3Gpi81zk",
      "AwoxEZbiWLvv6e3QdvdMZw4WDURdGbvPfHmZRc8Dpfz9",
      "GbKdmBe4ycCYCQLQSjqGg6UHYoYfbyJyq5WrG35pv1si"
    ]) {
      expect(prompts).toContain(expected);
    }
    expect(prompts).not.toContain("Until `risk_scan` is implemented");
  });

  it("keeps the recording and submission artifacts complete", async () => {
    const [runScript, submission, checklist] = await Promise.all([
      read("docs/superpowers/plans/2026-09-09-showcase-run-script.md"),
      read("docs/superpowers/specs/2026-09-09-ethglobal-copy.md"),
      read("docs/superpowers/specs/2026-09-09-pre-recording-checklist.md")
    ]);

    expect(runScript).toContain("0:00");
    expect(runScript).toContain("2:55");
    expect(runScript).toContain("ASKCHING_DEBUG=1");
    expect(submission).toContain("## Title");
    expect(submission).toContain("## Tagline / Short Description");
    expect(submission).toContain("## Long Description");
    expect(submission).toContain("https://github.com/Chonwai/AskChing_Agent");
    expect(checklist).toContain("## A. Pre-Recording");
    expect(checklist).toContain("## B. Pre-Submission");
  });

  it("links the showcase package from the README", async () => {
    const readme = await read("README.md");

    expect(readme).toMatch(/Fixture smoke test:[\s\S]*?pnpm demo/);
    expect(readme).toMatch(/Authenticated live smoke test:[\s\S]*?pnpm live:smoke/);
    expect(readme).toContain("2026-09-09-showcase-run-script.md");
    expect(readme).toContain("2026-09-09-ethglobal-copy.md");
    expect(readme).toContain("2026-09-09-pre-recording-checklist.md");
  });
});
