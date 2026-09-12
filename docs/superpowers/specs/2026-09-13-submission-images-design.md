# AskChing Submission Images — Design

Date: 2026-09-13  
Status: approved direction, pending asset generation

## Goal

Create a coherent, upload-ready image set for the ETHOnline submission that presents AskChing as a credible developer tool. Every product claim shown in a screenshot must match verified behavior in the repository and the 2026-09-12 live smoke run.

## Direction: Terminal Proof

Use a developer-first terminal aesthetic: near-black background, cyan primary accent, cool gray secondary text, crisp monospace details, and restrained connected-node graphics. The work should feel technical and trustworthy rather than mystical, playful, or like a trading product.

## Deliverables

Save final PNG files under `submission-assets/`:

1. `askching-logo-512.png` — 512×512 square logo. A bold cyan terminal prompt mark with a subtle evidence-node motif. It must remain recognizable at small sizes and contain no tiny copy.
2. `askching-cover-1600x900.png` — 16:9 cover. Exact primary text: “AskChing”. Exact tagline: “Ask DeFi. Verify every answer.” Include a compact trace: `discover_yields → 6 live sources → citations verified`.
3. `01-tool-calling-1600x900.png` — natural-language USDC yield question followed by Grok selecting `discover_yields`.
4. `02-yield-results-1600x900.png` — separate lending APY and DEX LP historical fee-APR rankings. Never imply that the two categories are directly equivalent.
5. `03-citations-risks-1600x900.png` — formula, UTC window, exact-source citation cues, risks, and `transaction: none`.

## Content constraints

- Represent only Ethereum mainnet coverage: Aave V3, Compound V3, Spark Lend, Aave V2, Uniswap V3, and Curve.
- State or visually imply that DEX LP fee APR is historical and excludes incentives, gas, and compounding.
- Keep citations readable enough to demonstrate provenance without filling the canvas with raw identifiers.
- Do not use exchange/trading imagery, price charts, wallets, returns promises, or transaction buttons.
- Do not fabricate a web dashboard. Screenshot compositions may polish the real CLI output, but their text and product behavior must remain factual.
- Avoid third-party brand logos; protocol names may appear as plain text.

## Acceptance checks

- Logo is exactly 512×512; all other assets are exactly 1600×900.
- “AskChing” is spelled consistently.
- Cover text is legible at submission-card size.
- The three screenshots tell a sequence: ask → compare → verify.
- No credential, API key, private URL, or unsupported numerical claim appears.
- Final files are visually inspected before handoff.
