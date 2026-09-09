# Product-Led Showcase Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce submission-ready AskChing prompts, a 2.5–3 minute human-narrated recording script, and ready-to-copy ETHGlobal project copy centered on the research analyst workflow.

**Architecture:** Keep executable product behavior unchanged. Treat `demos/prompts.md` as the canonical prompt set, `docs/demo-video-script.md` as the recording runbook, and `docs/submission.md` as the platform copy. Guard critical claims and required sections with a lightweight Vitest document contract.

**Tech Stack:** Markdown, Vitest 3, Node.js `fs/promises`, pnpm 9.

## Global Constraints

- Lead with the research analyst's outcome; explain architecture only after the live result.
- The recording target is 2.5–3 minutes, human narrated, and at least 720p.
- The centerpiece uses real Grok plus live Graph data from Aave V3, Compound V3, and Spark Lend.
- Keep `.env` and all credentials outside the capture area.
- Describe `risk_scan` as peer-relative spot evidence with a historical time-series gap.
- Do not imply trading execution, yield guarantees, or unsupported historical analysis.
- Commit each independently useful documentation slice; never squash the history.

---

### Task 1: Canonical three-source demo prompts

**Files:**
- Create: `evals/showcase-contract.test.ts`
- Modify: `demos/prompts.md`

**Interfaces:**
- Consumes: supported protocol identifiers and tool behavior already documented in `skills/askching/SKILL.md`.
- Produces: three copyable prompts used by the recording runbook.

- [ ] **Step 1: Write the failing prompt contract**

Create a Vitest test that reads `demos/prompts.md` and asserts it contains `Aave V3`, `Compound V3`, `Spark Lend`, `compare_markets`, `risk_scan`, `as-of`, and all three locked subgraph IDs. Assert it does not contain `Until risk_scan is implemented`.

- [ ] **Step 2: Run the prompt contract and verify RED**

Run: `pnpm exec vitest run evals/showcase-contract.test.ts`

Expected: FAIL because Spark is absent from the canonical prompt and locked-source table, and the risk section still claims the tool is unimplemented.

- [ ] **Step 3: Rewrite the canonical prompts**

Use these three scenarios:

1. Live comparison: `Compare live USDC supply APY across Aave V3, Compound V3, and Spark Lend. Rank them, cite every source, and state the as-of time.`
2. Evidence follow-up: ask for each result's subgraph ID, block, query hash, observation timestamp, metric definition, and unit without adding unsupported numbers.
3. Honest risk: `Scan Aave V3, Compound V3, and Spark Lend for unusual USDC risk over seven days. Separate supported spot signals from unavailable historical evidence.`

Document the expected tool path and explain that `risk_scan` must report the time-series gap rather than fabricate a trend. Add Spark Lend and its subgraph ID `GbKdmBe4ycCYCQLQSjqGg6UHYoYfbyJyq5WrG35pv1si` to the locked-source table.

- [ ] **Step 4: Run the contract and verify GREEN**

Run: `pnpm exec vitest run evals/showcase-contract.test.ts`

Expected: 1 test passed.

- [ ] **Step 5: Commit**

```bash
git add evals/showcase-contract.test.ts demos/prompts.md
git commit -m "docs(demo): refresh three-source showcase prompts"
```

### Task 2: Human-narrated recording runbook

**Files:**
- Create: `docs/demo-video-script.md`
- Modify: `evals/showcase-contract.test.ts`

**Interfaces:**
- Consumes: the three canonical prompts from Task 1 and commands `pnpm live:smoke`, `pnpm askching`, and `pnpm demo`.
- Produces: a shot-by-shot script John can record without improvising claims.

- [ ] **Step 1: Extend the contract and verify RED**

Read `docs/demo-video-script.md` and assert it contains time markers `0:00`, `0:20`, `1:55`, `2:25`, the commands `pnpm live:smoke` and `pnpm askching`, plus the warnings `human narration`, `720p`, `.env`, and `fixture`.

Run: `pnpm exec vitest run evals/showcase-contract.test.ts`

Expected: FAIL because the recording script does not exist.

- [ ] **Step 2: Write the runbook**

Create a 2.5–3 minute script with five columns: time, screen, action, narration, and pass condition. Include:

