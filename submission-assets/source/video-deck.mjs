import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const workspaceDir = path.resolve(
  process.env.WORKSPACE_DIR ?? path.join(import.meta.dirname, "../.."),
);
const runtimeModules = process.env.RUNTIME_NODE_MODULES;
const tmpDir = path.resolve(
  process.env.TMP_DIR ?? path.join(workspaceDir, ".tmp/askching-video-deck"),
);

if (!runtimeModules || !path.isAbsolute(runtimeModules)) {
  throw new Error("RUNTIME_NODE_MODULES must be an absolute path");
}

const artifactToolUrl = pathToFileURL(
  path.join(runtimeModules, "@oai/artifact-tool/dist/artifact_tool.mjs"),
).href;
const { Presentation, PresentationFile } = await import(artifactToolUrl);

const SLIDE_W = 1280;
const SLIDE_H = 720;
const COLORS = {
  bg: "#05070A",
  bgDeep: "#020304",
  panel: "#0A100E",
  panel2: "#0D1713",
  green: "#3DF59A",
  cyan: "#35D6FF",
  magenta: "#FF5AA0",
  text: "#DCF3E5",
  muted: "#8AA79A",
  faint: "#5C7368",
  border: "#1D2B24",
  warning: "#FFC857",
};
const BODY_FONT = "Arial";
const MONO_FONT = "Courier New";

const asset = (name) => path.join(workspaceDir, "submission-assets", name);
const [logo, cover, toolCalling, yieldResults, citationsRisks] = await Promise.all(
  [
    "askching-logo-512.png",
    "askching-cover-1600x900.png",
    "01-tool-calling-1600x900.png",
    "02-yield-results-1600x900.png",
    "03-citations-risks-1600x900.png",
  ].map((name) => fs.readFile(asset(name))),
);

await fs.mkdir(tmpDir, { recursive: true });

const presentation = Presentation.create({
  slideSize: { width: SLIDE_W, height: SLIDE_H },
});

function addRect(slide, left, top, width, height, fill, line = "none", radius = 0) {
  return slide.shapes.add({
    geometry: radius ? "roundRect" : "rect",
    position: { left, top, width, height },
    fill,
    line:
      line === "none"
        ? { fill: "none", width: 0 }
        : { style: "solid", fill: line, width: 1 },
    ...(radius ? { borderRadius: radius } : {}),
  });
}

function addText(
  slide,
  text,
  left,
  top,
  width,
  height,
  {
    size = 24,
    color = COLORS.text,
    bold = false,
    font = BODY_FONT,
    align = "left",
    valign = "top",
    lineSpacing = 1.05,
    insets = { left: 0, right: 0, top: 0, bottom: 0 },
  } = {},
) {
  const shape = slide.shapes.add({
    geometry: "textbox",
    position: { left, top, width, height },
    fill: "none",
    line: { fill: "none", width: 0 },
  });
  shape.text = text;
  shape.text.style = {
    typeface: font,
    fontSize: size,
    color,
    bold,
    alignment: align,
    verticalAlignment: valign,
    lineSpacing,
    autoFit: "shrinkText",
    insets,
  };
  return shape;
}

function addRule(slide, left, top, width, color = COLORS.border, thickness = 1) {
  return slide.shapes.add({
    geometry: "line",
    position: { left, top, width, height: 0 },
    fill: "none",
    line: { style: "solid", fill: color, width: thickness },
  });
}

function addBackground(slide) {
  slide.background.fill = COLORS.bg;
  for (let x = 0; x <= SLIDE_W; x += 96) {
    const line = slide.shapes.add({
      geometry: "line",
      position: { left: x, top: 0, width: 0, height: SLIDE_H },
      fill: "none",
      line: { style: "solid", fill: "#0D1817", width: 0.5 },
    });
    line.sendToBack();
  }
  for (let y = 0; y <= SLIDE_H; y += 96) {
    const line = slide.shapes.add({
      geometry: "line",
      position: { left: 0, top: y, width: SLIDE_W, height: 0 },
      fill: "none",
      line: { style: "solid", fill: "#0D1817", width: 0.5 },
    });
    line.sendToBack();
  }
}

