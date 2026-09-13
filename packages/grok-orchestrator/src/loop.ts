import {
  analyzeMarkets,
  analyzeTrends,
  compareMarkets,
  discoverYields,
  getInfo,
  researchBrief,
  riskScan,
} from '@askching/mcp-server/tools.js';
import type { MarketDataSource } from '@askching/shared';
import { LIVE_PROTOCOLS } from '@askching/shared';

export interface FunctionToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export type ChatMessage =
  | { role: 'system' | 'user'; content: string }
  | {
      role: 'assistant';
      content: string | null;
      tool_calls?: FunctionToolCall[];
    }
  | { role: 'tool'; tool_call_id: string; name: string; content: string };

export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface ChatCompletionRequest {
  messages: ChatMessage[];
  tools: ToolDefinition[];
  toolChoice: 'auto';
}

export interface ChatCompletionClient {
  complete(request: ChatCompletionRequest): Promise<{
    role: 'assistant';
    content: string | null;
    tool_calls?: FunctionToolCall[];
  }>;
}

export interface ToolExecution {
  name: string;
  arguments: unknown;
  result: unknown;
}

export interface OrchestratorResult {
  answer: string;
  toolCalls: ToolExecution[];
}

/**
 * Single source for the protocol enum repeated by every tool definition.
 *
 * Derived from the registry rather than written out by hand: the hand-written
 * copy had drifted and still advertised `uwu-lend` and `zerolend`, which are
 * not live (neither can serve USDC). Deriving means the model can never be told
 * a protocol is usable when `assertLiveProtocols` would reject it.
 */
const LIVE_PROTOCOL_ENUM: readonly string[] = [...LIVE_PROTOCOLS];

