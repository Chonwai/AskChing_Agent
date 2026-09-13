# AskChing — Demo 敘事腳本（遠端 MCP + 多平台）

> 建立日期: 2026-09-12｜對應 Loop: `loop-vercel-mcp-deployment`
> 目標: 讓 The Graph 評審在 3 分鐘內產生 **3 個 Wow 時刻**
> 前置: 已部署 `https://<app>.vercel.app/api/mcp`

---

## 0. 一句話定位（開場必須講出來）

> **「graph-lending-mcp 讓你問得到；AskChing 讓你信得過。」**

同一份能力，**7 個平台、一行 URL**。

---

## 1. 三個 Wow 時刻（腳本圍繞這三點設計）

| #      | Wow                                                     | 為什麼評審會記住                                                                        |
| ------ | ------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| **W1** | **同一個問題，三個不同 AI 平台，同一份 evidence chain** | 證明這是「基礎設施」而不是「一個 demo」。評審在別的參賽者身上看不到這個。               |
| **W2** | **它會說「我不知道」**                                  | 故意做一個 fail-closed 的示範：只給一個協議 → 系統**拒絕回答**。AI 工具最缺的就是這個。 |
| **W3** | **時間維度：從 spot 到趨勢，且每個點都可溯源**          | 展示 The Graph 的歷史數據被真正用上，不是拿即時價敷衍。                                 |

---

## 2. 腳本（目標 3:10，上限 4:00）

### 0:00–0:20 — 痛點（不要介紹技術）

> 「問任何一個 AI：『現在哪個借貸協議的 USDC 利率最高？』
> 它會給你一個數字——**沒有來源、沒有時間、沒有區塊高度**。
> 在 DeFi 研究裡，這種數字等於零。」

**畫面**：一般 AI 給出無來源數字的對比截圖。

### 0:20–0:45 — 我們是什麼

> 「AskChing 是 The Graph 之上的 AI 研究層。
> 它把自然語言問題變成**跨協議、可溯源**的研究報告。」

**畫面**：`curl https://<app>.vercel.app/api/health`
→ `{"transport":"streamable-http","live":true}`

> 「它已經部署在雲端，是一個標準的遠端 MCP server。」

### 0:45–1:15 — 問題 1 + citation（第一層證據）

**畫面**：Claude Desktop，輸入：

> Compare live USDC supply APY across Aave V3, Compound V3, and Spark Lend. Cite every source.

**講解重點**（指著畫面）：

> 「注意三件事：
> 一是 **ranked**，不是條列；
> 二是每個數字後面有 **subgraph ID、block、query hash**；
> 三是 **as-of 時間**——你看得到這是哪一個區塊的答案。」

### 1:15–1:50 — 🎯 **W1：換平台，同一份證據**

**畫面**：切到 VS Code Copilot，問**完全一樣的問題**。

> 「同一份 server，同一行 URL。換一個 AI 平台，答案的**證據結構完全一樣**。」

再切到 terminal：

```bash
gemini mcp list
```

→ 顯示 `askching … (http) - Connected` 與 5 個工具。

> 「Claude、Cursor、VS Code、Codex、Gemini、Grok Bot——
> 這不是為某一家做的工具，是**基礎設施**。」

### 1:50–2:20 — 🎯 **W2：它會拒絕回答**

**畫面**：故意只給一個協議：

```bash
ASKCHING_DEBUG=1 pnpm askching -- "Compare USDC supply APY on Aave V3 only"
```

**預期**：系統 **fail-closed**，明確說明需要 ≥2 個 cited sources，**不給任何 row**。

> 「這是刻意的。我們的規則很簡單：
> **少於兩個有完整引用的來源，就不回答。**
> 因為一個沒有來源的數字，比沒有數字更危險。」

**字幕**：`Evidence is a structural invariant, not a display option.`

### 2:20–2:55 — 🎯 **W3：時間維度 + 誠實缺口**

**畫面**：

```bash
pnpm askching -- "How has USDC supply APY trended across Aave V3, Compound V3 and Spark Lend over the last seven days?"
```

**講解**：

> 「這不是即時快照，是 **7 天的每日快照序列**——
> 每個點都帶自己的 block 和 timestamp。
> 你看得到 slope、direction、volatility。」

