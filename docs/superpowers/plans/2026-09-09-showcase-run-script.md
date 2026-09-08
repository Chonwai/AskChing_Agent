# AskChing Showcase Run Script（2:55 逐字稿 + 畫面動作）

> **日期：** 2026-09-09
> **依據 spec：** `docs/superpowers/specs/2026-09-09-product-led-showcase-design.md`
> **依賴 prompts：** `demos/prompts.md`（Demo A / Demo C，已定稿）
> **總時長：** 2:55（2.5–3 分鐘，符合 Acceptance Criteria「2–4 分鐘」）
> **錄影路徑：** `pnpm demo:live`（live）；**rehearsal 路徑：** `pnpm demo`（fixture）

---

## 0. 錄影前準備（不計入 2:55）

依照 `docs/superpowers/specs/2026-09-09-pre-recording-checklist.md` 完成 Pre-recording 全部項目後才開錄。

| 項目 | 內容 |
| --- | --- |
| 錄影工具 | macOS 內建 QuickTime Player（螢幕錄製）或 OBS；解析度 ≥ 720p（建議 1920×1080） |
| 收音 | 外接麥克風優先；避免機械鍵盤與風扇雜音；距離 15–30 cm |
| 環境 | 終端機放大至可讀字型（≥ 16pt）；關閉所有含 `.env`/key 的視窗與 tab |
| 計時 | 手機碼錶或螢幕內建計時器；每段結束對錶，超時即重錄該段 |
| 素材 | 先以 `pnpm demo`（fixture）rehearsal ≥ 3 次，確認逐字稿語速與指令節奏 |

**錄影行為規範（Spec Recording behavior）：**
- 中心段（Live workflow）必須用 **live Graph 資料**，並在畫面標註「LIVE」。
- 必須用 **真實 Grok response**（不可用 fixture 冒充）。
- 全程 **人類旁白**，不是 TTS。
- 憑證與 `.env` 禁止入鏡。
- 若 gateway / model 在錄影中失敗 → **停止並重錄**，不得把 fixture 輸出當 live。

---

## 1. Problem & Product — 0:00–0:20

### 時間軸

| 時間 | 旁白逐字稿（英文，口語可錄） | 畫面動作 |
| --- | --- | --- |
| 0:00–0:05 | "DeFi lending rates live in separate subgraphs. Aave, Compound, Spark — each protocol publishes its own schema, its own metric definitions, its own units. Comparing them usually means writing queries by hand and trusting whatever numbers you can line up." | **畫面 1（分割）：** 左半是 2–3 個 The Graph Explorer 分頁（Aave V3 / Compound V3 / Spark Lend，可靜態展示或開著但不操作）；右半是全黑畫面。0:00 開場。 |
| 0:05–0:15 | "That is the problem AskChing solves. AskChing is a cited research agent — not another subgraph search box. You ask one research question in plain English, and it fans out across live subgraphs, normalizes the numbers, and brings back one ranked answer you can trace." | 右半淡入 terminal，顯示 `$ pnpm askching -- "Compare..."` 提示（不執行）。強調「cited research agent」口氣。 |
| 0:15–0:20 | "Watch what happens when I ask for a comparison." | 畫面切到單一全螢幕 terminal，游標停在 `$` 提示符。 |

**旁白提示：** 0:00–0:10 語氣平穩，先建立痛點；0:10 後「AskChing」第一次出現要加重。

---

## 2. Live Research Workflow — 0:20–1:55

### 2.1 執行 Demo A（0:20–0:50）

| 時間 | 旁白逐字稿 | 畫面動作 |
| --- | --- | --- |
| 0:20–0:32 | "Here is the question: *Compare live USDC supply APY across Aave V3, Compound V3, and Spark Lend right now. Rank the results, cite each source, and state the as-of time.*" | 逐字輸入 Demo A prompt（`demos/prompts.md` Demo A）。**不要**先寫好再貼上 — 讓觀眾看到打字，但保持流暢。 |
| 0:32–0:38 | "One sentence. Three protocols. Grok reads the request, and it has to decide which AskChing tool fits." | 游標停在輸入完成後、Enter 前，停 1–2 秒。 |
| 0:38–0:50 | "Watch the tool selection — it picks `research_brief`, because the question is a synthesis, not a single number." | 按 Enter。畫面顯示 Grok 的 tool-call 決策：`research_brief` + `protocols: [aave-v3, compound-v3, spark-lend]`（若有 tool-call log 顯示）。若 CLI 不顯示 tool-call，旁白改為「it's calling `research_brief` in the background」。 |

### 2.2 Fan-out + 結果（0:50–1:35）

| 時間 | 旁白逐字稿 | 畫面動作 |
| --- | --- | --- |
| 0:50–1:02 | "Under the hood, AskChing fans out to three live The Graph subgraphs on Ethereum mainnet. Same metric — USDC supply APY. Same Messari schema, so the definitions actually line up." | 畫面（可選擇 overlay 或旁白+terminal）：三個 subgraph 請求依序出現（Aave V3 → Compound V3 → Spark Lend），每個顯示 subgraph ID（短碼）與 block number。 |
| 1:02–1:15 | "Each observation carries its own evidence — the subgraph, the block, and the query hash. AskChing only ranks numbers that share the same metric definition and unit. No mixing apples and oranges." | 畫面停留 **ranked 結果**：三行依 APY 排序、每行有 protocol + % + unit + source。可 zoom-in 或標註「same metric, same unit」。 |
| 1:15–1:35 | "Here is the answer, ranked, with every source cited and the as-of time right here — this is when the data was observed. Not a cached number, not a guess — three live sources, one normalized comparison." | 游標在畫面上依序指出：① 三行 ranked values ② 三個 source IDs ③ block numbers ④ `asOf` 時間。**停留 15–20 秒**讓評審讀完。若 Grok 回傳額外 caveat，指著說「and it flags the caveats, too」。 |

