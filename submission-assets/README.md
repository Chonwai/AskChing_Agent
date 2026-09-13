# AskChing submission assets

Upload these files to the ETHOnline project form:

| Form slot    | File                              | Dimensions |
| ------------ | --------------------------------- | ---------- |
| Logo         | `askching-logo-512.png`           | 512×512    |
| Cover image  | `askching-cover-1600x900.png`     | 1600×900   |
| Screenshot 1 | `01-tool-calling-1600x900.png`    | 1600×900   |
| Screenshot 2 | `02-yield-results-1600x900.png`   | 1600×900   |
| Screenshot 3 | `03-citations-risks-1600x900.png` | 1600×900   |

The screenshot sequence is **ask → compare → verify**. HTML sources are in `source/` so text-heavy frames can be reproduced without image-generation spelling errors.

Screenshot 1 uses the canonical production MCP endpoint: `https://ask-ching-agent.vercel.app/api/mcp`.

The figures shown in screenshots 2–3 come from the verified live `discover_yields` run recorded on 2026-09-12. Lending values are current variable supply APYs at that observation time; DEX values are one-day historical pool-wide fee APR estimates. They are not forecasts or promised returns.

## Image-generation prompts

The logo used a `logo-brand` prompt requesting a centered flat cyan terminal `>_` mark connected to exactly three evidence nodes on near-black, with no text, trading imagery, third-party marks, texture, or watermark.

The cover used an `ads-marketing` prompt with the logo as its style reference and the exact copy `AskChing`, `Ask DeFi. Verify every answer.`, `discover_yields`, `6 live sources`, and `citations verified`. It prohibited invented data, dashboard charts, transaction controls, third-party logos, and additional slogans.
