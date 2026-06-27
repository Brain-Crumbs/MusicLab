import type { AudioBufferData } from "../model/AudioBufferData.js";
import type { WavFile } from "../model/WavFile.js";

/** Bytes in the canonical PCM WAV header (RIFF + fmt + data chunk markers). */
const HEADER_BYTES = 44;
/** Bytes per sample for 16-bit PCM. */
const BYTES_PER_SAMPLE = 2;
const BITS_PER_SAMPLE = 16;
/** WAVE format tag for uncompressed integer PCM. */
const PCM_FORMAT = 1;
const FMT_CHUNK_SIZE = 16;

const INT16_MAX = 32767;
const INT16_MIN = -32768;

/**
 * AUD-6.2 — encodes float PCM ({@link AudioBufferData}) into a canonical
 * little-endian, 16-bit PCM `.wav` byte stream with a single `data` chunk.
 *
 * Pure and deterministic: the same buffer always yields identical bytes.
 */
export class WavFileEncoder {
  /**
   * Encode the buffer's interleaved float samples (in `[-1, 1]`) to WAV bytes.
   *
   * Each float `s` becomes an int16 via round-then-clamp:
   * `clamp(round(s * 32767), -32768, 32767)`.  Clamping guards the rare case
   * where `s` sits just outside `[-1, 1]` (e.g. `1.0`) so it never wraps.
   */
  static encode(buffer: AudioBufferData): Uint8Array {
    const { sampleRate, channels, samples } = buffer;

    const frameCount = buffer.length;
    const sampleCount = frameCount * channels;
    const dataLen = sampleCount * BYTES_PER_SAMPLE;
    const byteRate = sampleRate * channels * BYTES_PER_SAMPLE;
    const blockAlign = channels * BYTES_PER_SAMPLE;

    const bytes = new Uint8Array(HEADER_BYTES + dataLen);
    const view = new DataView(bytes.buffer);

    // --- 44-byte header -----------------------------------------------------
    writeAscii(view, 0, "RIFF");
    view.setUint32(4, HEADER_BYTES - 8 + dataLen, true); // file size − 8
    writeAscii(view, 8, "WAVE");

    writeAscii(view, 12, "fmt ");
    view.setUint32(16, FMT_CHUNK_SIZE, true);
    view.setUint16(20, PCM_FORMAT, true);
    view.setUint16(22, channels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, BITS_PER_SAMPLE, true);

    writeAscii(view, 36, "data");
    view.setUint32(40, dataLen, true);

    // --- int16 samples (interleaved) ---------------------------------------
    for (let i = 0; i < sampleCount; i++) {
      const sample = samples[i] ?? 0;
      const scaled = Math.round(sample * INT16_MAX);
      const clamped = scaled < INT16_MIN ? INT16_MIN : scaled > INT16_MAX ? INT16_MAX : scaled;
      view.setInt16(HEADER_BYTES + i * BYTES_PER_SAMPLE, clamped, true);
    }

    return bytes;
  }

  /**
   * Same as {@link encode}, but returns the richer {@link WavFile} descriptor
   * (sample rate, channels, bit depth) alongside the raw bytes.
   */
  static encodeToWavFile(buffer: AudioBufferData): WavFile {
    return {
      sampleRate: buffer.sampleRate,
      channels: buffer.channels,
      bitDepth: BITS_PER_SAMPLE,
      bytes: WavFileEncoder.encode(buffer),
    };
  }
}

/** Write ASCII `text` one byte per char starting at `offset`. */
function writeAscii(view: DataView, offset: number, text: string): void {
  for (let i = 0; i < text.length; i++) {
    view.setUint8(offset + i, text.charCodeAt(i));
  }
}
