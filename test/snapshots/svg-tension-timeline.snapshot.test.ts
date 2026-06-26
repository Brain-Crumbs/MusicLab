import { describe, it, expect } from "vitest";
import { DOMParser } from "@xmldom/xmldom";
import { createDefaultMvpGenerator } from "../../src/core/generator/createDefaultMvpGenerator.js";
import { chordId } from "../../src/core/model/ChordId.js";
import { TensionTimelineDataBuilder } from "../../src/visualizations/data/TensionTimelineDataBuilder.js";
import { SvgTensionTimelineRenderer } from "../../src/visualizations/svg/SvgTensionTimelineRenderer.js";

/**
 * A10.8 — SVG tension timeline snapshot test.
 *
 * Generation is deterministic for a fixed seed, the timeline builder is a pure
 * projection of the trace, and the SVG renderer is a pure function of that data
 * plus its (default) options — so the emitted SVG is fully stable.  The snapshot
 * pins the markup; a diff means generation, the projection, or the SVG layout
 * changed.
 *
 * SVG well-formedness is validated with a real XML parser (@xmldom/xmldom)
 * rather than string heuristics, so malformed-but-bracketed markup is caught.
 */

const SEED = 4242;
const xmlParser = new DOMParser();

function parseXml(xml: string): ReturnType<DOMParser["parseFromString"]> {
  return xmlParser.parseFromString(xml, "text/xml");
}

function hasParserError(xml: string): boolean {
  return parseXml(xml).getElementsByTagName("parsererror").length > 0;
}

describe("A10.8 — SVG tension timeline snapshot", () => {
  const result = createDefaultMvpGenerator({ seed: SEED }).generate({
    steps: 8,
    initialChord: chordId("I"),
  });
  const timeline = new TensionTimelineDataBuilder().build(result.trace);
  const svg = new SvgTensionTimelineRenderer().render(timeline);

  it("matches the rendered SVG", () => {
    expect(svg).toMatchSnapshot();
  });

  // ---------------------------------------------------------------------------
  // XML well-formedness — validated by a real XML parser, not string heuristics.
  // ---------------------------------------------------------------------------

  it("is well-formed XML with no parser errors", () => {
    expect(hasParserError(svg)).toBe(false);
  });

  it("root element is <svg> with the SVG namespace", () => {
    const doc = parseXml(svg);
    expect(doc.documentElement?.tagName).toBe("svg");
    expect(doc.documentElement?.getAttribute("xmlns")).toBe("http://www.w3.org/2000/svg");
  });

  it("has non-zero width and height attributes on the root element", () => {
    const doc = parseXml(svg);
    const root = doc.documentElement!;
    expect(Number(root.getAttribute("width"))).toBeGreaterThan(0);
    expect(Number(root.getAttribute("height"))).toBeGreaterThan(0);
  });

  // ---------------------------------------------------------------------------
  // Content invariants — independent of the snapshot.
  // ---------------------------------------------------------------------------

  it("draws a target and an actual polyline", () => {
    const doc = parseXml(svg);
    const polylines = doc.getElementsByTagName("polyline");
    expect(polylines.length).toBe(2);
  });

  it("plots one step marker per timeline datum on each line", () => {
    const doc = parseXml(svg);
    const circles = doc.getElementsByTagName("circle");
    expect(circles.length).toBe(timeline.length * 2);
  });

  // ---------------------------------------------------------------------------
  // Empty-state SVG.
  // ---------------------------------------------------------------------------

  it("renders a well-formed XML SVG for empty data", () => {
    const empty = new SvgTensionTimelineRenderer().render([]);
    expect(hasParserError(empty)).toBe(false);
    const doc = parseXml(empty);
    expect(doc.documentElement?.tagName).toBe("svg");
  });

  it("empty-state SVG contains a 'no data' message and no polylines", () => {
    const empty = new SvgTensionTimelineRenderer().render([]);
    expect(empty.includes("no data")).toBe(true);
    expect(parseXml(empty).getElementsByTagName("polyline").length).toBe(0);
  });
});
