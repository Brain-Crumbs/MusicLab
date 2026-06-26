import { describe, it, expect } from "vitest";
import { ChordCatalog } from "../../../src/core/topology/ChordCatalog.js";
import { ChordQuality } from "../../../src/core/model/Chord.js";
import { HarmonicFunction, SourceMode } from "../../../src/core/model/HarmonicFunction.js";

describe("ChordCatalog.majorKeyMvp", () => {
  const chords = ChordCatalog.majorKeyMvp();
  const byId = new Map(chords.map((c) => [c.id, c]));

  // -------------------------------------------------------------------------
  // Structure
  // -------------------------------------------------------------------------

  it("returns exactly 9 chords", () => {
    expect(chords).toHaveLength(9);
  });

  it("contains all expected chord IDs", () => {
    const expected = ["I", "ii", "iii", "IV", "V", "V7", "vi", "vii°", "bVII"];
    for (const id of expected) {
      expect(byId.has(id), `missing chord "${id}"`).toBe(true);
    }
  });

  it("has unique IDs", () => {
    const ids = chords.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("has empty extensions on all chords", () => {
    for (const chord of chords) {
      expect(chord.extensions, `${chord.id} should have no extensions`).toHaveLength(0);
    }
  });

  // -------------------------------------------------------------------------
  // Scale degrees and accidentals
  // -------------------------------------------------------------------------

  it("assigns correct scale degrees", () => {
    const expected: Record<string, number> = {
      I: 1, ii: 2, iii: 3, IV: 4, V: 5, V7: 5, vi: 6, "vii°": 7, bVII: 7,
    };
    for (const [id, degree] of Object.entries(expected)) {
      expect(byId.get(id)?.scaleDegree, `${id} scaleDegree`).toBe(degree);
    }
  });

  it("assigns zero accidentalOffset to all diatonic chords", () => {
    const diatonic = ["I", "ii", "iii", "IV", "V", "V7", "vi", "vii°"];
    for (const id of diatonic) {
      expect(byId.get(id)?.accidentalOffset, `${id} accidentalOffset`).toBe(0);
    }
  });

  it("assigns accidentalOffset -1 to bVII", () => {
    expect(byId.get("bVII")?.accidentalOffset).toBe(-1);
  });

  // -------------------------------------------------------------------------
  // Chord quality
  // -------------------------------------------------------------------------

  it("assigns major quality to major chords", () => {
    for (const id of ["I", "IV", "V", "bVII"]) {
      expect(byId.get(id)?.quality, `${id} quality`).toBe(ChordQuality.Major);
    }
  });

  it("assigns minor quality to minor chords", () => {
    for (const id of ["ii", "iii", "vi"]) {
      expect(byId.get(id)?.quality, `${id} quality`).toBe(ChordQuality.Minor);
    }
  });

  it("assigns DominantSeventh quality to V7", () => {
    expect(byId.get("V7")?.quality).toBe(ChordQuality.DominantSeventh);
  });

  it("assigns Diminished quality to vii°", () => {
    expect(byId.get("vii°")?.quality).toBe(ChordQuality.Diminished);
  });

  // -------------------------------------------------------------------------
  // Harmonic function
  // -------------------------------------------------------------------------

  it("assigns Tonic function to I and vi", () => {
    expect(byId.get("I")?.harmonicFunction).toBe(HarmonicFunction.Tonic);
    expect(byId.get("vi")?.harmonicFunction).toBe(HarmonicFunction.Tonic);
  });

  it("assigns Predominant function to ii and IV", () => {
    expect(byId.get("ii")?.harmonicFunction).toBe(HarmonicFunction.Predominant);
    expect(byId.get("IV")?.harmonicFunction).toBe(HarmonicFunction.Predominant);
  });

  it("assigns Dominant function to V, V7, and vii°", () => {
    expect(byId.get("V")?.harmonicFunction).toBe(HarmonicFunction.Dominant);
    expect(byId.get("V7")?.harmonicFunction).toBe(HarmonicFunction.Dominant);
    expect(byId.get("vii°")?.harmonicFunction).toBe(HarmonicFunction.Dominant);
  });

  it("assigns Modal function to bVII", () => {
    expect(byId.get("bVII")?.harmonicFunction).toBe(HarmonicFunction.Modal);
  });

  it("assigns Mediant function to iii", () => {
    expect(byId.get("iii")?.harmonicFunction).toBe(HarmonicFunction.Mediant);
  });

  // -------------------------------------------------------------------------
  // Source mode
  // -------------------------------------------------------------------------

  it("assigns Diatonic sourceMode to all chords except bVII", () => {
    const diatonic = ["I", "ii", "iii", "IV", "V", "V7", "vi", "vii°"];
    for (const id of diatonic) {
      expect(byId.get(id)?.sourceMode, `${id} sourceMode`).toBe(SourceMode.Diatonic);
    }
  });

  it("assigns Modal sourceMode to bVII", () => {
    expect(byId.get("bVII")?.sourceMode).toBe(SourceMode.Modal);
  });

  // -------------------------------------------------------------------------
  // V and V7 share the same root
  // -------------------------------------------------------------------------

  it("V and V7 share scaleDegree and accidentalOffset", () => {
    const v = byId.get("V")!;
    const v7 = byId.get("V7")!;
    expect(v.scaleDegree).toBe(v7.scaleDegree);
    expect(v.accidentalOffset).toBe(v7.accidentalOffset);
  });

  it("V and V7 differ only in quality", () => {
    const v = byId.get("V")!;
    const v7 = byId.get("V7")!;
    expect(v.quality).not.toBe(v7.quality);
    expect(v7.quality).toBe(ChordQuality.DominantSeventh);
  });
});
