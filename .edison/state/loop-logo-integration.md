# Loop State — Logo 整合進 Landing Page + Gemini 顯示

- **Task slug**: `logo-integration`
- **Goal (Done Contract)**: 把 johnku 的 `askching-logo-512.png` 整合到 landing page（視覺標誌 + favicon + OG image），讓 Gemini Spark 等外部平台能顯示 logo。gates 全綠、多步 commit、自動部署。
- **Quality Mode**: `strict`（threshold 93）
- **Depth**: L3

## 已知事實

- Logo：`submission-assets/askching-logo-512.png`（512×512 PNG，黑底 + cyan `>_` terminal mark + 3 evidence nodes）
- 現有 landing page：`public/index.html`（科幻 Matrix 版，無 logo/favicon）
- Gemini Spark 顯示 MCP connector 時抓 favicon / OG image — 目前沒有，所以顯示空白
- 需要：複製 logo 到 `public/`、加 `<link rel="icon">`、加 OG meta tags、H1 旁加 logo 圖

## 執行步驟

1. 複製 logo → `public/askching-logo.png`
2. landing page：H1 旁加 logo img + favicon link + OG image meta
3. 驗證 Vercel 伺服 logo + 部署
4. 多步 commit

---

## Loop 執行結果（2026-09-13）

### EXECUTE

1. **複製 logo**：`submission-assets/askching-logo-512.png` → `public/askching-logo.png`（Vercel 可伺服）
2. **Landing page 整合**（commit `88777c6`）：
   - `<head>` 加 favicon + apple-touch-icon + manifest + theme-color
   - OG meta tags（title/description/image/type）→ 讓 Gemini Spark 等平台顯示品牌卡片
   - Hero 區新增 logo img（`/askching-logo.png`，cyan glow 邊框，與 Matrix 主題一致）
3. **`public/site.webmanifest`**：品牌名稱/short_name/背景色/icon
4. 補 commit 設計規格與 loop state（`2577396`）

### VERIFY（全部實測）

- ✅ Logo serve：`curl /askching-logo.png` → `200 image/png 159612bytes`
- ✅ Manifest：`curl /site.webmanifest` → 正確 JSON 品牌資訊
- ✅ Landing page：4 處 `askching-logo.png` + `og:image` + `rel="icon"`
- ✅ 瀏覽器：hero 區 `img "AskChing logo"` 顯示在 H1 旁，全部 sections 完整

### Gemini Spark 顯示方式（用戶已知）

Gemini Spark 等外部平台通常抓 **favicon（`/askching-logo.png`）或 OG image（`og:image` meta）** 作為 logo。現在兩個都有了。若 Spark 的快取未即時更新，可稍等或重載。

### 最終狀態

- `public/`：index.html（科幻版）+ askching-logo.png + site.webmanifest
- 全部 push 到 origin/main，自動部署完成