function addTitle(slide, title, section, subtitle) {
  addText(slide, section.toUpperCase(), 64, 38, 500, 28, {
    size: 14,
    color: COLORS.cyan,
    bold: true,
    font: MONO_FONT,
  });
  addText(slide, title, 64, 72, 1138, 70, {
    size: 42,
    color: COLORS.text,
    bold: true,
  });
  if (subtitle) {
    addText(slide, subtitle, 66, 136, 1060, 42, {
      size: 19,
      color: COLORS.muted,
    });
  }
}

function addFooter(slide, index) {
  addRule(slide, 64, 676, 1152, COLORS.border, 1);
  addText(slide, "ASKCHING · ETHONLINE 2026", 64, 686, 420, 20, {
    size: 10,
    color: COLORS.faint,
    font: MONO_FONT,
  });
  addText(slide, String(index).padStart(2, "0"), 1160, 686, 56, 20, {
    size: 10,
    color: COLORS.cyan,
    font: MONO_FONT,
    align: "right",
  });
}

function addSpeakerNotes(slide, narration) {
  slide.speakerNotes.textFrame.setText(narration);
  slide.speakerNotes.setVisible(true);
}

function addImage(slide, bytes, alt, left, top, width, height, fit = "contain") {
  return slide.images.add({
    blob: new Uint8Array(bytes),
    contentType: "image/png",
    alt,
    fit,
    position: { left, top, width, height },
  });
}

function addImageFrame(slide, bytes, alt, left, top, width, height) {
  addRect(slide, left - 2, top - 2, width + 4, height + 4, COLORS.bgDeep, COLORS.border, 12);
  return addImage(slide, bytes, alt, left, top, width, height, "contain");
}

// Slide 1 — cover
{
  const slide = presentation.slides.add();
  slide.background.fill = COLORS.bg;
  addImage(slide, cover, "AskChing Terminal Proof cover", 0, 0, SLIDE_W, SLIDE_H, "cover");
  addRect(slide, 52, 636, 1176, 48, COLORS.bgDeep, COLORS.border, 8);
  addText(slide, "ONE QUESTION · MULTIPLE LIVE SUBGRAPHS · EVERY NUMBER CITED", 76, 648, 1128, 26, {
    size: 17,
    color: COLORS.green,
    bold: true,
    font: MONO_FONT,
    align: "center",
    valign: "middle",
  });
  addSpeakerNotes(
    slide,
    "[0:00–0:15] AskChing turns a natural-language DeFi question into a cited answer across multiple live subgraphs. The promise is simple: one question, multiple live sources, and every number carries its evidence. AskChing is research software built for ETHOnline 2026.",
  );
}

// Slide 2 — problem
{
  const slide = presentation.slides.add();
  addBackground(slide);
  addTitle(slide, "A DeFi number without evidence is impossible to trust", "01 / Problem");

  addText(slide, "“USDC APY is 4.2%”", 72, 198, 480, 64, {
    size: 38,
    color: COLORS.warning,
    bold: true,
  });
  addText(slide, "Which protocol? Which block? Which definition? When was it observed?", 74, 272, 470, 90, {
    size: 23,
    color: COLORS.muted,
  });
  addText(slide, "UNSUPPORTED", 74, 394, 300, 34, {
    size: 18,
    color: COLORS.magenta,
    bold: true,
    font: MONO_FONT,
  });
  addRule(slide, 566, 194, 0, COLORS.border, 1);

  addText(slide, "AskChing requires", 642, 188, 430, 38, {
    size: 18,
    color: COLORS.cyan,
    bold: true,
    font: MONO_FONT,
  });
  const proofRows = [
    ["SUBGRAPH ID", "where the value came from"],
    ["BLOCK", "which chain state it reflects"],
    ["TIMESTAMP", "when the source observed it"],
    ["QUERY HASH", "which query produced it"],
  ];
  proofRows.forEach(([label, desc], i) => {
    const y = 244 + i * 78;
    addText(slide, label, 642, y, 230, 30, {
      size: 18,
      color: COLORS.green,
      bold: true,
      font: MONO_FONT,
    });
    addText(slide, desc, 872, y, 320, 32, {
      size: 18,
      color: COLORS.text,
    });
    addRule(slide, 642, y + 48, 550, COLORS.border, 1);
  });
  addText(slide, "Evidence travels with the number.", 642, 576, 550, 42, {
    size: 25,
    color: COLORS.text,
    bold: true,
  });
  addFooter(slide, 2);
  addSpeakerNotes(
    slide,
    "[0:15–0:35] Ask an AI which lending market has the best USDC rate and it may give you one confident number. But without the protocol, block, definition, or observation time, that number is difficult to trust. AskChing attaches the evidence to each figure: its subgraph, block, timestamp, and query hash.",
  );
}

