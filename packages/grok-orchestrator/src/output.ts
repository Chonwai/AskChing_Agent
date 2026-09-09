import type { OrchestratorResult } from "./loop.js";

export function renderOrchestratorOutput(
  result: OrchestratorResult,
  debug: boolean
): string {
  if (!debug || result.toolCalls.length === 0) {
    return `${result.answer}\n`;
  }

  const trace = result.toolCalls.map(
    (call, index) =>
      `${index + 1}. ${call.name} ${JSON.stringify(call.arguments)}`
  );
  return `AskChing tool trace:\n${trace.join("\n")}\n\n${result.answer}\n`;
}