### 2.3 證據 follow-up（可選，0:00 內）（1:35–1:55）

> 若時間允許，用 Demo B 展示證據鏈；若超時可跳過（旁白改為一句「Every number here is traceable back to a live subgraph」）。

| 時間 | 旁白逐字稿 | 畫面動作 |
| --- | --- | --- |
| 1:35–1:45 | "And if you want the receipts: *For the top result, show me its subgraph, block, query hash, and observation timestamp.*" | 輸入 Demo B prompt。 |
| 1:45–1:55 | "Grok traces the top value back to its citation — subgraph, block, query hash, timestamp. The evidence chain closes the loop." | 畫面顯示 evidence chain（subgraph identity / block / queryHash / timestamp）。 |

---

## 3. Trust Behavior — 1:55–2:25

| 時間 | 旁白逐字稿 | 畫面動作 |
| --- | --- | --- |
| 1:55–2:02 | "Now let's push on trust. *Scan Aave V3, Compound V3, and Spark Lend for unusual USDC risk over seven days.*" | 輸入 Demo C prompt（`demos/prompts.md` Demo C）。 |
| 2:02–2:10 | "Grok calls `risk_scan`. And here is where the honesty kicks in." | 畫面顯示 Grok 呼叫 `risk_scan`（tool name 可標註）。 |
| 2:10–2:25 | "AskChing compares these three protocols *right now* — peer-relative spot signals — but it has no time-series, so it does **not** claim a seven-day trend. It says so, explicitly: *this is a spot snapshot; historical trend is not assessed.* That is the behavior we care about — refusing to fabricate history it does not have." | 畫面停留 `risk_scan` 輸出：findings（peer-relative spread）+ gaps（明確寫「No time-series data is available… single spot snapshot… not assessed」）。**停留 10 秒**。加重「refuses to fabricate」語氣。 |

**旁白提示：** 本段是誠實度示範，語氣要「平靜、堅定」，不是道歉。

---

## 4. Differentiation & Close — 2:25–2:55

| 時間 | 旁白逐字稿 | 畫面動作 |
| --- | --- | --- |
| 2:25–2:33 | "Why not just use the official Subgraph MCP? Because that's a query interface — it helps you discover schemas and query one subgraph at a time. That's infrastructure." | 畫面切到 README「Why not just official Subgraph MCP?」區塊（可放大該段落）。 |
| 2:33–2:42 | "AskChing sits on top of that. It adds multi-subgraph fan-out, comparable normalization, evidence gates that block uncited numbers, and Grok synthesis on top — so the answer is reasoning over evidence, not search." | 畫面展示架構摘要（可用 README「Current scope」或簡易 flow：User → Grok → AskChing tools → 3 subgraphs → cited answer）。游標依序指出 fan-out / normalization / evidence gates / Grok synthesis。 |
| 2:42–2:50 | "AskChing is research software — it does not execute trades, and it never guesses a number it cannot cite." | 畫面回到 CLI 輸出或標註「research, not trading」。 |
| 2:50–2:55 | "The code is open — askching on GitHub. Thank you." | 畫面顯示 repo URL（`https://github.com/Chonwai/AskChing_Agent`）。微笑收尾。 |

**收尾畫面：** repo URL 停留到最後一幀（2:55）。

---

## 5. 錄影路徑對照

| 用途 | 指令 | 說明 |
| --- | --- | --- |
| **Rehearsal** | `pnpm demo`（DEMO_LIVE=0） | fixture 資料；快速練習逐字稿與指令節奏，**不可**錄製為正式內容 |
| **正式錄影** | `pnpm demo:live`（DEMO_LIVE=1，需 `GRAPH_API_KEY`） | live Graph 資料；搭配 `pnpm askching` 展示真實 Grok 回覆 |
| Live smoke 檢查 | `pnpm live:smoke` | 開錄前確認三源可達、憑證有效 |

**正式錄影前的強制順序：**
1. `pnpm build && pnpm test && pnpm eval`（綠燈）
2. `pnpm live:smoke`（三源可達）
3. `pnpm demo`（fixture）rehearsal ≥ 3 次
4. 開錄 → 每段對錶 → 失敗即停、重錄該段

---

## 6. 失敗即重錄規則（Fail-stop）

| 狀況 | 動作 |
| --- | --- |
| Grok 回傳非預期 tool（例如沒選 `research_brief`） | 停，改 prompt 措辭後重錄 |
| live gateway 逾時 / 401 | 停，檢查 `GRAPH_API_KEY` 與 subgraph index 狀態，重錄 |
| 結果出現 fixture 標籤（DEMO_LIVE=0 字樣） | 停，確認用 `pnpm demo:live`，重錄 |
| 畫面出現 `.env` / API key | 停，關閉該視窗，重錄 |
| 任一段超時 > 10 秒 | 停，重新排時間或縮短該段 |

> 任何時候不可把 fixture 輸出當 live 呈現 — 這是 spec 的硬性規則。
