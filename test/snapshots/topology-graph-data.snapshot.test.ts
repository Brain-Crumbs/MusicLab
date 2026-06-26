import { describe, it, expect } from "vitest";
import { MajorKeyTopologyBuilder } from "../../src/core/topology/MajorKeyTopologyBuilder.js";
import { TopologyGraphDataBuilder } from "../../src/visualizations/data/TopologyGraphDataBuilder.js";

/**
 * V9.7 — topology graph data snapshot test.
 *
 * The harmonic topology is the permanent chord-space, built deterministically
 * by MajorKeyTopologyBuilder.  Projecting it to GraphData is pure, so the graph
 * is fixed: this snapshot pins the nodes and edges so any change to the chord
 * catalog, the edge set, or the projection shape fails loudly.
 */

describe("V9.7 — topology graph data snapshot", () => {
  const topology = new MajorKeyTopologyBuilder().build();
  const graph = new TopologyGraphDataBuilder().build(topology);

  it("matches the projected topology graph", () => {
    expect(graph).toMatchSnapshot();
  });

  // ---------------------------------------------------------------------------
  // Invariants — independent of the snapshot.
  // ---------------------------------------------------------------------------

  it("is directed", () => {
    expect(graph.directed).toBe(true);
  });

  it("emits one node per chord and one edge per topology edge", () => {
    expect(graph.nodes).toHaveLength(topology.chordCount);
    expect(graph.edges).toHaveLength(topology.edgeCount);
  });

  it("has unique node ids and unique edge ids", () => {
    expect(new Set(graph.nodes.map((n) => n.id)).size).toBe(graph.nodes.length);
    expect(new Set(graph.edges.map((e) => e.id)).size).toBe(graph.edges.length);
  });

  it("references only existing nodes from every edge", () => {
    const ids = new Set(graph.nodes.map((n) => n.id));
    for (const edge of graph.edges) {
      expect(ids.has(edge.source)).toBe(true);
      expect(ids.has(edge.target)).toBe(true);
    }
  });

  it("uses baseAffinity as the default edge weight", () => {
    for (const edge of graph.edges) {
      expect(edge.weight).toBe(edge.data!.baseAffinity);
    }
  });
});
