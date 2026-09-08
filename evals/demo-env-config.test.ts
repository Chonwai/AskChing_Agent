import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

describe("demo environment configuration", () => {
  it("loads the local .env file for both live demo entry points", async () => {
    const packageJson = JSON.parse(
      await readFile(new URL("../package.json", import.meta.url), "utf8")
    ) as { scripts: Record<string, string> };

    expect(packageJson.scripts["demo:live"]).toContain("--env-file=.env");
    expect(packageJson.scripts["live:smoke"]).toContain("--env-file=.env");
  });
});
