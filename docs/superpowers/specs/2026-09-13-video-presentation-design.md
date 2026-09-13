# AskChing Video Presentation Design

Date: 2026-09-13  
Format: editable 16:9 PowerPoint  
Purpose: narrated ETHOnline project video with short live product demonstrations

## Outcome

Create a seven-slide deck that explains AskChing in about 3–4 minutes while leaving room to switch from the presentation to the deployed app or CLI. The deck must establish the problem, demonstrate the evidence model, explain The Graph's central role, and close with a direct path to the live endpoint and public repository.

## Accuracy contract

- Describe seven MCP tools: six research tools plus `get_info`.
- Describe four verified lending sources and two verified DEX sources on Ethereum mainnet.
- Present Grok as the orchestrator for the demo CLI, not as a requirement for the MCP server.
- Describe AskChing as research software. Do not claim prediction, transaction execution, trading, staking support, or multi-chain coverage.
- Do not embed time-sensitive rates as permanent current claims. Product screenshots may carry their recorded observation dates.
- State that quantitative comparisons require at least two independently cited sources and fail closed otherwise.

## Visual system

Use the approved Terminal Proof identity from the submission assets:

- Near-black background with high-contrast green and cyan evidence accents.
- Magenta only for prompts or controlled emphasis.
- Monospaced typography for tool names, citations, blocks, and endpoint text.
- Existing AskChing logo and product screenshots as the primary visual assets.
- One dominant composition per slide, large text for video readability, and minimal body copy.
- No decorative financial charts that imply unsupported performance data.

## Slide sequence and timing

### 1. AskChing (0:00–0:15)

Position AskChing as cited DeFi research over The Graph. The opening line is: "One question. Multiple live subgraphs. Every number cited."

### 2. The evidence problem (0:15–0:35)

Explain that DeFi market data lives across protocol-specific sources with different definitions and observation times. Contrast an unsupported AI answer with AskChing's required evidence fields: subgraph ID, block, timestamp, and query hash.

### 3. How AskChing works (0:35–0:55)

Show a simple architecture: any MCP client or the Grok demo CLI calls AskChing; AskChing fans out through The Graph Gateway to live subgraphs; the shared layer validates definitions and returns a normalized cited result. Make the model-independent MCP boundary explicit.

### 4. Live comparison demo (0:55–1:45)

Show the canonical USDC comparison prompt and a clear cue to switch to the live app. During the live segment, point out the ranked protocols, `asOf`, subgraph ID, block, and query hash. Return to the deck after the result.

### 5. Evidence rules (1:45–2:15)

Explain two trust behaviors: a comparison with fewer than two cited sources fails closed, and missing historical coverage becomes an explicit gap. Use the existing citation and risk screenshot rather than fabricating a new result.

### 6. Research beyond one comparison (2:15–2:45)

Summarize the seven-tool surface and focus on the additional judge-relevant capabilities: explainable market analysis, cited 7-day or 30-day trends, and USDC yield discovery across lending, Uniswap V3, and Curve. State that lending APY and historical LP fee APR remain separate rankings.

### 7. One evidence layer for many agents (2:45–3:15)

Close on the deployed remote MCP endpoint and public GitHub repository. Show that the same tool server works with compatible clients while the Grok CLI provides the featured orchestration demo. End with: "AskChing would rather report a gap than invent a number."

## Speaker notes

Each slide must include concise narration aligned to the timing above. Notes should sound natural when spoken and must include explicit cues for switching to and returning from the live app. Total scripted narration should remain under four minutes at a normal speaking pace.

## Deliverables

- `submission-assets/AskChing-ETHOnline-Video-Deck.pptx`
- Rendered slide previews for visual inspection
- Reproducible JavaScript source in a private build directory or a clearly marked source directory

## Validation

- Render all slides and inspect them as a montage and individually.
- Check for text overflow, collisions, unreadable citation text, and accidental secret exposure.
- Confirm every factual claim against the current README, tool registration, source registries, and demo prompts.
- Keep the user's existing untracked public images untouched unless deliberately selected as presentation inputs.
