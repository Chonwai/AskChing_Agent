# Loop State — Observability 深化（多層 trace）

- **Task slug**: `deep-observability`
- **Goal (Done Contract)**: 把 tool-level logs 深化為 multi-layer trace：graph-client 查詢 subgraph 的每筆請求、Grok orchestrator 的 LLM 決策、citations 組裝。讓評審在 Vercel logs 看到完整處理流程。gates 全綠、多步 commit。
- **Quality Mode**: `strict`（threshold 93）+ deep
- **Depth**: L3

## 現有不足

```
tool_start → [40秒黑箱] → tool_end (durationMs=40676, resultSize=6378)
```

看不到：Grok 選了哪個 tool → 查了哪個 subgraph → 取得了什麼 citations → 每個 subgraph 花多久

## 新增事件類型

| 事件             | 發出位置                | 包含什麼                                                 |
| ---------------- | ----------------------- | -------------------------------------------------------- |
| `subgraph_query` | `graph-client.ts` #post | protocol, operationName, block, rows, durationMs         |
| `llm_call`       | `grok loop.ts` complete | model, selectedTools, turnNumber, durationMs             |
| `tool_end` 擴充  | `register.ts` finish()  | citationsCount, subgraphCount, llmTurns（新增 metadata） |

## 修改清單

1. `packages/shared/src/graph-client.ts` — #post 加 logEvent
2. `packages/grok-orchestrator/src/loop.ts` — complete() 後加 logEvent
3. `packages/mcp-server/src/observability.ts` — 新增 SubgraphQueryEvent / LlmCallEvent 類型
4. `packages/mcp-server/src/register.ts` — tool_end 加 metadata

## 驗證

- build/test 全綠
- pnpm mcp:http:smoke 顯示 subgraph_query / llm_call 事件
- Vercel logs 顯示完整 trace（不是 40 秒黑箱）
