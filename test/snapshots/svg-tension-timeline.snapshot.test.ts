import { describe, it, expect } from "vitest";
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
 */

const SEED = 4242;

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
  // Invariants — independent of the snapshot.
  // ---------------------------------------------------------------------------

  it("is a well-formed standalone SVG", () => {
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg.trimEnd().endsWith("</svg>")).toBe(true);
    expect(svg.includes('xmlns="http://www.w3.org/2000/svg"')).toBe(true);
  });

  it("draws a target and an actual polyline", () => {
    const polylines = svg.split("\n").filter((l) => l.includes("<polyline"));
    expect(polylines).toHaveLength(2);
  });

  it("plots one step marker per timeline datum on each line", () => {
    const circles = (svg.match(/<circle /g) ?? []).length;
    expect(circles).toBe(timeline.length * 2);
  });

  it("renders an empty-state SVG for no data", () => {
    const empty = new SvgTensionTimelineRenderer().render([]);
    expect(empty.startsWith("<svg")).toBe(true);
    expect(empty.includes("no data")).toBe(true);
    expect(empty.includes("<polyline")).toBe(false);
  });
});
