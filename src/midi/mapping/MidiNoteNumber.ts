import type { PitchClass } from "./PitchClass.js";

/**
 * A MIDI note number in the standard range [0, 127].
 * Middle C (C4) = 60; A4 = 69.
 */
export type MidiNoteNumber = number;

/**
 * Converts a pitch class + octave to a MIDI note number.
 * Formula: 12 * (octave + 1) + pitchClass
 * C4 → 12 * 5 + 0 = 60; A4 → 12 * 5 + 9 = 69.
 * Results are clamped to [0, 127].
 */
export function midiNote(pitchClass: PitchClass, octave: number): MidiNoteNumber {
  const note = 12 * (octave + 1) + pitchClass;
  return Math.max(0, Math.min(127, note));
}

/** Returns true when `n` is a valid MIDI note number. */
export function isMidiNoteNumber(n: number): boolean {
  return Number.isInteger(n) && n >= 0 && n <= 127;
}
