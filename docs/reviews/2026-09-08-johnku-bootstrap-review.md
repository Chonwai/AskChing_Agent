# AskChing Code Review — johnku2011 Bootstrap Slices

> **Reviewer:** smith (edison-code-review-audit) — strict mode, Threshold 93  
> **Date:** 2026-09-08  
> **Result:** **93.15/100 — ✅ PASS**（邊緣通過）  
> **Commit range:** `c413c98 → 55bbea7`（johnku2011 core code）+ `b688791`（chonwai docs）

---

## 總分卡

| Dimension | Score | Weight | Weighted |
|-----------|:-----:|:------:|:--------:|
| CR-D1 Plan Compliance | 95 | 22.5% | 21.375 |
| CR-D2 Architecture | 92 | 17.5% | 16.100 |
| CR-D4 Cross-Module | 90 | 17.5% | 15.750 |
| CR-D5 Security/OWASP | 93 | 22.5% | 20.925 |
| CR-D6 Performance | 95 | 12.5% | 11.875 |
| CR-D7 Design Patterns | 95 | 7.5% | 7.125 |
| **Total** | — | **100%** | **93.15** |

## 裁定

**0 Critical / 0 High / 2 Medium / 9 Low**

**判斷：johnku2011 的代碼是堅實的繼續開發基礎。** 核心 `compare_markets` 垂直切片完整、有測試、有 citations、有 fail-closed 驗證。架構乾淨（三層分離 + DI），Zod 驗證貫穿所有邊界，安全性無虞。

## Findings 摘要

### Medium (2)

| ID | Finding | Location | 修復 |
|----|---------|----------|------|
| M1 | graph-client 錯誤路徑無測試（HTTP error, GraphQL error, no USDC rate） | `graph-client.test.ts` | 加 3 個 error path tests |
| M2 | `ResearchBriefInputSchema` / `RiskScanInputSchema` 本地定義在 `index.ts`，與 shared schema pattern 不一致 | `mcp-server/src/index.ts:62-76` | 移至 shared 或統一在 tools.ts |

### Low (9)

| ID | Finding | 修復 |
|----|---------|------|
| D1-7 | spec §5.4「未驗證」已過時（live smoke 已 PASS） | 更新為「已驗證」 |
| D1-8 | `timeframe` 無 format validation | 加 regex |
| D2-5 | grok-orchestrator 是空 stub | Phase 1 優先實作 |
| D2-6 | 無 structured logging | 生產需補；hackathon 可忽略 |
| D5-11 | fetch 無 timeout | 加 AbortController |
| D5-12 | error message 暴露 protocol name | 低風險 |
| D6-5 | Graph query over-fetch `markets(first: 100)` | 可加 where filter |
| D6-6 | 無 Graph response caching | Phase 2+ |
| D7-6 | `compareMarkets()` thin wrapper | defensible |

## 已驗證可靠的強項

- ✅ Live mode 已驗證：Aave V3 3.62% / Compound V3 5.10%（完整 citation）
- ✅ 5 eval cases + 8 tests 全綠
- ✅ SKILL.md 薄 playbook（48 lines）
- ✅ Start Fresh 合規（9 incremental commits, no prior code）
- ✅ Secrets 安全（零 console.log、.env gitignored、private fields）
- ✅ 靜態 GraphQL query（無 injection）