// Slide 3 — architecture
{
  const slide = presentation.slides.add();
  addBackground(slide);
  addTitle(slide, "One MCP research layer connects agents to live subgraphs", "02 / Architecture");

  const nodes = [
    { x: 64, w: 226, label: "ANY MCP CLIENT", detail: "Claude · Cursor · VS Code\nCodex · Gemini · ChatGPT", color: COLORS.cyan },
    { x: 350, w: 244, label: "ASKCHING", detail: "7 tools\nnormalization + evidence gates", color: COLORS.green },
    { x: 654, w: 244, label: "THE GRAPH", detail: "Gateway\nMessari subgraph schemas", color: COLORS.cyan },
    { x: 958, w: 258, label: "6 LIVE SOURCES", detail: "4 lending + 2 DEX\nEthereum mainnet", color: COLORS.green },
  ];
  nodes.forEach((node, i) => {
    addRect(slide, node.x, 244, node.w, 170, COLORS.panel, node.color, 12);
    addText(slide, node.label, node.x + 18, 266, node.w - 36, 32, {
      size: 18,
      color: node.color,
      bold: true,
      font: MONO_FONT,
      align: "center",
    });
    addText(slide, node.detail, node.x + 18, 316, node.w - 36, 72, {
      size: 17,
      color: COLORS.text,
      align: "center",
      valign: "middle",
    });
    if (i < nodes.length - 1) {
      addText(slide, "›", node.x + node.w + 16, 300, 36, 54, {
        size: 40,
        color: COLORS.faint,
        font: MONO_FONT,
        align: "center",
      });
    }
  });

  addRect(slide, 350, 458, 548, 90, COLORS.bgDeep, COLORS.border, 10);
  addText(slide, "GROK DEMO CLI", 372, 478, 190, 26, {
    size: 16,
    color: COLORS.magenta,
    bold: true,
    font: MONO_FONT,
  });
  addText(slide, "Grok interprets the question and selects an AskChing tool.", 568, 474, 306, 50, {
    size: 17,
    color: COLORS.muted,
  });
  addText(slide, "The MCP server remains model-independent.", 350, 582, 548, 34, {
    size: 22,
    color: COLORS.green,
    bold: true,
    align: "center",
  });
  addImage(slide, logo, "AskChing logo", 1080, 500, 96, 96, "contain");
  addFooter(slide, 3);
  addSpeakerNotes(
    slide,
    "[0:35–0:55] AskChing is a model-independent MCP server. Any compatible client can call the same seven tools. For our featured CLI demo, Grok interprets the question, selects a tool, and explains the cited result. AskChing then fans out through The Graph Gateway to four lending and two DEX subgraphs on Ethereum mainnet.",
  );
}

