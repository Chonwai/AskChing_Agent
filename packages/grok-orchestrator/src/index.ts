import "dotenv/config";

import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

import { createMarketDataSource } from "@askching/shared";

import { OpenAIChatCompletionClient } from "./client.js";
import { runGrokOrchestrator } from "./loop.js";

const DEFAULT_BASE_URL = "https://api.x.ai/v1";
const DEFAULT_MODEL = "grok-4.6";

export async function main(args = process.argv.slice(2)): Promise<void> {
  const promptArgs = args[0] === "--" ? args.slice(1) : args;
  const prompt = promptArgs.join(" ").trim();
  if (!prompt) {
    throw new Error('Usage: pnpm askching -- "Compare USDC supply APY"');
  }

  const baseUrl = process.env.ASKCHING_LLM_BASE_URL ?? DEFAULT_BASE_URL;
  const apiKey = process.env.XAI_API_KEY;
  if (baseUrl.includes("api.x.ai") && !apiKey) {
    throw new Error("XAI_API_KEY is required when using the xAI endpoint");
  }

  const systemPrompt = await readFile(
    new URL("../../../skills/askching/SKILL.md", import.meta.url),
    "utf8"
  );
  const result = await runGrokOrchestrator({
    prompt,
    systemPrompt,
    client: new OpenAIChatCompletionClient({
      baseUrl,
      model: process.env.ASKCHING_LLM_MODEL ?? DEFAULT_MODEL,
      apiKey
    }),
    dataSource: createMarketDataSource(process.env)
  });

  process.stdout.write(`${result.answer}\n`);
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : undefined;
if (invokedPath === fileURLToPath(import.meta.url)) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`AskChing error: ${message}\n`);
    process.exitCode = 1;
  });
}
