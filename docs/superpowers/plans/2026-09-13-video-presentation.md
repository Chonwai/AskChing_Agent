# AskChing Video Presentation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and validate an editable seven-slide AskChing PowerPoint for a 3–4 minute narrated ETHOnline video with live-demo cues.

**Architecture:** A JavaScript ES module uses `@oai/artifact-tool` to build one 16:9 presentation from the approved Terminal Proof palette, existing logo, and existing submission screenshots. The script attaches timed speaker notes, exports a draft, and creates slide previews; the presentation finalizer produces a separately named checked PPTX.

**Tech Stack:** JavaScript ES modules, `@oai/artifact-tool`, bundled presentation runtime, bundled LibreOffice, existing PNG brand assets, PowerPoint `.pptx`.

## Global Constraints

- Use only implemented claims from the current README, MCP registration, source registries, and demo prompts.
- Show seven tools, four live lending sources, two live DEX sources, and Ethereum mainnet only.
- Present Grok as the optional demo CLI orchestrator and AskChing as a model-independent MCP server.
- Use the approved near-black Terminal Proof identity with green, cyan, and restrained magenta.
- Keep text readable in a 1080p video and keep total narration under four minutes.
- Preserve all existing untracked files under `public/`.
- Commit and push each meaningful artifact checkpoint without squashing.

---

### Task 1: Build source and first draft

**Files:**
- Create: `submission-assets/source/video-deck.mjs`
- Create: `.tmp/askching-video-deck/candidate.pptx`
- Create: `.tmp/askching-video-deck/slide-1.png` through `slide-7.png`

**Interfaces:**
- Consumes: `submission-assets/askching-logo-512.png`, `submission-assets/01-tool-calling-1600x900.png`, `submission-assets/02-yield-results-1600x900.png`, `submission-assets/03-citations-risks-1600x900.png`.
- Produces: an editable `Presentation` serialized to `candidate.pptx`, plus seven preview PNGs and speaker notes.

- [ ] **Step 1: Load the bundled workspace runtime**

Run the workspace dependency resolver and record the returned Node, module, binary, Python, and LibreOffice paths. Do not install presentation dependencies into the repository.

- [ ] **Step 2: Mark the artifact operation**

Run exactly once from the presentation skill directory:

```bash
node container_tools/mark_artifact_operation_started.mjs --operation-kind create --expected-output-count 1 --output-format pptx
```

Expected: successful operation marker with one expected PowerPoint output.

- [ ] **Step 3: Author the deck generator**

Create `submission-assets/source/video-deck.mjs` with these fixed interfaces:

```js
const SLIDE_W = 1280;
const SLIDE_H = 720;
const COLORS = {
  bg: "#05070A",
  panel: "#0A100E",
  green: "#3DF59A",
  cyan: "#35D6FF",
  magenta: "#FF5AA0",
  text: "#DCF3E5",
  muted: "#8AA79A",
  border: "#1D2B24",
  warning: "#FFC857"
};

function addTitle(slide, title, section) {}
function addFooter(slide, index) {}
function addSpeakerNotes(slide, narration) {
  slide.speakerNotes.textFrame.setText(narration);
}
```

The module must build seven slides in the approved order, use large text, keep each slide to one visual composition, add the app-switch cue on slide 4, attach timed narration, export `.tmp/askching-video-deck/candidate.pptx`, and export one PNG preview per slide.

- [ ] **Step 4: Generate the first draft**

Run the module with the bundled Node runtime and `SKILL_DIR`/`TMP_DIR` as absolute environment values.

Expected: one draft PPTX and seven 1280×720 preview PNGs.

- [ ] **Step 5: Commit the reproducible source**

```bash
git add submission-assets/source/video-deck.mjs
git commit -m "feat(presentation): add AskChing video deck source"
git push origin main
```

### Task 2: Inspect and refine every slide

