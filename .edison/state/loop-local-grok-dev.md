# Loop State: Local Grok testing options + Phase 1-3 development

- **Goal (Done Contract)**:
  1. 深度研究：本地 MacBook 測試 Grok Bot 的選項 — ✅ DONE
  2. 開發 demo CLI (spec §6b) — ✅ DONE
  3. 開發 risk_scan — ✅ DONE
  4. 開發 settled fan-out + 第三 source — ✅ DONE
- **Quality Mode**: strict（Threshold 93）｜**Depth**: L3 Deep Dive
- **Loop Shape**: 研究 + 完整開發
- **Timeline**: 2026-09-08, submit 截止 2026-09-13

## 研究結論（本地 Grok 測試）

**不一定需要 XAI_API_KEY！** 有本地替代方案：

- **Ollama**（首選）：Mac 支援、tool calling ✅、OpenAI-compatible（`localhost:11434/v1`）
- **LM Studio / llama.cpp**：同樣 OpenAI-compatible
- **VS Code 內建 MCP client**：可測我們 server
- **關鍵抽象**：LLM client 用 OpenAI-compatible，開發用 Ollama（免費本地），demo 用 Grok（需 key）
- xAI API = `base_url="https://api.x.ai/v1"`, model `grok-4.6`, OpenAI-compatible, function calling 支援

## Iterations

### Iteration 1 (2026-09-08) — 完成 4 項開發

- **Demo CLI** ✅ `npm run demo` / `demo:live`（fixture + live 雙模式，3 sources）
- **risk_scan** ✅ 誠實 spot-snapshot 版：peer 最高 APY + spread + 明確 time-series gap
- **settled fan-out** ✅ `Promise.allSettled`，失敗 source → lastGaps 並指名
- **第三 source** ✅ **Spark Lend**（`GbKdmBe...`），live 驗證 3.54%，schema 相容
- **Live 3-source**: Compound 4.86% / Aave 3.62% / Spark 3.54%（block 25932799）
- **16 tests + build + demo 全綠**

## Commits (Iteration 1)

- dc87dcd feat(demo): add one-click demo CLI
- 42b1f04 feat(mcp): implement risk_scan with honest time-series gap
- a53e4e7 feat(shared): settled fan-out with per-source gap collection
- d74425e feat(shared): add Spark Lend as third live source
- b416ec0 feat: add Spark Lend fixture and demo 3-source comparison
- c2f5153 docs(spec): mark features implemented

## Circuit Breaker Status

- 連續失敗: 0
- 剩餘：Grok orchestrator（Phase 1b，需 Ollama 或 XAI key）— 下一步最高價值
