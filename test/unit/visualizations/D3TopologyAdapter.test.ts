import { describe, it, expect } from "vitest";
import { D3TopologyAdapter } from "../../../src/visualizations/adapters/D3TopologyAdapter.js";
import { TopologyGraphDataBuilder } from "../../../src/visualizations/data/TopologyGraphDataBuilder.js";
import { MajorKeyTopologyBuilder } from "../../../src/core/topology/MajorKeyTopologyBuilder.js";
import type { GraphData } from "../../../src/visualizations/data/GraphData.js";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const topology = new MajorKeyTopologyBuilder().build();
const graph = new TopologyGraphDataBuilder().build(topology);
const adapter = new D3TopologyAdapter();
const d3Graph = adapter.adapt(graph);

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("D3TopologyAdapter — snapshot", () => {
  it("matches the D3 graph snapshot", () => {
    expect(d3Graph).toMatchSnapshot();
  });
});

describe("D3TopologyAdapter — node structure", () => {
  it("emits one D3 node per graph node", () => {
    expect(d3Graph.nodes).toHaveLength(graph.nodes.length);
  });

  it("every node has an id matching the source node id", () => {
    const srcIds = new Set(graph.nodes.map((n) => n.id));
    for (const d3Node of d3Graph.nodes) {
      expect(srcIds.has(d3Node.id)).toBe(true);
    }
  });

  it("every node has a label matching the source node label", () => {
    for (const d3Node of d3Graph.nodes) {
      const srcNode = graph.nodes.find((n) => n.id === d3Node.id)!;
      expect(d3Node.label).toBe(srcNode.label);
    }
  });

  it("node payload is present when source data is defined", () => {
    for (const d3Node of d3Graph.nodes) {
      const srcNode = graph.nodes.find((n) => n.id === d3Node.id)!;
      if (srcNode.data !== undefined) {
        expect(d3Node.payload).toEqual(srcNode.data);
      }
    }
  });

  it("node has no payload property when source data is absent", () => {
    const minGraph: GraphData = {
      nodes: [{ id: "A", label: "A" }],
      edges: [],
      directed: true,
    };
    const { nodes } = adapter.adapt(minGraph);
    expect(Object.prototype.hasOwnProperty.call(nodes[0], "payload")).toBe(false);
  });
});

describe("D3TopologyAdapter — link structure", () => {
  it("emits one D3 link per graph edge", () => {
    expect(d3Graph.links).toHaveLength(graph.edges.length);
  });

  it("every link has an id matching the source edge id", () => {
    const srcIds = new Set(graph.edges.map((e) => e.id));
    for (const link of d3Graph.links) {
      expect(srcIds.has(link.id)).toBe(true);
    }
  });

  it("link source and target match the source edge endpoints", () => {
    for (const link of d3Graph.links) {
      const srcEdge = graph.edges.find((e) => e.id === link.id)!;
      expect(link.source).toBe(srcEdge.source);
      expect(link.target).toBe(srcEdge.target);
    }
  });

  it("link value is set from edge weight when present", () => {
    for (const link of d3Graph.links) {
      const srcEdge = graph.edges.find((e) => e.id === link.id)!;
      if (srcEdge.weight !== undefined) {
        expect(link.value).toBe(srcEdge.weight);
      }
    }
  });

  it("link label is preserved from source edge when present", () => {
    for (const link of d3Graph.links) {
      const srcEdge = graph.edges.find((e) => e.id === link.id)!;
      if (srcEdge.label !== undefined) {
        expect(link.label).toBe(srcEdge.label);
      }
    }
  });

  it("link has no value property when source edge has no weight", () => {
    const minGraph: GraphData = {
      nodes: [
        { id: "A", label: "A" },
        { id: "B", label: "B" },
      ],
      edges: [{ id: "A-B", source: "A", target: "B" }],
      directed: true,
    };
    const { links } = adapter.adapt(minGraph);
    expect(Object.prototype.hasOwnProperty.call(links[0], "value")).toBe(false);
  });
});

describe("D3TopologyAdapter — determinism", () => {
  it("produces identical output on repeated calls", () => {
    const a = adapter.adapt(graph);
    const b = adapter.adapt(graph);
    expect(a).toEqual(b);
  });
});

describe("D3TopologyAdapter — empty graph", () => {
  const emptyGraph: GraphData = { nodes: [], edges: [], directed: true };

  it("returns empty nodes and links for an empty graph", () => {
    const d3Empty = adapter.adapt(emptyGraph);
    expect(d3Empty.nodes).toHaveLength(0);
    expect(d3Empty.links).toHaveLength(0);
  });
});