**Files:**
- Modify: `submission-assets/source/video-deck.mjs`
- Regenerate: `.tmp/askching-video-deck/candidate.pptx`
- Regenerate: `.tmp/askching-video-deck/slide-1.png` through `slide-7.png`

**Interfaces:**
- Consumes: Task 1 generator and preview images.
- Produces: visually corrected slides with no overflow, collisions, distorted images, unsupported claims, or unreadable evidence text.

- [ ] **Step 1: Create and inspect a montage**

Use the bundled montage utility on all seven previews. Inspect the narrative rhythm, title hierarchy, color consistency, image cropping, and live-demo cue.

- [ ] **Step 2: Inspect detailed slides individually**

Open slides 3, 4, 5, and 6 at original detail because they contain the architecture, app cue, evidence fields, and tool coverage.

- [ ] **Step 3: Correct the generator**

Adjust layout or wording in `video-deck.mjs`. Keep the following factual copy unchanged in meaning:

```text
Seven MCP tools: six research tools plus get_info
Four lending subgraphs and two DEX subgraphs on Ethereum mainnet
Grok orchestrates the demo CLI; other MCP clients call AskChing directly
Fewer than two cited sources causes a fail-closed comparison
Lending supply APY and historical LP fee APR remain separate rankings
```

- [ ] **Step 4: Regenerate and re-inspect**

Expected: every slide reads clearly at montage scale; screenshots remain legible at full scale; no object crosses the slide boundary.

- [ ] **Step 5: Commit the visual refinement**

```bash
git add submission-assets/source/video-deck.mjs
git commit -m "fix(presentation): refine video slide readability"
git push origin main
```

### Task 3: Finalize and deliver the PowerPoint

**Files:**
- Create: `submission-assets/AskChing-ETHOnline-Video-Deck.pptx`
- Create: `.tmp/askching-video-deck/finalization-report.json`

**Interfaces:**
- Consumes: visually approved candidate deck from Task 2.
- Produces: final editable PowerPoint with seven slides and speaker notes.

- [ ] **Step 1: Run presentation finalization**

Use the bundled finalizer with a font policy listing the chosen design fonts. Input is `.tmp/askching-video-deck/candidate.pptx`; output is `submission-assets/AskChing-ETHOnline-Video-Deck.pptx`; report stays in `.tmp/askching-video-deck/`.

Expected: finalizer passes without overflow, out-of-bounds objects, font substitution warnings that affect readability, or missing assets.

- [ ] **Step 2: Render the final PPTX**

Render the finalized deck with the bundled LibreOffice and presentation rendering tools. Compare its seven slide images to the approved candidate previews.

- [ ] **Step 3: Verify content and secrets**

Confirm exactly seven slides, confirm speaker notes exist on all slides, confirm the endpoint is `https://ask-ching-agent.vercel.app/api/mcp`, and scan extracted text for `GRAPH_API_KEY`, `XAI_API_KEY`, bearer tokens, or `.env` contents.

- [ ] **Step 4: Commit the deliverable**

```bash
git add submission-assets/AskChing-ETHOnline-Video-Deck.pptx
git commit -m "feat(presentation): add ETHOnline video deck"
git push origin main
```

### Task 4: Refresh the durable handoff

**Files:**
- Modify: `HANDOFF.md`

**Interfaces:**
- Consumes: final deck location, final commit, and validation evidence.
- Produces: a current teammate handoff describing how to record with the deck.

- [ ] **Step 1: Add the presentation checkpoint**

Record the deck path, seven-slide count, Terminal Proof style, speaker-note coverage, live-demo cue on slide 4, validation results, current commit, and the next action: record the narrated video while switching to the live app for the comparison.

- [ ] **Step 2: Verify repository state**

Run:

```bash
git diff --check
git status --short --branch
```

Expected: no tracked changes after the handoff commit; existing user-owned untracked `public/` images remain untouched.

- [ ] **Step 3: Commit and push the handoff**

```bash
git add HANDOFF.md
git commit -m "docs(handoff): record video presentation delivery"
git push origin main
```

