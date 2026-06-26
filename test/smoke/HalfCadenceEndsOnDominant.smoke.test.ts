import { describe, it, expect } from "vitest";
import { createDefaultMvpGenerator } from "../../src/core/generator/createDefaultMvpGenerator.js";
import { PhraseTemplates } from "../../src/core/phrase/PhraseTemplates.js";
import { chordId } from "../../src/core/model/ChordId.js";

/**
 * Issue #19 — fourBarHalfCadence must rest on the dominant.
 *
 * A half cadence should land on V (or V7), leaving the phrase unresolved.
 * Before the fix the template only specified a tension *level* at the final
 * position, which was insufficient to pin the ending to the dominant function;
 * runs frequently resolved to I or drifted to vi (a deceptive ending).
 *
 * The template now carries `desiredFinalFunction: Dominant`, which
 * CadenceFitFactor uses to (a) bias the final chord toward a dominant-function
 * chord and (b) steer the pre-cadential chord away from dominant "dead ends"
 * (V7, vii°) whose only continuations resolve to a tonic.
 *
 * Aggregated across many seeds so the assertion is robust to the sampler.
 */
describe("Issue #19 — fourBarHalfCadence ends on the dominant", () => {
  const DOMINANT_ENDINGS = new Set<string>(["V", "V7"]);

  it("rests on a dominant-function chord the large majority of the time", () => {
    let dominantEndings = 0;
    const seeds = 200;

    for (let seed = 1; seed <= seeds; seed++) {
      const generator = createDefaultMvpGenerator({
        phraseTemplate: PhraseTemplates.fourBarHalfCadence,
        seed,
      });
      const result = generator.generate({ steps: 4, initialChord: chordId("I") });
      const finalChord = result.chords[result.chords.length - 1];
      if (DOMINANT_ENDINGS.has(finalChord)) dominantEndings++;
    }

    // "Large majority" per the issue's acceptance criteria; in practice ~98%.
    expect(dominantEndings / seeds).toBeGreaterThan(0.9);
  });

  it("ends on the dominant for the reported example seed", () => {
    // examples/configs/half-cadence.json uses seed 555.
    const generator = createDefaultMvpGenerator({
      phraseTemplate: PhraseTemplates.fourBarHalfCadence,
      seed: 555,
    });
    const result = generator.generate({ steps: 4, initialChord: chordId("I") });
    const finalChord = result.chords[result.chords.length - 1];
    expect(DOMINANT_ENDINGS.has(finalChord)).toBe(true);
  });
});
