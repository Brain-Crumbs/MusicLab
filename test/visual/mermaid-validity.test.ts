/**
 * Visual / parse-level Mermaid validity tests.
 *
 * This file is intentionally excluded from the default `npm test` run because
 * a proper Mermaid parse requires a browser-like DOM environment that is heavy
 * to bootstrap (jsdom + the mermaid package itself).
 *
 * Run with:  npm run test:visual
 *
 * The tests below use a structural grammar validator (same as the one in the
 * regular snapshot tests) as a self-contained baseline.  To upgrade to a real
 * Mermaid engine parse, install `mermaid` and `jsdom`, configure the
 * `testEnvironment` in vitest.config.ts for this folder to `"jsdom"`, then
 * call `mermaid.parse(source)` and assert it does not throw.
 *
 * For CI rasterization (PNG visual regression), install `@mermaid-js/mermaid-cli`
 * and pipe each source through `mmdc -i /dev/stdin -o baseline.png`.
 * Diff against committed baselines with `pixelmatch` or `odiff`.
 */

import { describe, it, expect } from "vitest";
import { MajorKeyTopologyBuilder } from "../../src/core/topology/MajorKeyTopologyBuilder.js";
import { TopologyGraphDataBuilder } from "../../src/visualizations/data/TopologyGraphDataBuilder.js";
import { MermaidGraphAdapter } from "../../src/visualizations/adapters/MermaidGraphAdapter.js";
import { MermaidTrajectoryAdapter } from "../../src/visualizations/adapters/MermaidTrajectoryAdapter.js";
import { TrajectoryGraphDataBuilder } from "../../src/visualizations/data/TrajectoryGraphDataBuilder.js";
import { createDefaultMvpGenerator } from "../../src/core/generator/createDefaultMvpGenerator.js";
import { chordId } from "../../src/core/model/ChordId.js";

// ---------------------------------------------------------------------------
// Structural validator (grammar-level; see inline note above for upgrade path)
// ---------------------------------------------------------------------------

interface MermaidCheckResult {
  valid: boolean;
  errors: string[];
}

function validateMermaidFlowchart(source: string): MermaidCheckResult {
  const errors: string[] = [];
  const lines = source.split("\n");

  const header = lines[0] ?? "";
  if (!/^flowchart\s+(LR|RL|TB|TD|BT)$/.test(header.trim())) {
    errors.push(`Invalid flowchart header: "${header}"`);
  }

  const nodePattern = /^\s{4}(n\d+)\["[^"]*"\](:::[\w-]+)?$/;
  const edgeWithLabel = /^\s{4}n\d+\s*-->\|"[^"]*"\|\s*n\d+$/;
  const edgeNoLabel = /^\s{4}n\d+\s*-->\s*n\d+$/;
  const classDefPattern = /^\s{4}classDef\s+\w+\s+/;
  const linkStylePattern = /^\s{4}linkStyle\s+[\d,]+\s+/;

  const declaredNodes = new Set<string>();
  const referencedNodes = new Set<string>();

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i] ?? "";
    if (line.trim() === "") continue;

    const nodeMatch = line.match(nodePattern);
    if (nodeMatch) {
      declaredNodes.add(nodeMatch[1]!);
      continue;
    }

    const edgeIds = line.match(/n\d+/g);
    if (
      edgeWithLabel.test(line) ||
      edgeNoLabel.test(line) ||
      classDefPattern.test(line) ||
      linkStylePattern.test(line)
    ) {
      if (edgeIds) edgeIds.forEach((id) => referencedNodes.add(id));
      continue;
    }

    errors.push(`Line ${i + 1}: unrecognised Mermaid syntax: "${line.trimEnd()}"`);
  }

  for (const ref of referencedNodes) {
    if (!declaredNodes.has(ref)) {
      errors.push(`Edge references undeclared node: "${ref}"`);
    }
  }

  return { valid: errors.length === 0, errors };
}

// ---------------------------------------------------------------------------
// Topology adapter
// ---------------------------------------------------------------------------

const topology = new MajorKeyTopologyBuilder().build();
const graph = new TopologyGraphDataBuilder().build(topology);

describe("Mermaid validity — topology adapter (MermaidGraphAdapter)", () => {
  it("LR topology is structurally valid Mermaid", () => {
    const source = new MermaidGraphAdapter().render(graph);
    const result = validateMermaidFlowchart(source);
    expect(result.errors).toEqual([]);
  });

  it("TB topology is structurally valid Mermaid", () => {
    const source = new MermaidGraphAdapter().render(graph, { direction: "TB" });
    const result = validateMermaidFlowchart(source);
    expect(result.errors).toEqual([]);
  });

  it("no-label topology is structurally valid Mermaid", () => {
    const source = new MermaidGraphAdapter().render(graph, { showEdgeLabels: false });
    const result = validateMermaidFlowchart(source);
    expect(result.errors).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Trajectory adapter
// ---------------------------------------------------------------------------

const SEED = 4242;
const result = createDefaultMvpGenerator({ seed: SEED }).generate({
  steps: 8,
  initialChord: chordId("I"),
});
const trajectoryGraph = new TrajectoryGraphDataBuilder().build(result.trace);

describe("Mermaid validity — trajectory adapter (MermaidTrajectoryAdapter)", () => {
  it("default trajectory is structurally valid Mermaid", () => {
    const source = new MermaidTrajectoryAdapter().render(trajectoryGraph);
    const check = validateMermaidFlowchart(source);
    expect(check.errors).toEqual([]);
  });

  it("trajectory without start highlight is structurally valid Mermaid", () => {
    const source = new MermaidTrajectoryAdapter().render(trajectoryGraph, {
      highlightStart: false,
    });
    const check = validateMermaidFlowchart(source);
    expect(check.errors).toEqual([]);
  });

  it("trajectory with motion labels is structurally valid Mermaid", () => {
    const source = new MermaidTrajectoryAdapter().render(trajectoryGraph, {
      showMotion: true,
    });
    const check = validateMermaidFlowchart(source);
    expect(check.errors).toEqual([]);
  });

  it("trajectory in TB direction is structurally valid Mermaid", () => {
    const source = new MermaidTrajectoryAdapter().render(trajectoryGraph, { direction: "TB" });
    const check = validateMermaidFlowchart(source);
    expect(check.errors).toEqual([]);
  });
});
