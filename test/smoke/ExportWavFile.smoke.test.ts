import { describe, it, expect } from "vitest";
import { createDefaultMvpGenerator } from "../../src/core/generator/createDefaultMvpGenerator.js";
import { chordId } from "../../src/core/model/ChordId.js";
import { exportWavFromGeneration } from "../../src/audio/export/exportWavFromGeneration.js";

/**
 * AUD-6.5 — `.wav` export smoke test.
 *
 * End-to-end from a seeded `GenerationResult`: the bytes must be non-empty,
 * carry a valid canonical PCM header, and contain non-silent audio.
 */
const SEED = 42;

function ascii(bytes: Uint8Array, offset: number, len: number): string {
  let s = "";
  for (let i = 0; i < len; i++) s += String.fromCharCode(bytes[offset + i] ?? 0);
  return s;
}

describe("AUD-6.5 — exportWavFromGeneration produces a valid .wav stream", () => {
  const result = createDefaultMvpGenerator({ key: "C", seed: SEED }).generate({
    steps: 8,
    initialChord: chordId("I"),
  });

  it("returns a non-empty, header-valid 16-bit PCM WAV", () => {
    const bytes = exportWavFromGeneration(result, { bpm: 90 });

    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes.length).toBeGreaterThan(44); // header + at least some samples

    expect(ascii(bytes, 0, 4)).toBe("RIFF");
    expect(ascii(bytes, 8, 4)).toBe("WAVE");
    expect(ascii(bytes, 12, 4)).toBe("fmt ");
    expect(ascii(bytes, 36, 4)).toBe("data");

    const view = new DataView(bytes.buffer);
    expect(view.getUint16(20, true)).toBe(1); // PCM
    expect(view.getUint16(34, true)).toBe(16); // bitsPerSample

    // dataLen field and the actual sample byte count agree.
    const dataLen = view.getUint32(40, true);
    expect(dataLen).toBe(bytes.length - 44);
    expect(dataLen).toBeGreaterThan(0);
  });

  it("writes a non-silent file (some int16 sample is non-zero)", () => {
    const bytes = exportWavFromGeneration(result, { bpm: 90 });
    const view = new DataView(bytes.buffer);

    let nonZero = false;
    for (let offset = 44; offset + 2 <= bytes.length; offset += 2) {
      if (view.getInt16(offset, true) !== 0) {
        nonZero = true;
        break;
      }
    }
    expect(nonZero).toBe(true);
  });

  it("works with default config (no overrides)", () => {
    const bytes = exportWavFromGeneration(result);

    expect(bytes.length).toBeGreaterThan(44);
    expect(ascii(bytes, 0, 4)).toBe("RIFF");
  });
});
