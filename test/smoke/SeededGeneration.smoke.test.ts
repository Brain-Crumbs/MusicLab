import { describe, it, expect } from "vitest";
import { createDefaultMvpGenerator } from "../../src/core/generator/createDefaultMvpGenerator.js";
import { chordId } from "../../src/core/model/ChordId.js";

/**
 * X6.9 — seeded determinism smoke test.
 *
 * Seeded randomness is the engine's reproducibility contract: the same seed
 * must always yield the same progression, distributions included, so runs can
 * be replayed for debugging, testing, and rendering.
 */
describe("X6.9 — seeded generation is deterministic", () => {
  const request = { steps: 12, initialChord: chordId("I") };

  it("two generators with the same seed produce identical chord sequences", () => {
    const a = createDefaultMvpGenerator({ seed: 123 }).generate(request);
    const b = createDefaultMvpGenerator({ seed: 123 }).generate(request);

    expect(a.chords).toEqual(b.chords);
    expect(a.trace.seed).toBe(123);
    expect(b.trace.seed).toBe(123);
  });

  it("reproduces the full per-step distribution and selection, not just chords", () => {
    const a = createDefaultMvpGenerator({ seed: 999 }).generate(request);
    const b = createDefaultMvpGenerator({ seed: 999 }).generate(request);

    expect(a.steps).toHaveLength(b.steps.length);
    for (let i = 0; i < a.steps.length; i++) {
      const sa = a.steps[i]!;
      const sb = b.steps[i]!;
      expect(sa.selectedEdge.id).toBe(sb.selectedEdge.id);
      expect(sa.distribution.entries).toEqual(sb.distribution.entries);
      expect(sa.resultingTension).toBe(sb.resultingTension);
    }
  });

  it("different seeds usually produce different progressions", () => {
    // Not a strict guarantee for any single pair, but across a spread of seeds
    // the generator must not collapse to one fixed output.
    const sequences = new Set<string>();
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
      const result = createDefaultMvpGenerator({ seed }).generate(request);
      sequences.add(result.chords.join("-"));
    }
    expect(sequences.size).toBeGreaterThan(1);
  });

  it("a run can be replayed from the seed recorded on its trace", () => {
    // Omitting the seed picks a random one; the trace records it so the exact
    // run is reproducible.
    const original = createDefaultMvpGenerator().generate(request);
    const recordedSeed = original.trace.seed;
    expect(recordedSeed).toBeTypeOf("number");

    const replay = createDefaultMvpGenerator({ seed: recordedSeed }).generate(
      request,
    );
    expect(replay.chords).toEqual(original.chords);
  });
});
