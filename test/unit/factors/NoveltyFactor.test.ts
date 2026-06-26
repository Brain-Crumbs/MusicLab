import { describe, it, expect } from "vitest";
import { NoveltyFactor } from "../../../src/core/factors/NoveltyFactor.js";
import { contextFor } from "../../fixtures/factorFixtures.js";
import { chordId } from "../../../src/core/model/ChordId.js";
import type { FactorContext } from "../../../src/core/factors/FactorContext.js";

const factor = new NoveltyFactor();

describe("NoveltyFactor", () => {
  it("penalises a chord that has been played repeatedly", () => {
    const raw = factor.score(
      contextFor("I", "IV", {
        state: { repetitionCounts: { [chordId("IV")]: 3 } },
      }),
    ).rawScore;
    expect(raw).toBeLessThan(0);
  });

  it("rewards a never-played chord with a small freshness bonus", () => {
    const raw = factor.score(contextFor("I", "IV", { state: { repetitionCounts: {} } })).rawScore;
    expect(raw).toBeGreaterThan(0);
  });

  it("penalises more heavily as the play count grows", () => {
    const once = factor.score(
      contextFor("I", "IV", { state: { repetitionCounts: { [chordId("IV")]: 1 } } }),
    ).rawScore;
    const many = factor.score(
      contextFor("I", "IV", { state: { repetitionCounts: { [chordId("IV")]: 4 } } }),
    ).rawScore;
    expect(many).toBeLessThan(once);
  });

  it("applies an extra penalty for immediately repeating the current chord", () => {
    // Hand-build a context where the candidate equals the current chord.
    const base = contextFor("I", "IV", {
      state: { repetitionCounts: { [chordId("I")]: 1 } },
    });
    const immediate: FactorContext = {
      ...base,
      toChord: base.fromChord, // landing back on "I", the current chord
    };
    const rawImmediate = factor.score(immediate).rawScore;

    const nonImmediate = factor.score(
      contextFor("I", "IV", { state: { repetitionCounts: { [chordId("IV")]: 1 } } }),
    ).rawScore;

    expect(rawImmediate).toBeLessThan(nonImmediate);
  });
});
