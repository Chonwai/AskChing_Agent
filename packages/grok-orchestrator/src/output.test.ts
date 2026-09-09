import { describe, expect, it } from "vitest";

import { renderOrchestratorOutput } from "./output.js";

describe("renderOrchestratorOutput", () => {
  const result = {
    answer: "Compound leads with three cited sources.",
    toolCalls: [
      {
        name: "compare_markets",
        arguments: {
          metric: "usdc_supply_apy",
          protocols: ["aave-v3", "compound-v3", "spark-lend"]
        },
        result: { sources: [{ protocol: "aave-v3" }] }
      }
    ]
  };

  it("prints a concise tool trace when debug output is enabled", () => {
    const output = renderOrchestratorOutput(result, true);

    expect(output).toContain("AskChing tool trace");
    expect(output).toContain("compare_markets");
    expect(output).toContain('"metric":"usdc_supply_apy"');
    expect(output).toContain(result.answer);
    expect(output).not.toContain('"sources"');
  });

  it("prints only the answer when debug output is disabled", () => {
    expect(renderOrchestratorOutput(result, false)).toBe(`${result.answer}\n`);
  });
});