再示範誠實缺口：

```bash
pnpm askching -- "Analyze the best USDC yield opportunity over the last seven days"
```

（用 spot-only objective + 歷史時間窗 → 產生 **explicit gap**）

> 「如果我們要的是 spot 分析、而你問了歷史，
> 它不會假裝——它會**明確告訴你這是缺口**，而不是偷偷用即時值代替。」

### 2:55–3:10 — 收尾

> 「The Graph 提供不可變、可驗證的鏈上歷史。
> AskChing 把它變成 AI 敢引用、也敢承認不知道的研究報告。
>
> **它不是另一個 lending MCP——它是讓 AI 敢對鏈上數據負責的那一層。**」

**畫面**：GitHub repo URL + `https://<app>.vercel.app/api/health`

---

## 3. Shot List（錄影前勾選）

- [ ] 一般 AI 無來源回答（對比用）
- [ ] `curl .../api/health` → `live: true`
- [ ] `curl .../api/mcp` `tools/list` → 5 個工具
- [ ] Claude Desktop：問題 1 → ranked + citation + asOf
- [ ] VS Code Copilot：同問題 → 同結構
- [ ] `gemini mcp list` → `Connected`
- [ ] **fail-closed 示範**（單協議 → 拒絕）
- [ ] `analyze_trends` 7d → slope / direction / volatility
- [ ] **explicit gap 示範**（spot-only objective + 歷史窗）
- [ ] Grok Bot（若 connectors 可用；否則跳過）
- [ ] 收尾字卡（repo URL + endpoint）

---

## 4. 必須避免的五件事

| ❌ 不要                                                            | 原因                                                           |
| ------------------------------------------------------------------ | -------------------------------------------------------------- |
| 展示 fixture 模式卻說 live                                         | 查得到真假。錄影前務必 `curl /api/health` 確認 `live: true`    |
| 說「預測」或「建議買入」                                           | 我們是描述性研究工具。caveat 已寫明 not a forecast             |
| 炫耀「90 個協議」                                                  | 我們是 3–10 個協議。硬碰覆蓋數會輸，**證據深度才是我們的戰場** |
| 把 Gemini 的工具名 `mcp_askching_analyze_trends` 當成我們的 API 名 | 那是 CLI 的命名空間                                            |
| 錄到 API key                                                       | 錄影前檢查 terminal 與 URL bar                                 |

---

## 5. Fallback 計畫

| 若…                              | 改用                                                                   |
| -------------------------------- | ---------------------------------------------------------------------- |
| Grok Bot connectors 不可用       | 跳過，改問 VS Code + Cursor（W1 依然成立）                             |
| Live Graph 查詢失敗              | 該段改用 `DEMO_LIVE=0` fixture 示範並**說明**是 fixture；不要假裝 live |
| Claude Desktop 版本不支援 remote | 用 §`docs/platform-integration.md` §10 的 `mcp-remote` 橋接            |
| 網路不穩                         | 事前錄好備份；把 curl 結果先存成文字檔備用                             |
| 時間不足                         | **保留 W2（fail-closed）**——那是最不可替代的一段                       |

---

## 6. 錄影前檢查（3 分鐘）

```bash
# 1) endpoint 活著且是 live 模式
curl -s https://<app>.vercel.app/api/health

# 2) 5 個工具都在
curl -s https://<app>.vercel.app/api/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | jq '.result.tools | length'

# 3) 本機全綠
pnpm test && pnpm eval && pnpm mcp:smoke && pnpm mcp:http:smoke && pnpm vercel:probe

# 4) 預熱（避免 demo 時 cold start）
curl -s https://<app>.vercel.app/api/mcp -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' > /dev/null
```

---

## 7. 相關文件

| 文件                                                       | 用途                  |
| ---------------------------------------------------------- | --------------------- |
| `docs/deployment-vercel.md`                                | 部署步驟              |
| `docs/platform-integration.md`                             | 各平台接入設定        |
| `docs/improvement-blueprint.md`                            | 剩餘改善藍圖          |
| `demos/prompts.md`                                         | Demo A–F prompts 底稿 |
| `docs/superpowers/plans/2026-09-09-showcase-run-script.md` | 原始錄影 runbook      |
