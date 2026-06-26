import { describe, it, expect, beforeAll } from "vitest";
import { StateTransitioner } from "../../../src/core/state/StateTransitioner.js";
import { InitialStateFactory } from "../../../src/core/state/InitialStateFactory.js";
import { CadenceClassifier } from "../../../src/core/state/CadenceClassifier.js";
import { TensionEstimator } from "../../../src/core/state/TensionEstimator.js";
import { SurpriseBudgetUpdater } from "../../../src/core/state/SurpriseBudgetUpdater.js";
import { MajorKeyTopologyBuilder } from "../../../src/core/topology/MajorKeyTopologyBuilder.js";
import { PhraseEngine } from "../../../src/core/phrase/PhraseEngine.js";
import { PhraseTemplates } from "../../../src/core/phrase/PhraseTemplates.js";
import { createDefaultMvpConfig } from "../../../src/core/model/GenerationConfig.js";
import { HarmonicRegion } from "../../../src/core/model/HarmonicFunction.js";
import { CadenceType } from "../../../src/core/model/CadenceState.js";
import { CircleDirection } from "../../../src/core/model/MusicalState.js";
import type { MusicalState } from "../../../src/core/model/MusicalState.js";
import type { HarmonicTopology } from "../../../src/core/model/HarmonicTopology.js";
import { chordId } from "../../../src/core/model/ChordId.js";

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

let topology: HarmonicTopology;
let transitioner: StateTransitioner;
const config = createDefaultMvpConfig({ seed: 42 });
const phraseEngine = new PhraseEngine(PhraseTemplates.fourBarResolutionPump);

beforeAll(() => {
  topology = new MajorKeyTopologyBuilder().build();
  transitioner = StateTransitioner.createDefault();
});

function makeInitialState(chord = "I"): MusicalState {
  return InitialStateFactory.create(
    { steps: 8, initialChord: chordId(chord) },
    config,
    topology,
  );
}

function transitionTo(state: MusicalState, from: string, to: string): MusicalState {
  const edge = topology
    .getOutgoingEdges(chordId(from))
    .find((e) => e.to === chordId(to));
  if (!edge) throw new Error(`No edge ${from} -> ${to} in topology`);
  return transitioner.applyTransition({ state, selectedEdge: edge, phraseEngine, config, topology });
}

// ---------------------------------------------------------------------------
// Basic chord transition
// ---------------------------------------------------------------------------

describe("StateTransitioner — basic chord update", () => {
  it("updates currentChord to the target of the selected edge", () => {
    const state = makeInitialState("I");
    const next = transitionTo(state, "I", "IV");
    expect(next.currentChord).toBe("IV");
  });

  it("sets previousChord to the chord we came from", () => {
    const state = makeInitialState("I");
    const next = transitionTo(state, "I", "IV");
    expect(next.previousChord).toBe("I");
  });

  it("adds the new chord to recentChords", () => {
    const state = makeInitialState("I");
    const next = transitionTo(state, "I", "IV");
    expect(next.recentChords).toContain("IV");
  });

  it("keeps recentChords within the configured window", () => {
    let state = makeInitialState("I");
    // Make 10 transitions — window is 8
    const sequence = ["IV", "V7", "I", "ii", "V", "I", "IV", "V7", "I"];
    for (const target of sequence) {
      state = transitionTo(state, state.currentChord, target);
    }
    expect(state.recentChords.length).toBeLessThanOrEqual(config.recentChordsWindow);
  });

  it("increments measureIndex on each step", () => {
    const state = makeInitialState("I");
    const next = transitionTo(state, "I", "IV");
    expect(next.measureIndex).toBe(state.measureIndex + 1);
  });
});

// ---------------------------------------------------------------------------
// Phrase position
// ---------------------------------------------------------------------------

