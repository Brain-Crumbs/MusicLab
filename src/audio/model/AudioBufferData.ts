/**
 * Raw PCM audio produced by the synth.
 *
 * sampleRate: samples per second the buffer was rendered at.
 * channels: 1 = mono, 2 = stereo.
 * samples: interleaved Float32 PCM in [-1, 1]. For mono there is one value per frame.
 * length: number of frames (per-channel sample count). For mono, `samples.length === length`.
 */
export interface AudioBufferData {
  readonly sampleRate: number;
  readonly channels: 1 | 2;
  readonly samples: Float32Array;
  readonly length: number;
}
