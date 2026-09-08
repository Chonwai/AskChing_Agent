# Loop State: AskChain 雙文檔（Product Overview + Engineering Spec/Plan）

- **Goal (Done Contract)**: 交付兩份文檔
  1. **Product Overview**（`docs/product-overview.md`）：宏觀描述、問題痛點、解決方案、用戶旅程、產品定位、競賽 positioning
  2. **Engineering Spec + Development Plan**（`docs/engineering-spec.md`）：技術架構、API 契約、Schema 定義、Phase 路線圖、AC、分工
- **Quality Mode**: strict（Threshold 93）｜**Depth**: L3 Deep Dive
- **Loop Shape**: 研究+規劃（單 iteration, Stop Rule: strict 4 rounds）
- **Stage Round Counters**: DISCOVER: 0/1, PLAN: 0/2, VERIFY: 0/2
- **Timeline**: 2026-09-08, submit 截止 2026-09-13

## 已知事實（累積自上一個 Loop）

- 活動：ETHOnline 2026, 09/04-09/16, 線上 async, submit 截止 09/13 12:00 PM EDT
- Track: The Graph — Best AI Tooling or AI Use Case (From Scratch) $5,000
- 產品定位：AskChain = Grok-orchestrated research MCP over The Graph
- 第一階段：Grok Bot 優先可用（Skills/MCP），之後開放給 Codex / Gemini / Cursor 等
- Codebase 已有：MCP server (compare_markets) + shared (schemas, compare, graph-client, data-source, fixtures) + evals (5 cases) + SKILL.md
- Codebase 缺口：Grok orchestrator（1行 stub）、research_brief（not-implemented）、risk_scan（not-implemented）、第三 source、standalone demo CLI
- 報名資訊：showcase 已 submit (https://ethglobal.com/showcase/askchain-w4ntc)
- Team research 已整合（粵語 partner 講稿 + 五個可交貨差異 + 升級階梯）

## Iterations

（每次 dispatch 記錄於此）
