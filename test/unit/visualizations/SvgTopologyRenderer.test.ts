import { describe, it, expect } from "vitest";
import { DOMParser } from "@xmldom/xmldom";
import { SvgTopologyRenderer } from "../../../src/visualizations/svg/SvgTopologyRenderer.js";
import { TopologyGraphDataBuilder } from "../../../src/visualizations/data/TopologyGraphDataBuilder.js";
import { MajorKeyTopologyBuilder } from "../../../src/core/topology/MajorKeyTopologyBuilder.js";
import type { GraphData } from "../../../src/visualizations/data/GraphData.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const parser = new DOMParser();

function parseXml(xml: string) {
  return parser.parseFromString(xml, "text/xml");
}

function hasParserError(xml: string): boolean {
  const doc = parseXml(xml);
  return doc.getElementsByTagName("parsererror").length > 0;
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const topology = new MajorKeyTopologyBuilder().build();
const graph = new TopologyGraphDataBuilder().build(topology);
const renderer = new SvgTopologyRenderer();
const svg = renderer.render(graph);

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("SvgTopologyRenderer — snapshot", () => {
  it("matches the topology SVG snapshot", () => {
    expect(svg).toMatchSnapshot();
  });
});

describe("SvgTopologyRenderer — XML well-formedness (real XML parser)", () => {
  it("emits well-formed XML with no parser errors", () => {
    expect(hasParserError(svg)).toBe(false);
  });

  it("root element is <svg>", () => {
    const doc = parseXml(svg);
    expect(doc.documentElement?.tagName).toBe("svg");
  });

  it("root carries the SVG XML namespace", () => {
    const doc = parseXml(svg);
    const root = doc.documentElement!;
    expect(root.getAttribute("xmlns")).toBe("http://www.w3.org/2000/svg");
  });

  it("has non-zero width and height attributes", () => {
    const doc = parseXml(svg);
    const root = doc.documentElement!;
    expect(Number(root.getAttribute("width"))).toBeGreaterThan(0);
    expect(Number(root.getAttribute("height"))).toBeGreaterThan(0);
  });

  it("contains a <defs> block with an arrow marker", () => {
    const doc = parseXml(svg);
    const defs = doc.getElementsByTagName("defs");
    expect(defs.length).toBeGreaterThan(0);
    const markers = doc.getElementsByTagName("marker");
    expect(markers.length).toBeGreaterThan(0);
    expect(markers.item(0)?.getAttribute("id")).toBe("arrow");
  });
});

describe("SvgTopologyRenderer — structural invariants", () => {
  it("renders exactly one <circle> per chord node", () => {
    const doc = parseXml(svg);
    const circles = doc.getElementsByTagName("circle");
    expect(circles.length).toBe(graph.nodes.length);
  });

  it("renders exactly one <line> per topology edge", () => {
    const doc = parseXml(svg);
    const lines = doc.getElementsByTagName("line");
    expect(lines.length).toBe(graph.edges.length);
  });

  it("includes a <text> label for every node", () => {
    const doc = parseXml(svg);
    const texts = doc.getElementsByTagName("text");
    expect(texts.length).toBe(graph.nodes.length);
  });

  it("every <line> carries marker-end pointing at the arrow marker", () => {
    const doc = parseXml(svg);
    const lines = doc.getElementsByTagName("line");
    for (let i = 0; i < lines.length; i++) {
      expect(lines.item(i)?.getAttribute("marker-end")).toContain("arrow");
    }
  });
});

describe("SvgTopologyRenderer — option overrides", () => {
  it("embeds custom width and height in root attributes", () => {
    const custom = renderer.render(graph, { width: 1024, height: 768 });
    const doc = parseXml(custom);
    const root = doc.documentElement!;
    expect(root.getAttribute("width")).toBe("1024");
    expect(root.getAttribute("height")).toBe("768");
    expect(hasParserError(custom)).toBe(false);
  });

  it("custom options still produce well-formed XML", () => {
    const custom = renderer.render(graph, {
      width: 400,
      height: 300,
      nodeRadius: 16,
      padding: 30,
      fontSize: 12,
    });
    expect(hasParserError(custom)).toBe(false);
  });
});

describe("SvgTopologyRenderer — empty graph", () => {
  const emptyGraph: GraphData = { nodes: [], edges: [], directed: true };
  const emptySvg = renderer.render(emptyGraph);

  it("produces well-formed XML for an empty graph", () => {
    expect(hasParserError(emptySvg)).toBe(false);
  });

  it("still emits an <svg> root element", () => {
    const doc = parseXml(emptySvg);
    expect(doc.documentElement?.tagName).toBe("svg");
  });

  it("has no <circle> or <line> elements for an empty graph", () => {
    const doc = parseXml(emptySvg);
    expect(doc.getElementsByTagName("circle").length).toBe(0);
    expect(doc.getElementsByTagName("line").length).toBe(0);
  });
});
