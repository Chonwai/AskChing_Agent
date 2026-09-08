import type {
  ChatCompletionClient,
  ChatCompletionRequest,
  ChatMessage
} from "./loop.js";

interface OpenAIChatCompletionClientOptions {
  baseUrl: string;
  model: string;
  apiKey?: string;
  fetch?: typeof globalThis.fetch;
}

interface CompletionResponse {
  choices?: Array<{ message?: ChatMessage }>;
}

export class OpenAIChatCompletionClient implements ChatCompletionClient {
  readonly #baseUrl: string;
  readonly #model: string;
  readonly #apiKey?: string;
  readonly #fetch: typeof globalThis.fetch;

  constructor(options: OpenAIChatCompletionClientOptions) {
    this.#baseUrl = options.baseUrl.replace(/\/$/, "");
    this.#model = options.model;
    this.#apiKey = options.apiKey;
    this.#fetch = options.fetch ?? globalThis.fetch;
  }

  async complete(request: ChatCompletionRequest) {
    const headers: Record<string, string> = {
      "content-type": "application/json"
    };
    if (this.#apiKey) {
      headers.authorization = `Bearer ${this.#apiKey}`;
    }

    const response = await this.#fetch(`${this.#baseUrl}/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: this.#model,
        messages: request.messages,
        tools: request.tools,
        tool_choice: request.toolChoice
      })
    });
    if (!response.ok) {
      throw new Error(
        `Chat completion failed with ${response.status}: ${await response.text()}`
      );
    }

    const payload = (await response.json()) as CompletionResponse;
    const message = payload.choices?.[0]?.message;
    if (!message || message.role !== "assistant") {
      throw new Error("Chat completion response did not contain an assistant message");
    }
    return message;
  }
}
