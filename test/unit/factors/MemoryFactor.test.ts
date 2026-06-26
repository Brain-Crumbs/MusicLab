import { describe, it, expect } from "vitest";
import { MemoryFactor } from "../../../src/core/factors/MemoryFactor.js";
import { contextFor } from "../../fixtures/factorFixtures.js";
import { chordId } from "../../../src/core/model/ChordId.js";

const factor = new MemoryFactor();

describe("MemoryFactor", () => {
  it("pulls home more strongly the longer it has been since a tonic", () => {
    const recent = factor.score(contextFor("V", "I", { state: { timeSinceTonic: 2 } })).rawScore;
    const distant = factor.score(contextFor("V", "I", { state: { timeSinceTonic: 6 } })).rawScore;
    expect(distant).toBeGreaterThan(recent);
  });

  it("gives no home pull within the grace period", () => {
    const raw = factor.score(contextFor("V", "I", { state: { timeSinceTonic: 1 } })).rawScore;
    expect(raw).toBe(0);
  });

  it("does not pull home toward a non-tonic chord", () => {
    // V -> IV: IV is predominant, so no home pull regardless of timeSinceTonic.
    const raw = factor.score(
      contextFor("V", "IV", { state: { timeSinceTonic: 8, recentChords: [] } }),
    ).rawScore;
    expect(raw).toBe(0);
  });

  it("rewards reinforcing a non-tonic chord still in recent memory", () => {
    // I -> ii where ii was heard recently and is not the current chord.
    const raw = factor.score(
      contextFor("I", "ii", {
        state: { timeSinceTonic: 0, recentChords: [chordId("I"), chordId("ii")] },
      }),
    ).rawScore;
    expect(raw).toBeGreaterThan(0);
  });

  it("caps the home pull at its maximum", () => {
    const raw = factor.score(
      contextFor("V", "I", { state: { timeSinceTonic: 100, recentChords: [] } }),
    ).rawScore;
    expect(raw).toBeLessThanOrEqual(1.2 + 1e-9);
  });
});
