import { describe, it, expect } from "vitest";
import { createDefaultMvpGenerator } from "../../../src/core/generator/createDefaultMvpGenerator.js";
import { RomanNumeralRenderer } from "../../../src/renderers/RomanNumeralRenderer.js";
import { ProgressionTextRenderer } from "../../../src/renderers/ProgressionTextRenderer.js";
import { chordId } from "../../../src/core/model/ChordId.js";
import type { GenerationResult } from "../../../src/core/generator/GenerationResult.js";

/**
 * Regression for #21 — the requested initialChord must appear first in the
 * rendered progression.
 *
 * `steps` generates N transitions *from* the starting state, so the starting
 * chord is not itself an emitted step. Previously the rendered output began on
 * the first transition target, so `--initial I` appeared to "start on V7". The
 * result now carries `initialChord` and the progression renderers prepend it,
 * giving the natural "starting chord plus N moves" sequence.
 */
describe("#21 — initialChord appears in rendered output", () => {
  const generate = (initial: string, seed = 123): GenerationResult =>
    createDefaultMvpGenerator({ seed }).generate({
      steps: 8,
      initialChord: chordId(initial),
    });

  it("exposes the requested starting chord on the result", () => {
    expect(generate("I").initialChord).toBe("I");
    expect(generate("vi").initialChord).toBe("vi");
  });

  it("keeps initialChord out of the raw `chords` step list", () => {
    // `chords` stays the N transition targets — one entry per generated step.
    const result = generate("I");
    expect(result.chords).toHaveLength(result.steps.length);
  });

  it("RomanNumeralRenderer output begins on the initial chord", () => {
    const result = generate("vi");
    const rendered = new RomanNumeralRenderer().render(result);
    expect(rendered.split(" - ")[0]).toBe("vi");
    expect(rendered.split(" - ")).toHaveLength(result.chords.length + 1);
  });

  it("ProgressionTextRenderer begins both lines on the initial chord", () => {
    const result = generate("vi");
    const [romanLine, concreteLine] = new ProgressionTextRenderer()
      .render(result, { mode: "both", key: "C" })
      .split("\n");
    expect(romanLine!.startsWith("vi")).toBe(true);
    // vi in C is A minor.
    expect(concreteLine!.startsWith("Am")).toBe(true);
  });

  it("renderTrace matches render — both include the starting chord", () => {
    const result = generate("I");
    const renderer = new RomanNumeralRenderer();
    expect(renderer.renderTrace(result.trace)).toBe(renderer.render(result));
    expect(result.trace.initialChord).toBe("I");
  });
});
