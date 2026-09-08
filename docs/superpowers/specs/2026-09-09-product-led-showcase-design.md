# AskChing Product-Led Showcase Design

Date: 2026-09-09
Status: Approved direction; ready for recording-script implementation

## Goal

Create a 2.5–3 minute, human-narrated ETHOnline demo that makes AskChing understandable to a judge in the first ten seconds. Lead with the research analyst's outcome, then reveal only enough architecture to prove that the answer came from Grok reasoning over cited, live subgraph data.

## Audience and promise

The primary viewer is a hackathon judge evaluating meaningful use of The Graph and Grok. The central promise is:

> Ask one DeFi research question and get a normalized, cross-protocol answer whose numbers can be traced back to live subgraphs.

The demo must not imply trading execution, historical analysis that is not implemented, or guarantees about yield or risk.

## Narrative

### 1. Problem and product — 0:00–0:20

Open on the analyst problem: comparable lending rates live in separate subgraphs, use protocol-specific representations, and are difficult to verify quickly. Introduce AskChing as a cited research agent, not another subgraph search interface.

### 2. Live research workflow — 0:20–1:55

Run one natural-language request through the Grok CLI:

> Compare live USDC supply APY across Aave V3, Compound V3, and Spark Lend. Rank them, cite every source, and state the as-of time.

Show that Grok chooses the AskChing comparison tool. Keep the resulting ranked values, three source identifiers, block numbers, and `asOf` time visible long enough to read. Explain that AskChing fans out to three live The Graph subgraphs and ranks only observations sharing the same metric definition and unit.

### 3. Trust behavior — 1:55–2:25

Ask for unusual seven-day USDC risk. Show the short `risk_scan` response and explain that the current implementation reports peer-relative spot signals while explicitly identifying the historical time-series gap. The point is not the missing feature; it is that AskChing refuses to fabricate unsupported history.

### 4. Differentiation and close — 2:25–2:55

Show a compact architecture view or README section while stating the distinction: the official Subgraph MCP helps discover and query individual subgraphs; AskChing adds multi-subgraph fan-out, comparable normalization, evidence gates, and Grok synthesis. Close on the public repository and the research-not-trading scope.

## Recording behavior

- Use live Graph data for the centerpiece and visibly label it live.
- Use a real Grok response for the natural-language interaction.
- Use human narration and record at 720p or higher.
- Keep credentials and `.env` outside the capture area.
- Rehearse with `pnpm demo` in fixture mode; record with live commands only after a successful smoke check.
- If a gateway or model fails during recording, stop and retry. Do not present fixture output as live.

## Deliverables

1. A word-for-word narration and screen-action run script.
2. Three current demo prompts covering comparison, evidence, and honest risk behavior.
3. Ready-to-copy ETHGlobal title, short description, long description, technology list, repository field, and video placeholder.
4. A pre-recording and pre-submission checklist.

## Acceptance criteria

- A viewer understands the product and target user within ten seconds.
- The main result contains three live sources, ranked comparable values, blocks, and an `asOf` time.
- Grok's role and The Graph's role are both explicit.
- The risk segment clearly distinguishes spot evidence signals from unavailable history.
- The recording is 2–4 minutes, at least 720p, and human narrated.
- No credential, unsupported claim, trading action, or invented citation appears.