export const ASKCHING_TOOLS: ToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'get_info',
      description:
        'Self-description tool. Use when the user asks what this MCP can do, what tools exist, how to use it, or wants an example question. Returns the AskChing overview, evidence model, the six research tools with a copy-paste example each, transports, and live sources. Topic: overview | tools | examples | all.',
      parameters: {
        type: 'object',
        properties: {
          topic: {
            type: 'string',
            enum: ['overview', 'tools', 'examples', 'all'],
            default: 'all',
          },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'compare_markets',
      description:
        'Compare a market metric (supply_apy, borrow_apy, tvl, utilization) for a given asset across at least two supported protocols with citations.',
      parameters: {
        type: 'object',
        properties: {
          metric: {
            type: 'string',
            description:
              'Metric id: supply_apy | borrow_apy | tvl | utilization (legacy usdc_supply_apy also accepted)',
            enum: ['supply_apy', 'borrow_apy', 'tvl', 'utilization', 'usdc_supply_apy'],
          },
          asset: {
            type: 'string',
            description: 'Asset symbol, e.g. USDC, USDT, DAI, WETH. Defaults to USDC.',
            default: 'USDC',
          },
          protocols: {
            type: 'array',
            items: {
              type: 'string',
              enum: LIVE_PROTOCOL_ENUM,
            },
            minItems: 2,
            description: 'At least two LIVE protocols',
          },
          timeframe: {
            type: 'string',
            description: 'Optional timeframe hint (currently spot-only; will be noted as caveat)',
          },
        },
        required: ['metric', 'protocols'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'research_brief',
      description:
        'Create a structured cited research brief for two or more supported protocols, for a given metric and asset.',
      parameters: {
        type: 'object',
        properties: {
          question: { type: 'string', description: 'Research question' },
          protocols: {
            type: 'array',
            items: {
              type: 'string',
              enum: LIVE_PROTOCOL_ENUM,
            },
            minItems: 2,
          },
          metric: {
            type: 'string',
            enum: ['supply_apy', 'borrow_apy', 'tvl', 'utilization', 'usdc_supply_apy'],
            default: 'supply_apy',
          },
          asset: { type: 'string', default: 'USDC' },
        },
        required: ['question', 'protocols'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'risk_scan',
      description:
        'Return peer-relative spot risk signals and explicit data gaps for supported protocols, for a given metric and asset(s).',
      parameters: {
        type: 'object',
        properties: {
          protocols: {
            type: 'array',
            items: {
              type: 'string',
              enum: LIVE_PROTOCOL_ENUM,
            },
            minItems: 2,
          },
          metric: {
            type: 'string',
            enum: ['supply_apy', 'borrow_apy', 'tvl', 'utilization', 'usdc_supply_apy'],
            default: 'supply_apy',
          },
          assets: {
            type: 'array',
            items: { type: 'string' },
            description: 'Asset symbols, defaults to [USDC]',
          },
          asset: {
            type: 'string',
            description: 'Single asset alias for assets',
          },
          window: {
            type: 'string',
            description: 'Time window hint (currently spot-only)',
          },
        },
        required: ['protocols', 'window'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'analyze_markets',
      description:
        'Analyze current cited market data for yield opportunity, liquidity stress, or evidence quality. Returns transparent calculations, supporting values, citations, confidence, caveats, gaps, and as-of time.',
      parameters: {
        type: 'object',
        properties: {
          objective: {
            type: 'string',
            enum: ['yield_opportunity', 'liquidity_stress', 'evidence_quality'],
          },
          protocols: {
            type: 'array',
            items: {
              type: 'string',
              enum: LIVE_PROTOCOL_ENUM,
            },
            minItems: 2,
          },
          asset: { type: 'string', default: 'USDC' },
          metrics: {
            type: 'array',
            items: {
              type: 'string',
              enum: ['supply_apy', 'borrow_apy', 'tvl', 'utilization'],
            },
            description: 'Optional metric override; defaults depend on the objective.',
          },
          timeframe: {
            type: 'string',
            description:
              'Optional historical intent; current data is spot-only and this becomes an explicit gap.',
          },
        },
        required: ['objective', 'protocols'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'analyze_trends',
      description:
        'Analyze cited daily history for a market metric over a 7d or 30d window: per-protocol change, change percent, least-squares slope per day, direction (rising/falling/flat), volatility, min/max, every cited data point, confidence, caveats, and gaps. Descriptive, not a forecast.',
      parameters: {
        type: 'object',
        properties: {
          metric: {
            type: 'string',
            description:
              'Metric id: supply_apy | borrow_apy | tvl | utilization (legacy usdc_supply_apy also accepted)',
            enum: ['supply_apy', 'borrow_apy', 'tvl', 'utilization', 'usdc_supply_apy'],
          },
          asset: { type: 'string', default: 'USDC' },
          protocols: {
            type: 'array',
            items: {
              type: 'string',
              enum: LIVE_PROTOCOL_ENUM,
            },
            minItems: 2,
            description: 'At least two LIVE protocols',
          },
          window: {
            type: 'string',
            enum: ['7d', '30d'],
            description:
              'Historical window of daily snapshots. Use 7d unless the user asks for a month.',
          },
        },
        required: ['metric', 'protocols', 'window'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'discover_yields',
      description:
        'Use for where-to-earn, deposit, lend, or stablecoin-LP questions across venue types. Discovers cited Ethereum-mainnet USDC lending, Uniswap V3, and Curve opportunities. Lending supply APY and historical LP fee APR must be ranked separately with formulas, complete-day windows, risks, caveats, and gaps. No transaction execution or combined lending/LP winner. Use compare_markets for a single lending metric and analyze_trends for historical lending questions.',
      parameters: {
        type: 'object',
        properties: {
          asset: { type: 'string', enum: ['USDC'], default: 'USDC' },
          chain: { type: 'string', enum: ['ethereum-mainnet'], default: 'ethereum-mainnet' },
          stablecoins: {
            type: 'array',
            items: { type: 'string', enum: ['USDT', 'DAI'] },
            default: ['USDT', 'DAI'],
          },
          venues: {
            type: 'array',
            items: { type: 'string', enum: ['lending', 'uniswap-v3', 'curve'] },
            default: ['lending', 'uniswap-v3', 'curve'],
          },
          minTvlUsd: { type: 'number', minimum: 0, default: 1_000_000 },
          limitPerCategory: { type: 'integer', minimum: 1, maximum: 20, default: 5 },
        },
        additionalProperties: false,
      },
    },
  },
];

export async function runGrokOrchestrator(options: {
  prompt: string;
  client: ChatCompletionClient;
  dataSource: MarketDataSource;
  systemPrompt: string;
  maxTurns?: number;
}): Promise<OrchestratorResult> {
  const messages: ChatMessage[] = [
    { role: 'system', content: options.systemPrompt },
    { role: 'user', content: options.prompt },
  ];
  const toolCalls: ToolExecution[] = [];

  for (let turn = 0; turn < (options.maxTurns ?? 4); turn += 1) {
    const assistant = await options.client.complete({
      messages,
      tools: ASKCHING_TOOLS,
      toolChoice: 'auto',
    });
    messages.push(assistant);

    if (!assistant.tool_calls?.length) {
      if (!assistant.content?.trim()) {
        throw new Error('The model returned neither an answer nor a tool call');
      }
      return { answer: assistant.content, toolCalls };
    }

    for (const call of assistant.tool_calls) {
      const argumentsValue = parseToolArguments(call);
      const result = await executeTool(call.function.name, argumentsValue, options.dataSource);
      toolCalls.push({
        name: call.function.name,
        arguments: argumentsValue,
        result,
      });
      messages.push({
        role: 'tool',
        tool_call_id: call.id,
        name: call.function.name,
        content: JSON.stringify(result),
      });
    }
  }

  throw new Error('The model exceeded the maximum tool-calling turns');
}

function parseToolArguments(call: FunctionToolCall): unknown {
  try {
    return JSON.parse(call.function.arguments);
  } catch {
    throw new Error(`Invalid JSON arguments for tool ${call.function.name}`);
  }
}

async function executeTool(
  name: string,
  input: unknown,
  dataSource: MarketDataSource,
): Promise<unknown> {
  switch (name) {
    case 'get_info':
      return getInfo(input);
    case 'analyze_markets':
      return analyzeMarkets(input, dataSource);
    case 'analyze_trends':
      return analyzeTrends(input, dataSource);
    case 'compare_markets':
      return compareMarkets(input, dataSource);
    case 'discover_yields':
      return discoverYields(input, dataSource);
    case 'research_brief':
      return researchBrief(input, dataSource);
    case 'risk_scan':
      return riskScan(input, dataSource);
    default:
      throw new Error(`Unsupported AskChing tool: ${name}`);
  }
}
