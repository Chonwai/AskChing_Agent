import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

describe("command environment configuration", () => {
  it("loads the local .env file for every credentialed entry point", async () => {
    const packageJson = JSON.parse(
      await readFile(new URL("../package.json", import.meta.url), "utf8")
    ) as { scripts: Record<string, string> };

    expect(packageJson.scripts["demo:live"]).toContain("--env-file=.env");
    expect(packageJson.scripts["live:smoke"]).toContain("--env-file=.env");
    expect(packageJson.scripts.askching).toContain("--env-file=.env");
  });

  it("pins fixture and live demo commands to their advertised modes", async () => {
    const packageJson = JSON.parse(
      await readFile(new URL("../package.json", import.meta.url), "utf8")
    ) as { scripts: Record<string, string> };

    expect(packageJson.scripts.demo).toMatch(/^DEMO_LIVE=0 /);
    expect(packageJson.scripts["demo:live"]).toMatch(/^DEMO_LIVE=1 /);
    expect(packageJson.scripts["live:smoke"]).toMatch(/^DEMO_LIVE=1 /);
  });
});
