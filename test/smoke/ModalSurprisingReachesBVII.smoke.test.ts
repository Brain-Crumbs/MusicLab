import { describe, it, expect } from "vitest";
import { createDefaultMvpGenerator } from "../../src/core/generator/createDefaultMvpGenerator.js";
import { PhraseTemplates } from "../../src/core/phrase/PhraseTemplates.js";
import { StyleProfiles } from "../../src/core/model/StyleProfile.js";
import { Mode } from "../../src/core/model/MusicalState.js";
import { chordId } from "../../src/core/model/ChordId.js";

/**
 * Regression for #16 — the modalSurprising preset must actually deliver its
 * defining modal colour (bVII).
 *
 * The bug: StyleFactor boosted edges *departing* bVII (the bVII→I modal
 * return), but the topology had a single edge *arriving* at bVII (I→bVII), so
 * once the music left the tonic bVII was effectively unreachable and the
 * "Mixolydian" output read as plain diatonic-major wandering.
 *
 * The fix added incoming modal-approach edges (IV→bVII, V→bVII) and made
 * StyleFactor reward reaching a modal *destination*, not only modal-return
 * edges. These tests mirror examples/configs/modal-surprising.json (D
 * Mixolydian, modalSurprising, eightBarMidPeak, temperature 1.1) and assert
 * bVII shows up with non-trivial probability — without listening to anything.
 */
describe("#16 — modalSurprising actually reaches bVII", () => {
  const modalGenerator = (seed: number): ReturnType<typeof createDefaultMvpGenerator> =>
    createDefaultMvpGenerator({
      key: "D",
      mode: Mode.Mixolydian,
      styleProfile: StyleProfiles.modalSurprising,
      phraseTemplate: PhraseTemplates.eightBarMidPeak,
      temperature: 1.1,
      seed,
    });

  it("the seeded example run (seed 777, 12 steps) contains at least one bVII", () => {
    const result = modalGenerator(777).generate({
      steps: 12,
      initialChord: chordId("I"),
    });
    expect(result.chords).toContain("bVII");
  });

  it("bVII appears in a clear majority of seeded 12-step runs", () => {
    let withBVII = 0;
    const seeds = 60;
    for (let seed = 1; seed <= seeds; seed++) {
      const result = modalGenerator(seed).generate({
        steps: 12,
        initialChord: chordId("I"),
      });
      if (result.chords.includes("bVII")) withBVII++;
    }
    // Before the fix this hovered around ~40%; the modal preset's signature
    // colour should now surface in well over half of runs.
    expect(withBVII / seeds).toBeGreaterThan(0.5);
  });

  it("produces the signature bVII→I modal return across a spread of seeds", () => {
    let modalReturns = 0;
    for (let seed = 1; seed <= 60; seed++) {
      const result = modalGenerator(seed).generate({
        steps: 12,
        initialChord: chordId("I"),
      });
      const chords = result.chords;
      for (let i = 0; i < chords.length - 1; i++) {
        if (chords[i] === "bVII" && chords[i + 1] === "I") {
          modalReturns++;
          break;
        }
      }
    }
    expect(modalReturns).toBeGreaterThan(0);
  });
});
