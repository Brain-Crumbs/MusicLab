/**
 * C11.6-ext — Visualization gallery example.
 *
 * Runs a seeded generation and writes a small gallery to artifacts/:
 *   - artifacts/topology.svg        — harmonic chord-space (SVG)
 *   - artifacts/topology.mmd        — harmonic chord-space (Mermaid)
 *   - artifacts/tension-timeline.svg — target vs. actual tension (SVG)
 *   - artifacts/trajectory.mmd      — actual walk through chord-space (Mermaid)
 *   - artifacts/index.html          — HTML gallery embedding the SVG files
 *
 * Run it:
 *   npx tsx examples/generate-visuals.ts
 * Or via npm:
 *   npm run example:visuals
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  createDefaultMvpGenerator,
  chordId,
  MajorKeyTopologyBuilder,
  TopologyGraphDataBuilder,
  TrajectoryGraphDataBuilder,
  TensionTimelineDataBuilder,
  MermaidGraphAdapter,
  MermaidTrajectoryAdapter,
  SvgTopologyRenderer,
  SvgTensionTimelineRenderer,
} from "../src/index.js";

const SEED = 42;
const OUT_DIR = join(new URL(".", import.meta.url).pathname, "../artifacts");

mkdirSync(OUT_DIR, { recursive: true });

// ── Generate a progression ────────────────────────────────────────────────

const generator = createDefaultMvpGenerator({ key: "C", temperature: 0.8, seed: SEED });
const result = generator.generate({ steps: 8, initialChord: chordId("I") });

console.log(`Generated (seed ${SEED}):`);
console.log(`  ${result.chords.join(" - ")}\n`);

// ── Build topology data (static — does not depend on the run) ─────────────

const topology = new MajorKeyTopologyBuilder().build();
const topologyGraphData = new TopologyGraphDataBuilder().build(topology);

// ── Build run-specific data ───────────────────────────────────────────────

const trajectoryGraphData = new TrajectoryGraphDataBuilder().build(result.trace);
const tensionTimelineData = new TensionTimelineDataBuilder().build(result.trace);

// ── Render and write each artifact ───────────────────────────────────────

function write(filename: string, content: string): void {
  const path = join(OUT_DIR, filename);
  writeFileSync(path, content + "\n", "utf8");
  console.log(`  wrote ${path}`);
}

console.log("Writing artifacts:");

write("topology.svg", new SvgTopologyRenderer().render(topologyGraphData));
write("topology.mmd", new MermaidGraphAdapter().render(topologyGraphData));
write("tension-timeline.svg", new SvgTensionTimelineRenderer().render(tensionTimelineData));
write("trajectory.mmd", new MermaidTrajectoryAdapter().render(trajectoryGraphData));

// ── Build and write the HTML gallery ─────────────────────────────────────

const topologySvg = new SvgTopologyRenderer().render(topologyGraphData);
const tensionSvg = new SvgTensionTimelineRenderer().render(tensionTimelineData);
const topologyMmd = new MermaidGraphAdapter().render(topologyGraphData);
const trajectoryMmd = new MermaidTrajectoryAdapter().render(trajectoryGraphData);

const html = buildHtml({
  seed: SEED,
  progression: result.chords.join(" - "),
  topologySvg,
  tensionSvg,
  topologyMmd,
  trajectoryMmd,
});

write("index.html", html);

console.log("\nDone. Open artifacts/index.html in a browser to view the gallery.");

// ── HTML builder ─────────────────────────────────────────────────────────

interface GalleryData {
  seed: number;
  progression: string;
  topologySvg: string;
  tensionSvg: string;
  topologyMmd: string;
  trajectoryMmd: string;
}

function buildHtml(data: GalleryData): string {
  const escape = (s: string): string =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>MusicLab Visualization Gallery — seed ${data.seed}</title>
  <style>
    body { font-family: sans-serif; max-width: 900px; margin: 2rem auto; padding: 0 1rem; color: #1e293b; }
    h1 { font-size: 1.4rem; margin-bottom: 0.25rem; }
    .subtitle { color: #64748b; font-size: 0.95rem; margin-bottom: 2rem; }
    h2 { font-size: 1.1rem; margin-top: 2rem; margin-bottom: 0.5rem; color: #334155; border-bottom: 1px solid #e2e8f0; padding-bottom: 0.25rem; }
    .svg-wrap { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 1rem; overflow-x: auto; }
    pre { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 1rem; overflow-x: auto; font-size: 0.85rem; line-height: 1.5; }
  </style>
</head>
<body>
  <h1>MusicLab Visualization Gallery</h1>
  <p class="subtitle">Seed: <strong>${data.seed}</strong> &nbsp;·&nbsp; Progression: <strong>${escape(data.progression)}</strong></p>

  <h2>Harmonic Topology (chord-space)</h2>
  <div class="svg-wrap">${data.topologySvg}</div>

  <h2>Tension Timeline (target vs. actual)</h2>
  <div class="svg-wrap">${data.tensionSvg}</div>

  <h2>Topology — Mermaid source</h2>
  <pre><code>${escape(data.topologyMmd)}</code></pre>

  <h2>Trajectory — Mermaid source</h2>
  <pre><code>${escape(data.trajectoryMmd)}</code></pre>
</body>
</html>`;
}