- 0:00–0:20: analyst problem and one-sentence AskChing promise.
- 0:20–0:35: pre-recorded successful `pnpm live:smoke` evidence check.
- 0:35–1:55: real Grok comparison using the Task 1 prompt; pause on the ranked result, three citations, blocks, and `asOf`.
- 1:55–2:25: seven-day risk question; explain the supported spot signals and explicit historical gap.
- 2:25–2:55: README architecture/differentiation and public repository close.

Add a preflight checklist: hide `.env`, enlarge terminal text, use 720p or higher, use human narration, close notifications, run `pnpm test`, confirm the live smoke, and keep fixture output clearly labeled during rehearsal. Add a recovery rule: retry failed providers and never relabel fixture output as live.

- [ ] **Step 3: Run the contract and verify GREEN**

Run: `pnpm exec vitest run evals/showcase-contract.test.ts`

Expected: all showcase contract tests pass.

- [ ] **Step 4: Commit**

```bash
git add docs/demo-video-script.md evals/showcase-contract.test.ts
git commit -m "docs(demo): add human-narrated recording runbook"
```

### Task 3: Ready-to-copy ETHGlobal submission package

**Files:**
- Create: `docs/submission.md`
- Modify: `README.md`
- Modify: `evals/showcase-contract.test.ts`

**Interfaces:**
- Consumes: verified project capabilities, public repository URL, and the approved analyst-first narrative.
- Produces: platform-ready copy and discoverable links from the README.

- [ ] **Step 1: Extend the contract and verify RED**

Read `docs/submission.md` and assert it contains the headings `Project title`, `One-line description`, `Full description`, `How it works`, `Built with`, `Repository`, `Video`, and `Final checklist`. Assert the README links to both `docs/submission.md` and `docs/demo-video-script.md`.

Run: `pnpm exec vitest run evals/showcase-contract.test.ts`

Expected: FAIL because the submission package is absent and README has no showcase links.

- [ ] **Step 2: Write exact submission copy**

Use `AskChing` as the title and this one-line description:

> A Grok-powered DeFi research agent that compares live lending markets across The Graph subgraphs and returns normalized answers with citations and as-of timestamps.

The full description must cover the analyst problem, three-source live fan-out, common-unit normalization, evidence gates, Grok tool selection/synthesis, explicit source gaps, and research-not-trading scope. List TypeScript, pnpm, MCP, Grok/xAI, The Graph Gateway, GraphQL, Zod, and Vitest under `Built with`. Use `https://github.com/Chonwai/AskChing_Agent` for `Repository`. For `Video`, instruct the submitter to paste the final unlisted YouTube URL after upload rather than inventing one.

- [ ] **Step 3: Link the package from README**

Add a `Hackathon showcase` section linking to the recording runbook, canonical prompts, and submission package. Keep the existing `Why not just official Subgraph MCP?` explanation intact.

- [ ] **Step 4: Run the contract and verify GREEN**

Run: `pnpm exec vitest run evals/showcase-contract.test.ts`

Expected: all showcase contract tests pass.

- [ ] **Step 5: Commit**

```bash
git add docs/submission.md README.md evals/showcase-contract.test.ts
git commit -m "docs: add ETHGlobal submission package"
```

### Task 4: Final verification and durable handoff

**Files:**
- Modify: `HANDOFF.md`

**Interfaces:**
- Consumes: all deliverables from Tasks 1–3 and current git history.
- Produces: exact verification evidence, open manual actions, and the next safe action.

- [ ] **Step 1: Run complete verification**

Run:

```bash
pnpm test
pnpm build
pnpm eval
git diff --check
```

Expected: all tests and evals pass, all packages build, and no whitespace errors are reported.

- [ ] **Step 2: Update the handoff**

Record the latest implementation commit, exact test/eval totals, the three new artifact paths, and these remaining manual actions: record human narration, upload the unlisted video, paste its URL into the submission form, and submit before the deadline. Do not claim the recording or platform submission is complete.

- [ ] **Step 3: Commit and push**

```bash
git add HANDOFF.md
git commit -m "docs(handoff): checkpoint submission-ready showcase"
git push origin main
```

- [ ] **Step 4: Confirm clean synchronization**

Run: `git status --short && git log -5 --oneline`

Expected: no status output, and the handoff plus three showcase commits appear at the top of history.
