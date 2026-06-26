import { describe, it, expect } from "vitest";
import { LeadSheetRenderer } from "../../src/renderers/LeadSheetRenderer.js";
import { createDefaultMvpGenerator } from "../../src/core/generator/createDefaultMvpGenerator.js";
import { chordId } from "../../src/core/model/ChordId.js";
import { PhraseTemplates } from "../../src/core/model/PhraseTemplate.js";

/**
 * R8.9 — lead sheet snapshot test.
 *
 * Pins the rendered bar grid for seeded runs.  Because generation is
 * deterministic for a fixed seed and the renderer is pure, the grid is stable;
 * a snapshot diff means either generation or layout changed.
 */

const SEED = 4242;

import type { GenerationResult } from "../../src/core/generator/GenerationResult.js";

function run(
  steps: number,
  phraseTemplate = PhraseTemplates.fourBarResolutionPump,
): GenerationResult {
  return createDefaultMvpGenerator({ seed: SEED, phraseTemplate }).generate({
    steps,
    initialChord: chordId("I"),
  });
}

describe("R8.9 — LeadSheetRenderer snapshot", () => {
  const renderer = new LeadSheetRenderer();

  it("renders an 8-step run as a 4-bars-per-line Roman grid", () => {
    expect(renderer.render(run(8))).toMatchSnapshot();
  });

  it("renders the same run as concrete chords in C", () => {
    expect(renderer.render(run(8), { concrete: true })).toMatchSnapshot();
  });

  it("renders concrete chords in another key", () => {
    expect(renderer.render(run(8), { concrete: true, key: "G" })).toMatchSnapshot();
  });

  it("wraps by phrase length (8-bar template -> 8 bars per line)", () => {
    expect(renderer.render(run(16, PhraseTemplates.eightBarLongArc))).toMatchSnapshot();
  });

  it("honours an explicit barsPerLine override", () => {
    expect(renderer.render(run(8), { barsPerLine: 2 })).toMatchSnapshot();
  });

  // ---------------------------------------------------------------------------
  // Structural invariants (independent of the snapshot)
  // ---------------------------------------------------------------------------

  it("produces one cell per chord and aligned columns", () => {
    const result = run(8);
    const text = renderer.render(result, { barsPerLine: 4 });
    const lines = text.split("\n");

    // 8 chords / 4 per line = 2 lines.
    expect(lines).toHaveLength(2);

    // Every line is the same width (uniform cell padding).
    const widths = new Set(lines.map((l) => l.length));
    expect(widths.size).toBe(1);

    // Total cells equals the number of chords.
    const cellCount = lines.reduce((sum, l) => sum + (l.match(/\|/g)!.length - 1), 0);
    expect(cellCount).toBe(result.chords.length);
  });

  it("renders an empty run as an empty string", () => {
    const empty = {
      ...run(8),
      chords: [],
    };
    expect(renderer.render(empty)).toBe("");
  });
});
