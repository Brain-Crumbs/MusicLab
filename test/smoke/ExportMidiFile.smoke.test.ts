import { describe, it, expect } from "vitest";
import { createDefaultMvpGenerator } from "../../src/core/generator/createDefaultMvpGenerator.js";
import { chordId } from "../../src/core/model/ChordId.js";
import { exportMidiFromGeneration } from "../../src/midi/export/exportMidiFromGeneration.js";

/**
 * MIDI-4.6 — `.mid` export smoke test.
 *
 * Byte-exact output is library-version sensitive (that's why MIDI-4.7 snapshots
 * the *intent* instead).  Here we only assert the structural contract every
 * Standard MIDI File must satisfy: a non-empty stream that opens with the
 * `MThd` header chunk and contains at least one `MTrk` track chunk.
 */
const SEED = 42;

/** ASCII bytes for the two Standard MIDI File chunk markers. */
const MThd = [0x4d, 0x54, 0x68, 0x64];
const MTrk = [0x4d, 0x54, 0x72, 0x6b];

function startsWith(bytes: Uint8Array, marker: readonly number[]): boolean {
  return marker.every((b, i) => bytes[i] === b);
}

function indexOfChunk(bytes: Uint8Array, marker: readonly number[]): number {
  for (let i = 0; i + marker.length <= bytes.length; i++) {
    if (marker.every((b, j) => bytes[i + j] === b)) return i;
  }
  return -1;
}

describe("MIDI-4.6 — exportMidiFromGeneration produces a valid .mid stream", () => {
  const result = createDefaultMvpGenerator({ key: "C", seed: SEED }).generate({
    steps: 8,
    initialChord: chordId("I"),
  });

  it("returns a non-empty Uint8Array opening with the MThd header", () => {
    const bytes = exportMidiFromGeneration(result, { key: "C", bpm: 90 });

    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes.length).toBeGreaterThan(0);
    expect(startsWith(bytes, MThd)).toBe(true);
  });

  it("contains an MTrk track chunk after the header", () => {
    const bytes = exportMidiFromGeneration(result, { key: "C", bpm: 90 });

    const trackAt = indexOfChunk(bytes, MTrk);
    expect(trackAt).toBeGreaterThan(0); // after the 14-byte MThd header
  });

  it("works with default config (no overrides)", () => {
    const bytes = exportMidiFromGeneration(result);

    expect(bytes.length).toBeGreaterThan(0);
    expect(startsWith(bytes, MThd)).toBe(true);
  });
});
