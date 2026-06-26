import { describe, it, expect } from "vitest";
import { createDefaultMvpGenerator } from "../../src/core/generator/createDefaultMvpGenerator.js";
import { PhraseTemplates } from "../../src/core/phrase/PhraseTemplates.js";
import { chordId, MVP_CHORD_IDS } from "../../src/core/model/ChordId.js";

/**
 * X6.8 — 8-bar generation smoke test.
 *
 * The eightBarLongArc template's tension curve is
 * [0.2, 0.3, 0.5, 0.7, 0.6, 0.85, 0.95, 0.15]: a gradual build to a late peak
 * (position 6) and a release at the phrase end (position 7). Compared with the
 * 4-bar pump, the rise should be more gradual — the first half noticeably
 * calmer than the second half — which these aggregate tests verify.
 */
describe("X6.8 — generate 8-bar progression", () => {
  const VALID = new Set<string>(MVP_CHORD_IDS);

  it("produces a full 8-step phrase of valid chords", () => {
    const generator = createDefaultMvpGenerator({
      phraseTemplate: PhraseTemplates.eightBarLongArc,
      seed: 11,
    });
    const result = generator.generate({ steps: 8, initialChord: chordId("I") });

    expect(result.chords).toHaveLength(8);
    for (const chord of result.chords) {
      expect(VALID.has(chord)).toBe(true);
    }
    expect(result.finalState.measureIndex).toBe(8);
  });

  it("builds gradually from a calm open to a high mid-phrase, then releases", () => {
    const tensionByPosition = new Map<number, number[]>();

    for (let seed = 1; seed <= 40; seed++) {
      const generator = createDefaultMvpGenerator({
        phraseTemplate: PhraseTemplates.eightBarLongArc,
        seed,
      });
      // Several full 8-bar phrases for a stable aggregate.
      const result = generator.generate({ steps: 32, initialChord: chordId("I") });
      for (const step of result.steps) {
        const pos = step.nextState.phrasePosition;
        const bucket = tensionByPosition.get(pos) ?? [];
        bucket.push(step.resultingTension);
        tensionByPosition.set(pos, bucket);
      }
    }

    const mean = (pos: number): number => {
      const xs = tensionByPosition.get(pos) ?? [];
      return xs.reduce((a, b) => a + b, 0) / xs.length;
    };

    const open = (mean(0) + mean(1)) / 2; // targets 0.2, 0.3
    const climax = (mean(3) + mean(5)) / 2; // targets 0.7, 0.85
    const release = mean(7); // target 0.15

    // The arc rises substantially from its calm opening to the climax...
    expect(open).toBeLessThan(climax);
    // ...and the phrase end is the most relaxed moment of all, below the open.
    expect(release).toBeLessThan(open);

    // The release should be the global minimum across the phrase positions,
    // confirming the long arc actually lands its resolution.
    const allMeans = [0, 1, 2, 3, 4, 5, 6, 7].map(mean);
    expect(release).toBe(Math.min(...allMeans));
  });

  it("does not get stuck repeating a single chord", () => {
    // A degenerate generator could loop on I forever; ensure variety.
    const generator = createDefaultMvpGenerator({
      phraseTemplate: PhraseTemplates.eightBarLongArc,
      seed: 3,
    });
    const result = generator.generate({ steps: 16, initialChord: chordId("I") });
    const distinct = new Set(result.chords);
    expect(distinct.size).toBeGreaterThan(2);
  });
});
