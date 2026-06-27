import { describe, it, expect } from "vitest";
import { WavFileEncoder } from "../../../src/audio/export/WavFileEncoder.js";
import type { AudioBufferData } from "../../../src/audio/model/AudioBufferData.js";

/** Read an ASCII tag of `len` bytes starting at `offset`. */
function ascii(bytes: Uint8Array, offset: number, len: number): string {
  let s = "";
  for (let i = 0; i < len; i++) s += String.fromCharCode(bytes[offset + i] ?? 0);
  return s;
}

function u16(bytes: Uint8Array, offset: number): number {
  return new DataView(bytes.buffer).getUint16(offset, true);
}

function u32(bytes: Uint8Array, offset: number): number {
  return new DataView(bytes.buffer).getUint32(offset, true);
}

function i16(bytes: Uint8Array, offset: number): number {
  return new DataView(bytes.buffer).getInt16(offset, true);
}

/** A mono buffer of `frames` samples, each set to `value`. */
function monoBuffer(frames: number, value = 0, sampleRate = 44100): AudioBufferData {
  const samples = new Float32Array(frames);
  samples.fill(value);
  return { sampleRate, channels: 1, samples, length: frames };
}

describe("WavFileEncoder", () => {
  describe("AUD-6.6 — canonical RIFF/WAVE/fmt header", () => {
    const bytes = WavFileEncoder.encode(monoBuffer(10));

    it("writes the RIFF, WAVE, fmt and data chunk tags", () => {
      expect(ascii(bytes, 0, 4)).toBe("RIFF");
      expect(ascii(bytes, 8, 4)).toBe("WAVE");
      expect(ascii(bytes, 12, 4)).toBe("fmt ");
      expect(ascii(bytes, 36, 4)).toBe("data");
    });

    it("declares uncompressed 16-bit PCM", () => {
      expect(u32(bytes, 16)).toBe(16); // fmt chunk size
      expect(u16(bytes, 20)).toBe(1); // PCM format tag
      expect(u16(bytes, 34)).toBe(16); // bitsPerSample
    });

    it("writes channels, sample rate, byte rate and block align", () => {
      expect(u16(bytes, 22)).toBe(1); // channels (mono)
      expect(u32(bytes, 24)).toBe(44100); // sampleRate
      expect(u32(bytes, 28)).toBe(44100 * 1 * 2); // byteRate
      expect(u16(bytes, 32)).toBe(1 * 2); // blockAlign
    });
  });

  describe("AUD-6.7 — duration / byte length from the header", () => {
    it("sizes dataLen and the total stream from the frame count (mono)", () => {
      const N = 256;
      const bytes = WavFileEncoder.encode(monoBuffer(N));

      expect(u32(bytes, 40)).toBe(N * 2); // dataLen = frames * channels * 2
      expect(bytes.length).toBe(44 + N * 2); // header + samples
      expect(u32(bytes, 4)).toBe(36 + N * 2); // RIFF size = file size − 8
    });

    it("byteRate reflects sampleRate * channels * 2", () => {
      const bytes = WavFileEncoder.encode(monoBuffer(8, 0, 22050));
      expect(u32(bytes, 28)).toBe(22050 * 1 * 2);
    });

    it("sizes a stereo buffer by frames * channels", () => {
      const frames = 4;
      const samples = new Float32Array(frames * 2); // interleaved L/R
      const stereo: AudioBufferData = {
        sampleRate: 44100,
        channels: 2,
        samples,
        length: frames,
      };
      const bytes = WavFileEncoder.encode(stereo);

      expect(u16(bytes, 22)).toBe(2); // channels
      expect(u32(bytes, 40)).toBe(frames * 2 * 2); // dataLen
      expect(bytes.length).toBe(44 + frames * 2 * 2);
    });
  });

  describe("float → int16 conversion", () => {
    it("maps 1.0, 0 and -1.0 to their int16 extremes", () => {
      const samples = Float32Array.from([1, 0, -1]);
      const bytes = WavFileEncoder.encode({
        sampleRate: 44100,
        channels: 1,
        samples,
        length: 3,
      });

      expect(i16(bytes, 44)).toBe(32767);
      expect(i16(bytes, 46)).toBe(0);
      expect(i16(bytes, 48)).toBe(-32767);
    });

    it("clamps out-of-range samples instead of wrapping", () => {
      const samples = Float32Array.from([2, -2]);
      const bytes = WavFileEncoder.encode({
        sampleRate: 44100,
        channels: 1,
        samples,
        length: 2,
      });

      expect(i16(bytes, 44)).toBe(32767);
      expect(i16(bytes, 46)).toBe(-32768);
    });
  });
});