// Slide 4 — live demo cue
{
  const slide = presentation.slides.add();
  addBackground(slide);
  addTitle(slide, "Live comparison: one question, three cited markets", "03 / Demo", "Switch to the deployed app after reading the prompt");

  addRect(slide, 64, 196, 500, 360, COLORS.panel, COLORS.cyan, 14);
  addText(slide, "> compare_markets", 90, 224, 420, 30, {
    size: 17,
    color: COLORS.magenta,
    bold: true,
    font: MONO_FONT,
  });
  addText(
    slide,
    "Compare live USDC supply APY across Aave V3, Compound V3, and Spark Lend right now. Rank the results, cite each source, and state the as-of time.",
    90,
    280,
    420,
    176,
    { size: 25, color: COLORS.text, font: MONO_FONT, lineSpacing: 1.15 },
  );
  addRect(slide, 90, 486, 422, 44, COLORS.bgDeep, COLORS.green, 8);
  addText(slide, "▶ SWITCH TO LIVE APP", 106, 496, 390, 24, {
    size: 17,
    color: COLORS.green,
    bold: true,
    font: MONO_FONT,
    align: "center",
    valign: "middle",
  });

  addImageFrame(slide, toolCalling, "AskChing Grok tool-calling CLI", 618, 196, 598, 336);
  addText(slide, "Point out", 620, 556, 130, 26, {
    size: 14,
    color: COLORS.cyan,
    bold: true,
    font: MONO_FONT,
  });
  addText(slide, "rank · asOf · subgraph ID · block · query hash", 744, 552, 472, 34, {
    size: 17,
    color: COLORS.text,
    font: MONO_FONT,
  });
  addFooter(slide, 4);
  addSpeakerNotes(
    slide,
    "[0:55–1:45] Here is the live question. Compare USDC supply APY across Aave V3, Compound V3, and Spark Lend, rank the result, and cite every source. [SWITCH TO LIVE APP.] Show the selected tool and the three-source fan-out. Then point to the ranking, the as-of time, and one citation with its subgraph ID, block, and query hash. [RETURN TO SLIDES. Source: live AskChing MCP endpoint.]",
  );
}

// Slide 5 — evidence rules
{
  const slide = presentation.slides.add();
  addBackground(slide);
  addTitle(slide, "AskChing reports gaps instead of inventing evidence", "04 / Trust");

  addText(slide, "≥ 2", 66, 202, 170, 78, {
    size: 58,
    color: COLORS.green,
    bold: true,
    font: MONO_FONT,
  });
  addText(slide, "independently cited sources\nor no quantitative comparison", 66, 286, 444, 92, {
    size: 24,
    color: COLORS.text,
    bold: true,
  });
  addRule(slide, 66, 408, 444, COLORS.border, 1);
  addText(slide, "MISSING HISTORY", 66, 436, 320, 28, {
    size: 16,
    color: COLORS.warning,
    bold: true,
    font: MONO_FONT,
  });
  addText(slide, "The answer carries an explicit gap. A spot value never pretends to be a trend.", 66, 476, 444, 92, {
    size: 23,
    color: COLORS.muted,
  });

  addImageFrame(slide, citationsRisks, "AskChing citation and risk evidence", 560, 190, 656, 369);
  addText(slide, "source ID · deployment · block · timestamp · query hash", 560, 584, 656, 30, {
    size: 15,
    color: COLORS.cyan,
    font: MONO_FONT,
    align: "center",
  });
  addFooter(slide, 5);
  addSpeakerNotes(
    slide,
    "[1:45–2:15] The trust rule is enforced in code. A quantitative comparison needs at least two independently cited sources. If only one survives, AskChing returns no comparison. Missing historical coverage also becomes an explicit gap, so a current snapshot never masquerades as a seven-day trend. This behavior matters more than producing an answer at any cost.",
  );
}

// Slide 6 — tool surface
{
  const slide = presentation.slides.add();
  addBackground(slide);
  addTitle(slide, "Seven tools cover spot research, history, and yield discovery", "05 / Research");

  const tools = [
    ["compare_markets", "rank comparable metrics"],
    ["research_brief", "summarize cited findings"],
    ["risk_scan", "peer-relative spot signals"],
    ["analyze_markets", "explain calculations and confidence"],
    ["analyze_trends", "7d / 30d cited daily history"],
    ["discover_yields", "separate lending and DEX LP rankings"],
    ["get_info", "describe capabilities and examples"],
  ];
  tools.forEach(([name, detail], i) => {
    const y = 190 + i * 58;
    addText(slide, name, 66, y, 250, 28, {
      size: 16,
      color: i === 5 ? COLORS.magenta : COLORS.green,
      bold: true,
      font: MONO_FONT,
    });
    addText(slide, detail, 322, y, 310, 28, {
      size: 16,
      color: COLORS.text,
    });
    addRule(slide, 66, y + 38, 566, COLORS.border, 1);
  });

  addImageFrame(slide, yieldResults, "Separate lending and DEX yield rankings", 674, 184, 542, 305);
  addRect(slide, 674, 520, 542, 84, COLORS.panel, COLORS.cyan, 10);
  addText(slide, "LENDING SUPPLY APY", 692, 540, 230, 24, {
    size: 14,
    color: COLORS.cyan,
    bold: true,
    font: MONO_FONT,
    align: "center",
  });
  addText(slide, "≠", 922, 536, 46, 32, {
    size: 25,
    color: COLORS.warning,
    bold: true,
    font: MONO_FONT,
    align: "center",
  });
  addText(slide, "HISTORICAL LP FEE APR", 970, 540, 226, 24, {
    size: 14,
    color: COLORS.cyan,
    bold: true,
    font: MONO_FONT,
    align: "center",
  });
  addFooter(slide, 6);
  addSpeakerNotes(
    slide,
    "[2:15–2:45] The project now exposes seven MCP tools. It can compare current markets, create research briefs, scan peer-relative risk, explain calculations, and analyze cited daily history over seven or thirty days. Yield discovery covers lending, Uniswap V3, and Curve while keeping current lending APY separate from historical LP fee APR because they describe different products and risks.",
  );
}

