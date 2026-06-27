/**
 * A canonical 16-bit PCM WAV byte stream (AUD-6.1).
 *
 * sampleRate: samples per second (mirrors the source {@link AudioBufferData}).
 * channels: 1 = mono, 2 = stereo (interleaved frames in `bytes`).
 * bitDepth: always 16 — this MVP encoder emits little-endian signed 16-bit PCM.
 * bytes: the complete `.wav` stream — 44-byte RIFF/WAVE/fmt /data header
 *        followed by the interleaved int16 samples.
 */
export interface WavFile {
  readonly sampleRate: number;
  readonly channels: number;
  readonly bitDepth: 16;
  readonly bytes: Uint8Array;
}
