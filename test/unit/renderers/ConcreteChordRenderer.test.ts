import { describe, it, expect } from "vitest";
import {
  ConcreteChordRenderer,
  defaultMvpResolver,
} from "../../../src/renderers/ConcreteChordRenderer.js";
import { ChordCatalog } from "../../../src/core/topology/ChordCatalog.js";
import { chordId } from "../../../src/core/model/ChordId.js";
import type { Chord } from "../../../src/core/model/Chord.js";
import type { MusicalKey } from "../../../src/core/model/MusicalState.js";

const byId = new Map<string, Chord>(
  ChordCatalog.majorKeyMvp().map((c) => [c.id, c]),
);
const chord = (id: string): Chord => {
  const c = byId.get(id);
  if (c === undefined) throw new Error(`unknown chord "${id}"`);
  return c;
};

describe("ConcreteChordRenderer", () => {
  const renderer = new ConcreteChordRenderer();
  const render = (id: string, key: MusicalKey): string =>
    renderer.renderChord(chord(id), key);

  // -------------------------------------------------------------------------
  // Spec examples from PROJECT_OVERVIEW
  // -------------------------------------------------------------------------

  it("renders V7 in C major as G7", () => {
    expect(render("V7", "C")).toBe("G7");
  });

  it("renders bVII in C major as Bb (flat spelling, never A#)", () => {
    expect(render("bVII", "C")).toBe("Bb");
  });

  // -------------------------------------------------------------------------
  // Full C-major triad/seventh set
  // -------------------------------------------------------------------------

  it("renders the whole MVP catalog correctly in C major", () => {
    const expected: Record<string, string> = {
      I: "C",
      ii: "Dm",
      iii: "Em",
      IV: "F",
      V: "G",
      V7: "G7",
      vi: "Am",
      "vii°": "Bdim",
      bVII: "Bb",
    };
    for (const [id, symbol] of Object.entries(expected)) {
      expect(render(id, "C"), `${id} in C`).toBe(symbol);
    }
  });

  // -------------------------------------------------------------------------
  // Transposition across keys
  // -------------------------------------------------------------------------

  it("transposes the tonic to the key root", () => {
    expect(render("I", "G")).toBe("G");
    expect(render("I", "Eb")).toBe("Eb");
    expect(render("I", "F#")).toBe("F#");
  });

  it("renders dominant sevenths in sharp keys", () => {
    expect(render("V7", "G")).toBe("D7");
    expect(render("V7", "D")).toBe("A7");
    expect(render("V7", "A")).toBe("E7");
  });

  it("renders dominant sevenths in flat keys", () => {
    expect(render("V7", "F")).toBe("C7");
    expect(render("V7", "Bb")).toBe("F7");
    expect(render("V7", "Eb")).toBe("Bb7");
  });

  it("spells bVII relative to each key (one whole step below the tonic)", () => {
    expect(render("bVII", "G")).toBe("F"); // G major: bVII = F natural
    expect(render("bVII", "D")).toBe("C"); // D major: bVII = C natural
    expect(render("bVII", "F")).toBe("Eb"); // F major: bVII = Eb
    expect(render("bVII", "A")).toBe("G"); // A major: bVII = G natural
  });

  it("keeps subdominant spelling sane in flat keys", () => {
    expect(render("IV", "F")).toBe("Bb");
    expect(render("IV", "Eb")).toBe("Ab");
    expect(render("IV", "Bb")).toBe("Eb");
  });

  it("renders minor and diminished qualities with transposition", () => {
    expect(render("ii", "G")).toBe("Am");
    expect(render("vi", "G")).toBe("Em");
    expect(render("vii°", "G")).toBe("F#dim");
  });

  // -------------------------------------------------------------------------
  // Symbol customisation
  // -------------------------------------------------------------------------

  it("supports custom quality symbols", () => {
    const custom = new ConcreteChordRenderer({ diminished: "°", minor: "-" });
    expect(custom.renderChord(chord("vii°"), "C")).toBe("B°");
    expect(custom.renderChord(chord("ii"), "C")).toBe("D-");
  });

  // -------------------------------------------------------------------------
  // Sequence rendering
  // -------------------------------------------------------------------------

  it("renders a sequence via the default MVP resolver", () => {
    const ids = ["I", "IV", "V7", "I"].map(chordId);
    expect(renderer.renderSequence(ids, "C")).toEqual(["C", "F", "G7", "C"]);
  });

  it("renders a sequence via an explicit resolver in another key", () => {
    const ids = ["I", "vi", "ii", "V7"].map(chordId);
    expect(renderer.renderSequence(ids, "G", defaultMvpResolver())).toEqual([
      "G",
      "Em",
      "Am",
      "D7",
    ]);
  });

  it("renderChords preserves order", () => {
    const chords = ["bVII", "IV", "I"].map(chord);
    expect(renderer.renderChords(chords, "C")).toEqual(["Bb", "F", "C"]);
  });
});
