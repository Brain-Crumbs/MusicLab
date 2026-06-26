import { describe, it, expect } from "vitest";
import { createDefaultMvpGenerator } from "../../src/core/generator/createDefaultMvpGenerator.js";
import { PhraseTemplates } from "../../src/core/phrase/PhraseTemplates.js";
import { chordId } from "../../src/core/model/ChordId.js";
import { MVP_CHORD_IDS } from "../../src/core/model/ChordId.js";

/**
 * X6.7 — 4-bar generation smoke test.
 *
 * The fourBarResolutionPump template's tension curve is [0.2, 0.5, 0.85, 0.1]:
 * it builds to a peak at phrase position 2 and releases hard at the phrase end
 * (position 3). These tests confirm the assembled generator actually produces
 * that "resolution pump" behaviour, aggregated across many seeds so the
 * assertions are robust to the stochastic sampler.
 */
describe("X6.7 — generate 4-bar progression", () => {
  const VALID = new Set<string>(MVP_CHORD_IDS);

  it("produces exactly the requested number of chords, all valid", () => {
    const generator = createDefaultMvpGenerator({
      phraseTemplate: PhraseTemplates.fourBarResolutionPump,
      seed: 7,
    });
    const result = generator.generate({ steps: 4, initialChord: chordId("I") });

    expect(result.chords).toHaveLength(4);
    expect(result.steps).toHaveLength(4);
    for (const chord of result.chords) {
      expect(VALID.has(chord)).toBe(true);
    }
    // The convenience array mirrors the steps.
    expect(result.chords).toEqual(result.steps.map((s) => s.selectedChord));
    // The trace agrees with the steps.
    expect(result.trace.totalSteps).toBe(4);
    expect(result.trace.chordSequence).toEqual(result.chords);
  });

  it("releases tension at the phrase end relative to the phrase peak", () => {
    // Aggregate resulting tension by the phrase position each chord lands on.
    const tensionByPosition = new Map<number, number[]>();

    for (let seed = 1; seed <= 30; seed++) {
      const generator = createDefaultMvpGenerator({
        phraseTemplate: PhraseTemplates.fourBarResolutionPump,
        seed,
      });
      // Two full 4-bar phrases.
      const result = generator.generate({ steps: 8, initialChord: chordId("I") });
      for (const step of result.steps) {
        const pos = step.nextState.phrasePosition;
        const bucket = tensionByPosition.get(pos) ?? [];
        bucket.push(step.resultingTension);
        tensionByPosition.set(pos, bucket);
      }
    }

    const mean = (xs: number[]): number =>
      xs.reduce((a, b) => a + b, 0) / xs.length;

    const peak = mean(tensionByPosition.get(2) ?? []); // target 0.85
    const release = mean(tensionByPosition.get(3) ?? []); // target 0.10

    // The cadence position should, on average, be more relaxed than the peak.
    expect(release).toBeLessThan(peak);
  });

  it("records cadence events in the trace for resolving runs", () => {
    // Across many seeds at least some runs should land an authentic/plagal/modal
    // cadence; the generator must surface those in the trace.
    let totalCadences = 0;
    for (let seed = 1; seed <= 20; seed++) {
      const generator = createDefaultMvpGenerator({
        phraseTemplate: PhraseTemplates.fourBarResolutionPump,
        seed,
      });
      const result = generator.generate({ steps: 8, initialChord: chordId("I") });
      totalCadences += result.trace.cadenceEvents.length;
    }
    expect(totalCadences).toBeGreaterThan(0);
  });
});
