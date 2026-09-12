# AskChing Submission Images Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce five upload-ready Terminal Proof PNG assets that accurately present the live AskChing product.

**Architecture:** Use the built-in image generator for the expressive logo and cover. Build the three text-heavy product frames as deterministic HTML/CSS using verified AskChing copy and live results, then capture them at an exact browser viewport so identifiers and caveats remain accurate.

**Tech Stack:** Built-in image generation, HTML/CSS, in-app browser screenshots, macOS `sips`/`file` validation, Git.

## Global Constraints

- Follow `docs/superpowers/specs/2026-09-13-submission-images-design.md` exactly.
- Save final PNGs in `submission-assets/`; save deterministic screenshot sources in `submission-assets/source/`.
- Logo must be 512×512; cover and screenshots must be 1600×900.
- Use only factual Ethereum mainnet product behavior and verified source/result text.
- Never include credentials, private URLs, third-party logos, transaction controls, or return promises.
- Inspect every final image visually before committing it.
- Commit and push after each completed task; do not squash.

---

### Task 1: Terminal Proof logo

**Files:**
- Create: `submission-assets/askching-logo-512.png`

**Interfaces:**
- Consumes: approved near-black/cyan Terminal Proof direction.
- Produces: square brand mark used as the submission logo.

- [ ] **Step 1: Generate the logo**

Use the built-in image generator with a `logo-brand` prompt: near-black square, bold cyan terminal prompt glyph, subtle three-node evidence motif, crisp geometric edges, centered composition, no small text, no third-party marks, no watermark.

- [ ] **Step 2: Inspect and validate**

Run:

```bash
sips -g pixelWidth -g pixelHeight submission-assets/askching-logo-512.png
```

Expected: `pixelWidth: 512`, `pixelHeight: 512`; visual inspection shows a legible mark at thumbnail size.

- [ ] **Step 3: Commit and push**

```bash
git add submission-assets/askching-logo-512.png
git commit -m "feat(brand): add AskChing submission logo"
git push origin main
```

### Task 2: Terminal Proof cover

**Files:**
- Create: `submission-assets/askching-cover-1600x900.png`

**Interfaces:**
- Consumes: Task 1 visual identity and exact copy from the spec.
- Produces: 16:9 gallery cover.

- [ ] **Step 1: Generate the cover**

Use the built-in image generator with an `ads-marketing` prompt. Exact visible copy: `AskChing`, `Ask DeFi. Verify every answer.`, and `discover_yields → 6 live sources → citations verified`. Keep the composition sparse and readable at card size.

- [ ] **Step 2: Inspect and validate**

Run `sips -g pixelWidth -g pixelHeight submission-assets/askching-cover-1600x900.png` and visually verify exact spelling, copy, hierarchy, and absence of invented UI.

Expected: 1600×900 and all required copy legible.

- [ ] **Step 3: Commit and push**

```bash
git add submission-assets/askching-cover-1600x900.png
git commit -m "feat(brand): add AskChing submission cover"
git push origin main
```

### Task 3: Ask → compare → verify screenshot story

**Files:**
- Create: `submission-assets/source/01-tool-calling.html`
- Create: `submission-assets/source/02-yield-results.html`
- Create: `submission-assets/source/03-citations-risks.html`
- Create: `submission-assets/01-tool-calling-1600x900.png`
- Create: `submission-assets/02-yield-results-1600x900.png`
- Create: `submission-assets/03-citations-risks-1600x900.png`

**Interfaces:**
- Consumes: live deployment URL and verified 2026-09-12 `discover_yields` run recorded in `HANDOFF.md`.
- Produces: three sequential submission screenshots containing deterministic, factual product content.

- [ ] **Step 1: Create deterministic HTML sources**

Each file is a standalone 1600×900 Terminal Proof frame with a near-black canvas, cyan prompt/result accents, readable monospace details, and a small `LIVE · ETHEREUM MAINNET` status. Use these exact story beats:

```text
01: user question → tool trace → discover_yields selected → 6 sources queried
02: Compound V3 leads lending at 4.09%; Uniswap V3 DAI/USDC leads historical LP fee APR at 4.63%; categories remain separate
03: fee APR formula; 2026-09-11 UTC window; six source citations; risk exclusions; transaction: none
```

- [ ] **Step 2: Capture at exact viewport**

Open each source through a local browser surface, set viewport to 1600×900, wait for fonts/layout, and save the screenshot to the matching PNG path.

- [ ] **Step 3: Inspect and validate**

Run:

```bash
for image in submission-assets/0*-1600x900.png; do sips -g pixelWidth -g pixelHeight "$image"; done
```

Expected: all three are 1600×900. Visual inspection confirms the narrative sequence, readable copy, category separation, and no secrets.

- [ ] **Step 4: Commit and push**

```bash
git add submission-assets/source submission-assets/0*-1600x900.png
git commit -m "feat(demo): add AskChing submission screenshots"
git push origin main
```

### Task 4: Final asset manifest and handoff

**Files:**
- Create: `submission-assets/README.md`
- Modify: `HANDOFF.md`

**Interfaces:**
- Consumes: Tasks 1–3 final assets and validation results.
- Produces: upload mapping, reproduction notes, exact commit, and durable handoff.

- [ ] **Step 1: Document upload mapping**

List the logo, cover, and three screenshot paths; identify the optional fourth/fifth screenshot only if later requested. Record that displayed figures are time-stamped historical/live observations rather than promises.

- [ ] **Step 2: Run final checks**

Run dimension checks for all five PNGs, inspect each image, run `git diff --check`, and confirm no asset contains `GRAPH_API_KEY`, `XAI_API_KEY`, or a credential value.

- [ ] **Step 3: Update handoff, commit, and push**

```bash
git add submission-assets/README.md HANDOFF.md
git commit -m "docs(handoff): record submission image assets"
git push origin main
```
