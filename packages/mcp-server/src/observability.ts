/**
 * Minimal structured logger for MCP observability.
 *
 * On Vercel serverless, `console.log` output lands in Runtime Logs with an
 * automatic `requestId`. Emitting one JSON line per event (request received,
 * tool called, tool finished, request finished) lets you trace an MCP call:
 * which tool ran, with what params, how long it took, and what it returned.
 *
 * Keep every line on a single 256KB line (Vercel limit) and never log secrets
 * (API keys). Params are truncated to a safe preview length.
 */

export interface ToolLogEvent {
  type: 'tool_start' | 'tool_end' | 'tool_error';
  tool: string;
  requestId?: string;
  /** Truncated, redacted preview of the tool arguments. */
  argsPreview?: string;
  durationMs?: number;
  /** Size in chars of the JSON text returned (not the content itself). */
  resultSize?: number;
  error?: string;
}

export interface RequestLogEvent {
  type: 'request_start' | 'request_end';
  requestId?: string;
  method?: string;
  path?: string;
  durationMs?: number;
  status?: number;
}

const PARAMS_PREVIEW_LIMIT = 300;

/** Redact known secret-ish keys from an args object before logging. */
function redactArgs(args: unknown): unknown {
  if (typeof args !== 'object' || args === null) return args;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(args as Record<string, unknown>)) {
    if (/key|token|secret|password|auth/i.test(key)) {
      out[key] = '[redacted]';
    } else {
      out[key] = value;
    }
  }
  return out;
}

function argsPreview(args: unknown): string {
  let text: string;
  try {
    text = JSON.stringify(redactArgs(args));
  } catch {
    text = String(args);
  }
  return text.length > PARAMS_PREVIEW_LIMIT ? text.slice(0, PARAMS_PREVIEW_LIMIT) + '...' : text;
}

export function logEvent(event: RequestLogEvent | ToolLogEvent): void {
  const line = JSON.stringify({ ts: new Date().toISOString(), ...event });
  // Use console.log so it appears in Vercel Runtime Logs and local stdout.
  // eslint-disable-next-line no-console
  console.log(line);
}

/** Log the start of a tool call; returns a finish callback that logs the outcome. */
export function logToolCall(
  tool: string,
  args: unknown,
  requestId?: string,
): (result?: unknown, error?: unknown) => void {
  logEvent({
    type: 'tool_start',
    tool,
    requestId,
    argsPreview: argsPreview(args),
  });
  const startedAt = Date.now();
  return (result?: unknown, error?: unknown) => {
    const durationMs = Date.now() - startedAt;
    if (error) {
      logEvent({
        type: 'tool_error',
        tool,
        requestId,
        durationMs,
        error: error instanceof Error ? error.message : String(error),
      });
      return;
    }
    const resultSize = result ? JSON.stringify(result).length : 0;
    logEvent({
      type: 'tool_end',
      tool,
      requestId,
      durationMs,
      resultSize,
    });
  };
}
