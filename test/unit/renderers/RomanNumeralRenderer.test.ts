import { describe, it, expect } from "vitest";
import { RomanNumeralRenderer } from "../../../src/renderers/RomanNumeralRenderer.js";
import { chordId } from "../../../src/core/model/ChordId.js";
import { createDefaultMvpGenerator } from "../../../src/core/generator/createDefaultMvpGenerator.js";

import type { ChordId } from "../../../src/core/model/ChordId.js";

const seq = (...ids: string[]): ChordId[] => ids.map(chordId);

describe("RomanNumeralRenderer", () => {
  // -------------------------------------------------------------------------
  // Sequence rendering
  // -------------------------------------------------------------------------

  it("joins chord ids with the default ' - ' separator", () => {
    const renderer = new RomanNumeralRenderer();
    expect(renderer.renderSequence(seq("I", "IV", "V7", "I"))).toBe(
      "I - IV - V7 - I",
    );
  });

  it("preserves Roman numerals verbatim (no transposition or re-spelling)", () => {
    const renderer = new RomanNumeralRenderer();
    expect(renderer.renderSequence(seq("bVII", "vii°", "ii", "V7"))).toBe(
      "bVII - vii° - ii - V7",
    );
  });

  it("honours a custom separator", () => {
    const renderer = new RomanNumeralRenderer({ separator: " | " });
    expect(renderer.renderSequence(seq("I", "V", "vi", "IV"))).toBe(
      "I | V | vi | IV",
    );
  });

  it("renders a single chord with no separator", () => {
    expect(new RomanNumeralRenderer().renderSequence(seq("I"))).toBe("I");
  });

  it("renders an empty sequence as an empty string", () => {
    expect(new RomanNumeralRenderer().renderSequence([])).toBe("");
  });

  // -------------------------------------------------------------------------
  // Result / trace rendering
  // -------------------------------------------------------------------------

  it("renders the full progression including the starting chord", () => {
    const result = createDefaultMvpGenerator({ seed: 123 }).generate({
      steps: 8,
      initialChord: chordId("I"),
    });

    const rendered = new RomanNumeralRenderer().render(result);
    // The progression begins on the requested initialChord, then the N moves.
    expect(rendered).toBe([result.initialChord, ...result.chords].join(" - "));
    expect(rendered.split(" - ")[0]).toBe("I");
    expect(rendered.split(" - ")).toHaveLength(result.chords.length + 1);
  });

  it("renderTrace matches render for the same run", () => {
    const result = createDefaultMvpGenerator({ seed: 7 }).generate({
      steps: 6,
      initialChord: chordId("I"),
    });
    const renderer = new RomanNumeralRenderer();
    expect(renderer.renderTrace(result.trace)).toBe(renderer.render(result));
  });

  it("is deterministic for a fixed seed", () => {
    const run = (): string =>
      new RomanNumeralRenderer().render(
        createDefaultMvpGenerator({ seed: 999 }).generate({
          steps: 8,
          initialChord: chordId("I"),
        }),
      );
    expect(run()).toBe(run());
  });
});
