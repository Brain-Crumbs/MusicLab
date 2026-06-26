import { describe, it, expect } from "vitest";
import { MajorKeyTopologyBuilder } from "../../src/core/topology/MajorKeyTopologyBuilder.js";
import { TopologyGraphDataBuilder } from "../../src/visualizations/data/TopologyGraphDataBuilder.js";
import { MermaidGraphAdapter } from "../../src/visualizations/adapters/MermaidGraphAdapter.js";

/**
 * A10.7 — Mermaid topology snapshot test.
 *
 * The topology is built deterministically and the Mermaid adapter is a pure
 * serialisation of it, so the emitted flowchart source is fixed.  The snapshot
 * pins that source; a diff means the chord catalog, the edge set, or the Mermaid
 * formatting changed.
 */

describe("A10.7 — Mermaid topology snapshot", () => {
  const topology = new MajorKeyTopologyBuilder().build();
  const graph = new TopologyGraphDataBuilder().build(topology);
  const mermaid = new MermaidGraphAdapter().render(graph);

  it("matches the serialised Mermaid flowchart", () => {
    expect(mermaid).toMatchSnapshot();
  });

  // ---------------------------------------------------------------------------
  // Invariants — independent of the snapshot.
  // ---------------------------------------------------------------------------

  it("opens with a flowchart header in the default LR direction", () => {
    expect(mermaid.startsWith("flowchart LR")).toBe(true);
  });

  it("declares one node line per chord", () => {
    const nodeLines = mermaid.split("\n").filter((l) => /^ {4}n\d+\["/.test(l));
    expect(nodeLines).toHaveLength(graph.nodes.length);
  });

  it("emits one edge line per topology edge", () => {
    const edgeLines = mermaid.split("\n").filter((l) => l.includes("-->"));
    expect(edgeLines).toHaveLength(graph.edges.length);
  });

  it("respects the direction option", () => {
    const tb = new MermaidGraphAdapter().render(graph, { direction: "TB" });
    expect(tb.startsWith("flowchart TB")).toBe(true);
  });

  it("omits edge labels when showEdgeLabels is false", () => {
    const plain = new MermaidGraphAdapter().render(graph, {
      showEdgeLabels: false,
    });
    expect(plain.includes("-->|")).toBe(false);
  });
});