// Slide 7 — close
{
  const slide = presentation.slides.add();
  addBackground(slide);
  addImage(slide, logo, "AskChing logo", 74, 74, 116, 116, "contain");
  addText(slide, "One evidence layer for many agents", 222, 78, 930, 64, {
    size: 42,
    color: COLORS.text,
    bold: true,
  });
  addText(slide, "AskChing would rather report a gap than invent a number.", 224, 146, 900, 38, {
    size: 22,
    color: COLORS.green,
    bold: true,
  });

  addText(slide, "REMOTE MCP", 76, 252, 220, 28, {
    size: 15,
    color: COLORS.cyan,
    bold: true,
    font: MONO_FONT,
  });
  addRect(slide, 76, 292, 1128, 72, COLORS.bgDeep, COLORS.green, 10);
  addText(slide, "https://ask-ching-agent.vercel.app/api/mcp", 104, 312, 1072, 34, {
    size: 25,
    color: COLORS.green,
    bold: true,
    font: MONO_FONT,
    align: "center",
    valign: "middle",
  });

  addText(slide, "COMPATIBLE CLIENTS", 76, 412, 260, 28, {
    size: 15,
    color: COLORS.cyan,
    bold: true,
    font: MONO_FONT,
  });
  addText(slide, "Claude   Cursor   VS Code   Codex   Gemini   ChatGPT", 76, 452, 1128, 42, {
    size: 23,
    color: COLORS.text,
    font: MONO_FONT,
    align: "center",
  });

  addText(slide, "PUBLIC CODE", 76, 532, 220, 28, {
    size: 15,
    color: COLORS.cyan,
    bold: true,
    font: MONO_FONT,
  });
  addText(slide, "github.com/Chonwai/AskChing_Agent", 76, 572, 800, 40, {
    size: 23,
    color: COLORS.muted,
    font: MONO_FONT,
  });
  addText(slide, "GROK CLI · FEATURED ORCHESTRATION DEMO", 864, 576, 340, 24, {
    size: 12,
    color: COLORS.magenta,
    bold: true,
    font: MONO_FONT,
    align: "right",
  });
  addFooter(slide, 7);
  addSpeakerNotes(
    slide,
    "[2:45–3:15] AskChing exposes one remote MCP endpoint that compatible agents can call directly. Our Grok CLI demonstrates the orchestration path, but the research layer stays model-independent. The Graph supplies the live, verifiable market history, and AskChing adds normalization, evidence gates, and transparent analysis. The code is public. AskChing would rather report a gap than invent a number. Thank you.",
  );
}

const candidatePath = path.join(tmpDir, "candidate.pptx");
await (await PresentationFile.exportPptx(presentation)).save(candidatePath);

for (let i = 0; i < presentation.slides.items.length; i += 1) {
  const slide = presentation.slides.items[i];
  const preview = await presentation.export({ slide, format: "png", scale: 1 });
  await fs.writeFile(
    path.join(tmpDir, `slide-${i + 1}.png`),
    new Uint8Array(await preview.arrayBuffer()),
  );
  const layout = await slide.export({ format: "layout" });
  await fs.writeFile(path.join(tmpDir, `slide-${i + 1}.layout.json`), await layout.text());
}

console.log(
  JSON.stringify({ candidatePath, slides: presentation.slides.items.length, tmpDir }, null, 2),
);
