import { describe, it, expect } from "vitest";
import { ChordCatalog } from "../../../../src/core/topology/ChordCatalog.js";
import type { Chord } from "../../../../src/core/model/Chord.js";
import type { MusicalKey } from "../../../../src/core/model/MusicalState.js";
import { ChordToneResolver } from "../../../../src/midi/mapping/ChordToneResolver.js";
import { ChordVoicingEngine } from "../../../../src/midi/mapping/ChordVoicingEngine.js";

const catalog = new Map<string, Chord>(ChordCatalog.majorKeyMvp().map((c) => [c.id, c]));
const chord = (id: string): Chord => {
  const c = catalog.get(id);
  if (c === undefined) throw new Error(`unknown chord "${id}"`);
  return c;
};

function midiNotes(id: string, key: MusicalKey, preferredOctave = 4): number[] {
  const tones = ChordToneResolver.resolve({ chord: chord(id), key });
  return [...ChordVoicingEngine.voice({ chordTones: tones, preferredOctave, voicing: "closed" })];
}

// ---------------------------------------------------------------------------
// MIDI-2.6 — Diatonic chords in C major (preferredOctave: 4)
// ---------------------------------------------------------------------------

describe("MIDI-2.6 — diatonic chords in C major", () => {
  it("I  → C E G   → 60 64 67", () => {
    expect(midiNotes("I", "C")).toEqual([60, 64, 67]);
  });

  it("ii → D F A   → 62 65 69", () => {
    expect(midiNotes("ii", "C")).toEqual([62, 65, 69]);
  });

  it("iii → E G B  → 64 67 71", () => {
    expect(midiNotes("iii", "C")).toEqual([64, 67, 71]);
  });

  it("IV → F A C   → 65 69 72", () => {
    expect(midiNotes("IV", "C")).toEqual([65, 69, 72]);
  });

  it("V  → G B D   → 67 71 74", () => {
    expect(midiNotes("V", "C")).toEqual([67, 71, 74]);
  });

  it("vi → A C E   → 69 72 76", () => {
    expect(midiNotes("vi", "C")).toEqual([69, 72, 76]);
  });

  it("vii° → B D F → 71 74 77", () => {
    expect(midiNotes("vii°", "C")).toEqual([71, 74, 77]);
  });
});

// ---------------------------------------------------------------------------
// MIDI-2.7 — Special chords: V7 and bVII in C major
// ---------------------------------------------------------------------------

describe("MIDI-2.7 — special chords in C major", () => {
  it("V7  → G B D F → 67 71 74 77", () => {
    expect(midiNotes("V7", "C")).toEqual([67, 71, 74, 77]);
  });

  it("bVII → Bb D F → 70 74 77", () => {
    expect(midiNotes("bVII", "C")).toEqual([70, 74, 77]);
  });
});

// ---------------------------------------------------------------------------
// Transposition checks
// ---------------------------------------------------------------------------

describe("transposition checks", () => {
  it("I in G  → G B D  → 67 71 74", () => {
    expect(midiNotes("I", "G")).toEqual([67, 71, 74]);
  });

  it("bVII in G → F A C → 65 69 72 (F major chord)", () => {
    expect(midiNotes("bVII", "G")).toEqual([65, 69, 72]);
  });

  it("V7 in G → D F# A C → 62 66 69 72", () => {
    expect(midiNotes("V7", "G")).toEqual([62, 66, 69, 72]);
  });

  it("I in Bb → Bb4 D5 F5 → 70 74 77", () => {
    expect(midiNotes("I", "Bb")).toEqual([70, 74, 77]);
  });

  it("V7 in F → C E G Bb → 60 64 67 70", () => {
    expect(midiNotes("V7", "F")).toEqual([60, 64, 67, 70]);
  });
});
