/**
 * CI render script — generates a seeded progression and writes diagram outputs
 * to the artifacts/ directory:
 *
 *   artifacts/topology.mmd       — Mermaid chord-space topology
 *   artifacts/trajectory.mmd     — Mermaid trajectory of the seeded run
 *   artifacts/topology.svg       — SVG chord-space topology
 *   artifacts/tension-timeline.svg — SVG tension timeline (target vs actual)
 *
 * Run with:
 *   npx tsx scripts/render-visuals.ts
 */
import fs from "node:fs";
import path from "node:path";

import { createDefaultMvpGenerator, chordId } from "../src/index.js";
import { MajorKeyTopologyBuilder } from "../src/core/topology/MajorKeyTopologyBuilder.js";
import {
  TopologyGraphDataBuilder,
  TrajectoryGraphDataBuilder,
  TensionTimelineDataBuilder,
  MermaidGraphAdapter,
  MermaidTrajectoryAdapter,
  SvgTopologyRenderer,
  SvgTensionTimelineRenderer,
} from "../src/visualizations/index.js";

const SEED = 42;
const STEPS = 8;

const outDir = path.join(process.cwd(), "artifacts");
fs.mkdirSync(outDir, { recursive: true });

// Run the generator with a fixed seed so CI output is reproducible.
const generator = createDefaultMvpGenerator({ key: "C", temperature: 0.8, seed: SEED });
const result = generator.generate({ steps: STEPS, initialChord: chordId("I") });

// Build the static topology graph from the major-key topology.
const topology = new MajorKeyTopologyBuilder().build();
const topologyGraph = new TopologyGraphDataBuilder().build(topology);

// Build the trajectory graph from the generation trace.
const trajectoryGraph = new TrajectoryGraphDataBuilder().build(result.trace);

// Build the tension timeline data.
const timelineData = new TensionTimelineDataBuilder().build(result.trace);

// Render Mermaid outputs.
const mermaidTopology = new MermaidGraphAdapter().render(topologyGraph);
const mermaidTrajectory = new MermaidTrajectoryAdapter().render(trajectoryGraph);

// Render SVG outputs.
const svgTopology = new SvgTopologyRenderer().render(topologyGraph);
const svgTimeline = new SvgTensionTimelineRenderer().render(timelineData);

// Write all artifacts.
const write = (filename: string, content: string): void => {
  const dest = path.join(outDir, filename);
  fs.writeFileSync(dest, content, "utf8");
  console.log(`  wrote ${path.relative(process.cwd(), dest)}`);
};

console.log(`Rendering diagrams (seed=${SEED}, steps=${STEPS})…`);
write("topology.mmd", mermaidTopology);
write("trajectory.mmd", mermaidTrajectory);
write("topology.svg", svgTopology);
write("tension-timeline.svg", svgTimeline);
console.log("Done.");
