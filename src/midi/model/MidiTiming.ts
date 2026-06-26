/**
 * Pure, stateless helpers for converting between beat-based time, MIDI ticks,
 * wall-clock seconds, and audio samples.
 */
export const MidiTiming = {
  /** Convert a beat count to MIDI ticks given a PPQ (ticks per quarter note). */
  beatsToTicks(beats: number, ppq: number): number {
    return Math.round(beats * ppq);
  },

  /** Convert MIDI ticks back to beats given a PPQ. */
  ticksToBeats(ticks: number, ppq: number): number {
    return ticks / ppq;
  },

  /** Convert beats to wall-clock seconds at the given BPM. */
  beatsToSeconds(beats: number, bpm: number): number {
    return (beats * 60) / bpm;
  },

  /** Convert seconds to audio samples at the given sample rate. */
  secondsToSamples(seconds: number, sampleRate: number): number {
    return Math.round(seconds * sampleRate);
  },
} as const;
