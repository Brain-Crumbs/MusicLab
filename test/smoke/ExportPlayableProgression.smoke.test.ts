import { describe, it, expect } from "vitest";
import { mkdtempSync, writeFileSync, statSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createDefaultMvpGenerator } from "../../src/core/generator/createDefaultMvpGenerator.js";
import { chordId } from "../../src/core/model/ChordId.js";
import { Mode } from "../../src/core/model/MusicalState.js";
import { exportPlayableChordProgression } from "../../src/playback/exportPlayableChordProgression.js";
import { ChordTimelineBuilder } from "../../src/midi/timeline/ChordTimelineBuilder.js";
import { MidiEventScheduler } from "../../src/midi/timeline/MidiEventScheduler.js";
import { resolveMidiExportConfig } from "../../src/midi/model/MidiExportConfig.js";
import type { GenerationResult } from "../../src/core/generator/GenerationResult.js";
import type { MidiTrack } from "../../src/midi/model/MidiTrack.js";

/**
 * PLAY-7.5 — end-to-end "can I hear it?" smoke test.
 *
 * From a seeded `GenerationResult`, `exportPlayableChordProgression` must return
 * BOTH a structurally-valid `.mid` and a non-silent `.wav`, rendered from one
 * shared track.  Determinism is asserted on the intermediate `MidiTrack`
 * (snapshot intent, not bytes — see the epic's guidance).
 */
const SEED = 42;

const MThd = [0x4d, 0x54, 0x68, 0x64];

function ascii(bytes: Uint8Array, offset: number, len: number): string {
  let s = "";
  for (let i = 0; i < len; i++) s += String.fromCharCode(bytes[offset + i] ?? 0);
  return s;
}

function generate(): GenerationResult {
  return createDefaultMvpGenerator({ key: "C", seed: SEED }).generate({
    steps: 8,
    initialChord: chordId("I"),
  });
}

describe("PLAY-7.5 — exportPlayableChordProgression yields a hearable progression", () => {
  const result = generate();
  const overrides = { key: "C" as const, mode: Mode.Major, bpm: 90 };

  it("returns both a MThd-headed .mid and a header-valid .wav from one call", () => {
    const { midi, wav } = exportPlayableChordProgression(result, overrides);

    expect(midi).toBeInstanceOf(Uint8Array);
    expect(wav).toBeInstanceOf(Uint8Array);

    // MIDI: opens with the Standard MIDI File header chunk.
    expect(midi.length).toBeGreaterThan(0);
    expect(MThd.every((b, i) => midi[i] === b)).toBe(true);

    // WAV: canonical 16-bit PCM RIFF/WAVE header.
    expect(wav.length).toBeGreaterThan(44);
    expect(ascii(wav, 0, 4)).toBe("RIFF");
    expect(ascii(wav, 8, 4)).toBe("WAVE");
    expect(ascii(wav, 12, 4)).toBe("fmt ");
    expect(ascii(wav, 36, 4)).toBe("data");

    const view = new DataView(wav.buffer, wav.byteOffset, wav.byteLength);
    expect(view.getUint16(20, true)).toBe(1); // PCM
    expect(view.getUint16(34, true)).toBe(16); // bitsPerSample
    expect(view.getUint32(40, true)).toBe(wav.length - 44); // dataLen agrees
  });

  it("writes a non-silent .wav (some int16 sample is non-zero)", () => {
    const { wav } = exportPlayableChordProgression(result, overrides);
    const view = new DataView(wav.buffer, wav.byteOffset, wav.byteLength);

    let nonZero = false;
    for (let offset = 44; offset + 2 <= wav.length; offset += 2) {
      if (view.getInt16(offset, true) !== 0) {
        nonZero = true;
        break;
      }
    }
    expect(nonZero).toBe(true);
  });

  it("is deterministic: the same seed yields an identical scheduled track", () => {
    // Rebuild the intermediate track the helper renders from, for two seeded
    // runs.  Asserting on the track (not the bytes) is the epic's "snapshot
    // intent, not bytes" guidance — MIDI bytes are library-version sensitive.
    const config = resolveMidiExportConfig(overrides);
    const trackFrom = (): MidiTrack => {
      const timeline = ChordTimelineBuilder.build({ result: generate(), config });
      return MidiEventScheduler.schedule({ timeline, config });
    };

    expect(trackFrom().notes).toEqual(trackFrom().notes);
  });

  it("works with default config (no overrides)", () => {
    const { midi, wav } = exportPlayableChordProgression(result);
    expect(MThd.every((b, i) => midi[i] === b)).toBe(true);
    expect(wav.length).toBeGreaterThan(44);
  });

  it("can write both files to disk, non-empty", () => {
    const dir = mkdtempSync(join(tmpdir(), "musiclab-playback-"));
    try {
      const { midi, wav } = exportPlayableChordProgression(result, overrides);
      const midiPath = join(dir, "progression.mid");
      const wavPath = join(dir, "progression.wav");
      writeFileSync(midiPath, midi);
      writeFileSync(wavPath, wav);

      expect(statSync(midiPath).size).toBeGreaterThan(0);
      expect(statSync(wavPath).size).toBeGreaterThan(44);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