describe("StateTransitioner — phrase position", () => {
  it("increments phrasePosition by 1", () => {
    const state = makeInitialState("I");
    const next = transitionTo(state, "I", "IV");
    expect(next.phrasePosition).toBe(1);
  });

  it("wraps phrasePosition back to 0 after phraseLength steps", () => {
    let state = makeInitialState("I");
    // 4-bar template: positions 0, 1, 2, 3 then back to 0
    state = transitionTo(state, "I", "IV");   // pos 1
    state = transitionTo(state, "IV", "V7");  // pos 2
    state = transitionTo(state, "V7", "I");   // pos 3
    state = transitionTo(state, "I", "IV");   // pos 0 (wraps)
    expect(state.phrasePosition).toBe(0);
  });

  it("phraseLength does not change across transitions", () => {
    const state = makeInitialState("I");
    const next = transitionTo(state, "I", "V7");
    expect(next.phraseLength).toBe(state.phraseLength);
  });
});

// ---------------------------------------------------------------------------
// Tension
// ---------------------------------------------------------------------------

describe("StateTransitioner — tension", () => {
  it("currentTension is in [0, 1] after every transition", () => {
    let state = makeInitialState("I");
    const sequence = ["IV", "V7", "I", "vi", "ii", "V", "I"];
    for (const target of sequence) {
      state = transitionTo(state, state.currentChord, target);
      expect(state.currentTension).toBeGreaterThanOrEqual(0);
      expect(state.currentTension).toBeLessThanOrEqual(1);
    }
  });

  it("V7 chord has higher tension than I chord", () => {
    const stateAtI = makeInitialState("I");
    const stateAtV7 = transitionTo(makeInitialState("I"), "I", "V7");
    expect(stateAtV7.currentTension).toBeGreaterThan(stateAtI.currentTension);
  });

  it("resolving V7 -> I reduces tension", () => {
    const stateAtV7 = transitionTo(makeInitialState("I"), "I", "V7");
    const stateAtI = transitionTo(stateAtV7, "V7", "I");
    expect(stateAtI.currentTension).toBeLessThan(stateAtV7.currentTension);
  });

  it("targetTension follows the phrase template curve", () => {
    let state = makeInitialState("I");
    const template = PhraseTemplates.fourBarResolutionPump;

    // Position 0 → 1: target should reflect curve[1]
    state = transitionTo(state, "I", "IV");
    expect(state.targetTension).toBeCloseTo(template.tensionCurve[1]!, 5);
  });

  it("tensionVelocity reflects change from previous step", () => {
    const stateAtI = makeInitialState("I");
    const stateAtV7 = transitionTo(stateAtI, "I", "V7");
    const expectedVelocity = stateAtV7.currentTension - stateAtI.currentTension;
    expect(stateAtV7.tensionVelocity).toBeCloseTo(expectedVelocity, 10);
  });
});

// ---------------------------------------------------------------------------
// Cadence detection
// ---------------------------------------------------------------------------

describe("StateTransitioner — cadence detection", () => {
  it("V7 -> I produces a PerfectAuthentic cadence", () => {
    const state = transitionTo(makeInitialState("I"), "I", "V7");
    const resolved = transitionTo(state, "V7", "I");
    expect(resolved.cadenceState.lastCadenceType).toBe(CadenceType.PerfectAuthentic);
    expect(resolved.cadenceState.lastCadenceToChord).toBe("I");
  });

  it("V -> I produces an Authentic cadence", () => {
    const state = transitionTo(makeInitialState("I"), "I", "V");
    const resolved = transitionTo(state, "V", "I");
    expect(resolved.cadenceState.lastCadenceType).toBe(CadenceType.Authentic);
  });

  it("V7 -> vi produces a Deceptive cadence", () => {
    const state = transitionTo(makeInitialState("I"), "I", "V7");
    const deceptive = transitionTo(state, "V7", "vi");
    expect(deceptive.cadenceState.lastCadenceType).toBe(CadenceType.Deceptive);
  });

  it("bVII -> I produces a Modal cadence", () => {
    const state = transitionTo(makeInitialState("I"), "I", "bVII");
    const modal = transitionTo(state, "bVII", "I");
    expect(modal.cadenceState.lastCadenceType).toBe(CadenceType.Modal);
  });

  it("isApproachingCadence is true when current chord is dominant", () => {
    const state = transitionTo(makeInitialState("I"), "I", "V7");
    expect(state.cadenceState.isApproachingCadence).toBe(true);
  });

  it("isApproachingCadence is false when current chord is tonic", () => {
    const state = transitionTo(makeInitialState("I"), "I", "IV");
    expect(state.cadenceState.isApproachingCadence).toBe(false);
  });

  it("stepsSinceLastCadence increments after cadence", () => {
    let state = transitionTo(makeInitialState("I"), "I", "V7");
    state = transitionTo(state, "V7", "I"); // cadence completes, stepsSince = 0
    const firstStep = state.cadenceState.stepsSinceLastCadence;
    state = transitionTo(state, "I", "IV");
    expect(state.cadenceState.stepsSinceLastCadence).toBe((firstStep ?? 0) + 1);
  });
});

