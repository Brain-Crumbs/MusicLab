import { Envelope } from "./Envelope.js";

/**
 * Renders a single MIDI note as a sine tone shaped by an {@link Envelope}.
 *
 * Equal-temperament pitch: `freq(n) = 440 · 2^((n - 69) / 12)`, so MIDI 69
 * (A4) is exactly 440 Hz. Amplitude scales linearly with velocity / 127.
 *
 * Pure and deterministic: same arguments ⇒ identical samples.
 */
export class SineVoice {
  constructor(private readonly envelope: Envelope) {}

  /** Equal-temperament frequency (Hz) of a MIDI note number. */
  static frequencyOf(midiNote: number): number {
    return 440 * 2 ** ((midiNote - 69) / 12);
  }

  /**
   * Render `durationSeconds` of the given note into a fresh Float32Array.
   * Velocity is clamped to the MIDI range [0, 127].
   */
  render(
    midiNote: number,
    durationSeconds: number,
    sampleRate: number,
    velocity: number,
  ): Float32Array {
    const totalSamples = Math.max(0, Math.round(durationSeconds * sampleRate));
    const out = new Float32Array(totalSamples);

    const freq = SineVoice.frequencyOf(midiNote);
    const amplitude = Math.max(0, Math.min(127, velocity)) / 127;
    const angularPerSample = (2 * Math.PI * freq) / sampleRate;

    for (let i = 0; i < totalSamples; i++) {
      out[i] = Math.sin(angularPerSample * i) * this.envelope.gainAt(i, totalSamples) * amplitude;
    }

    return out;
  }
}