// ---------------------------------------------------------------------------
// Harmonic region
// ---------------------------------------------------------------------------

describe("StateTransitioner — harmonic region", () => {
  it("lands in Dominant region after moving to V7", () => {
    const state = transitionTo(makeInitialState("I"), "I", "V7");
    expect(state.harmonicRegion).toBe(HarmonicRegion.Dominant);
  });

  it("lands in Tonic region after moving to I", () => {
    const state = transitionTo(
      transitionTo(makeInitialState("I"), "I", "V7"),
      "V7",
      "I",
    );
    expect(state.harmonicRegion).toBe(HarmonicRegion.Tonic);
  });

  it("lands in Predominant region after moving to ii", () => {
    const state = transitionTo(makeInitialState("I"), "I", "ii");
    expect(state.harmonicRegion).toBe(HarmonicRegion.Predominant);
  });

  it("lands in Modal region after moving to bVII", () => {
    const state = transitionTo(makeInitialState("I"), "I", "bVII");
    expect(state.harmonicRegion).toBe(HarmonicRegion.Modal);
  });
});

// ---------------------------------------------------------------------------
// Time-since counters
// ---------------------------------------------------------------------------

describe("StateTransitioner — time-since counters", () => {
  it("timeSinceTonic resets to 0 when landing on I", () => {
    let state = makeInitialState("I");
    state = transitionTo(state, "I", "IV");  // tonic counter starts rising
    state = transitionTo(state, "IV", "V7");
    state = transitionTo(state, "V7", "I");  // back to tonic
    expect(state.timeSinceTonic).toBe(0);
  });

  it("timeSinceTonic increments when not on tonic", () => {
    const state = makeInitialState("I");
    const next = transitionTo(state, "I", "V7");
    expect(next.timeSinceTonic).toBe(state.timeSinceTonic + 1);
  });

  it("timeSinceDominant resets to 0 when landing on V7", () => {
    const state = transitionTo(makeInitialState("I"), "I", "V7");
    expect(state.timeSinceDominant).toBe(0);
  });

  it("timeSinceSubdominant resets to 0 when landing on ii", () => {
    const state = transitionTo(makeInitialState("I"), "I", "ii");
    expect(state.timeSinceSubdominant).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Repetition tracking
// ---------------------------------------------------------------------------

describe("StateTransitioner — repetition tracking", () => {
  it("increments repetitionCount for the newly arrived chord", () => {
    const state = makeInitialState("I");
    const next = transitionTo(state, "I", "IV");
    expect(next.repetitionCounts[chordId("IV")]).toBe(1);
  });

  it("accumulates counts across multiple visits", () => {
    let state = makeInitialState("I");
    state = transitionTo(state, "I", "IV");
    state = transitionTo(state, "IV", "V7");
    state = transitionTo(state, "V7", "I");
    state = transitionTo(state, "I", "IV");
    // IV has been visited twice
    expect(state.repetitionCounts[chordId("IV")]).toBe(2);
  });

  it("does not mutate the previous state's repetition counts", () => {
    const state = makeInitialState("I");
    const countBefore = state.repetitionCounts[chordId("IV")] ?? 0;
    transitionTo(state, "I", "IV");
    expect(state.repetitionCounts[chordId("IV")] ?? 0).toBe(countBefore);
  });
});

// ---------------------------------------------------------------------------
// Surprise budget
// ---------------------------------------------------------------------------

describe("StateTransitioner — surprise budget", () => {
  it("depletes budget by the edge surpriseCost", () => {
    const state = makeInitialState("I");
    // bVII is a modal chord; I->bVII has non-zero surprise cost
    const edge = topology
      .getOutgoingEdges(chordId("I"))
      .find((e) => e.to === chordId("bVII"));
    if (!edge) return; // skip if edge doesn't exist in topology
    const next = transitioner.applyTransition({
      state,
      selectedEdge: edge,
      phraseEngine,
      config,
      topology,
    });
    const expected = Math.max(
      0,
      Math.min(
        config.surpriseConfig.maxBudget,
        state.surpriseBudget - edge.surpriseCost + config.surpriseConfig.replenishRate,
      ),
    );
    expect(next.surpriseBudget).toBeCloseTo(expected, 10);
  });

  it("replenishes budget by replenishRate each step", () => {
    // Use a common (zero-cost) edge and check replenishment
    const state = makeInitialState("I");
    const edge = topology
      .getOutgoingEdges(chordId("I"))
      .find((e) => e.surpriseCost === 0);
    if (!edge) return;
    const next = transitioner.applyTransition({
      state,
      selectedEdge: edge,
      phraseEngine,
      config,
      topology,
    });
    const expected = Math.min(
      config.surpriseConfig.maxBudget,
      state.surpriseBudget + config.surpriseConfig.replenishRate,
    );
    expect(next.surpriseBudget).toBeCloseTo(expected, 10);
  });

  it("budget never exceeds maxBudget", () => {
    let state = makeInitialState("I");
    const sequence = ["IV", "V7", "I", "IV", "V7", "I", "IV", "V7", "I"];
    for (const target of sequence) {
      state = transitionTo(state, state.currentChord, target);
      expect(state.surpriseBudget).toBeLessThanOrEqual(config.surpriseConfig.maxBudget);
    }
  });

  it("budget never goes below 0", () => {
    let state: MusicalState = {
      ...makeInitialState("I"),
      surpriseBudget: 0,
    };
    const sequence = ["bVII", "I", "bVII", "I"];
    for (const target of sequence) {
      state = transitionTo(state, state.currentChord, target);
      expect(state.surpriseBudget).toBeGreaterThanOrEqual(0);
    }
  });
});

// ---------------------------------------------------------------------------
// Immutability
// ---------------------------------------------------------------------------

describe("StateTransitioner — immutability", () => {
  it("does not mutate the original state object", () => {
    const state = makeInitialState("I");
    const originalChord = state.currentChord;
    const originalPosition = state.phrasePosition;
    const originalBudget = state.surpriseBudget;

    transitionTo(state, "I", "IV");

    expect(state.currentChord).toBe(originalChord);
    expect(state.phrasePosition).toBe(originalPosition);
    expect(state.surpriseBudget).toBe(originalBudget);
  });
});

// ---------------------------------------------------------------------------
// Circle direction
// ---------------------------------------------------------------------------

describe("StateTransitioner — circle direction", () => {
  it("records Flatward direction for V7 -> I (DominantToTonic)", () => {
    const state = transitionTo(makeInitialState("I"), "I", "V7");
    const resolved = transitionTo(state, "V7", "I");
    expect(resolved.recentCircleDirection).toBe(CircleDirection.Flatward);
  });

  it("records Sharpward direction for I -> V7 (TonicToDominant)", () => {
    const state = transitionTo(makeInitialState("I"), "I", "V7");
    expect(state.recentCircleDirection).toBe(CircleDirection.Sharpward);
  });
});

// ---------------------------------------------------------------------------
// StateTransitioner.createDefault
// ---------------------------------------------------------------------------

describe("StateTransitioner.createDefault", () => {
  it("creates a valid transitioner that can perform a full transition", () => {
    const t = StateTransitioner.createDefault();
    const state = makeInitialState("I");
    const edge = topology.getOutgoingEdges(chordId("I")).find((e) => e.to === chordId("V7"))!;
    const next = t.applyTransition({ state, selectedEdge: edge, phraseEngine, config, topology });
    expect(next.currentChord).toBe("V7");
  });
});

// ---------------------------------------------------------------------------
// CadenceClassifier — unit tests
// ---------------------------------------------------------------------------

describe("CadenceClassifier — static classify", () => {
  it("detects PerfectAuthentic for V7 -> I", () => {
    const fromChord = topology.getChord(chordId("V7"));
    const toChord = topology.getChord(chordId("I"));
    const edge = topology
      .getOutgoingEdges(chordId("V7"))
      .find((e) => e.to === chordId("I"))!;
    const result = CadenceClassifier.classify(fromChord, toChord, edge, 1, 4, {
      isApproachingCadence: false,
    });
    expect(result.lastCadenceType).toBe(CadenceType.PerfectAuthentic);
  });

  it("sets isApproachingCadence when arriving at a dominant chord", () => {
    const fromChord = topology.getChord(chordId("I"));
    const toChord = topology.getChord(chordId("V7"));
    const edge = topology
      .getOutgoingEdges(chordId("I"))
      .find((e) => e.to === chordId("V7"))!;
    const result = CadenceClassifier.classify(fromChord, toChord, edge, 1, 4, {
      isApproachingCadence: false,
    });
    expect(result.isApproachingCadence).toBe(true);
    expect(result.expectedCadenceType).toBe(CadenceType.PerfectAuthentic);
  });
});

// ---------------------------------------------------------------------------
// TensionEstimator — unit tests
// ---------------------------------------------------------------------------

describe("TensionEstimator", () => {
  it("returns tension in [0, 1] for all MVP chords", () => {
    const chordIds = ["I", "ii", "iii", "IV", "V", "V7", "vi", "vii°", "bVII"];
    for (const id of chordIds) {
      const chord = topology.getChord(chordId(id));
      const tension = TensionEstimator.estimate(chord, null, 0.5);
      expect(tension, `tension for ${id}`).toBeGreaterThanOrEqual(0);
      expect(tension, `tension for ${id}`).toBeLessThanOrEqual(1);
    }
  });

  it("V7 has higher static tension than I", () => {
    const i = topology.getChord(chordId("I"));
    const v7 = topology.getChord(chordId("V7"));
    expect(TensionEstimator.estimate(v7, null, 0)).toBeGreaterThan(
      TensionEstimator.estimate(i, null, 0),
    );
  });
});

// ---------------------------------------------------------------------------
// SurpriseBudgetUpdater — unit tests
// ---------------------------------------------------------------------------

describe("SurpriseBudgetUpdater", () => {
  const sc = config.surpriseConfig;

  it("reduces budget by edge cost", () => {
    const edge = topology
      .getOutgoingEdges(chordId("I"))
      .find((e) => e.surpriseCost > 0);
    if (!edge) return;
    const result = SurpriseBudgetUpdater.update(sc.initialBudget, edge, sc);
    expect(result).toBeLessThan(sc.initialBudget + sc.replenishRate);
  });

  it("clamps result to [0, maxBudget]", () => {
    // Create an artificial edge with huge cost
    const fakeEdge = {
      ...topology.getOutgoingEdges(chordId("I"))[0]!,
      surpriseCost: 1000,
    };
    const result = SurpriseBudgetUpdater.update(0, fakeEdge, sc);
    expect(result).toBeGreaterThanOrEqual(0);
  });

  it("canAfford returns true when budget covers cost", () => {
    const fakeEdge = {
      ...topology.getOutgoingEdges(chordId("I"))[0]!,
      surpriseCost: 1,
    };
    expect(SurpriseBudgetUpdater.canAfford(5, fakeEdge)).toBe(true);
    expect(SurpriseBudgetUpdater.canAfford(0, fakeEdge)).toBe(false);
  });
});
