import type { MusicalKey } from "./MusicalState.js";

/** Natural (no-accidental) pitch class of each letter. */
export const LETTER_PITCH_CLASS: Readonly<Record<string, number>> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
};

/** Pitch class (0–11) of each supported key root. */
export const KEY_PITCH_CLASS: Readonly<Record<MusicalKey, number>> = {
  C: 0,
  "C#": 1,
  Db: 1,
  D: 2,
  "D#": 3,
  Eb: 3,
  E: 4,
  F: 5,
  "F#": 6,
  Gb: 6,
  G: 7,
  "G#": 8,
  Ab: 8,
  A: 9,
  "A#": 10,
  Bb: 10,
  B: 11,
};

/** Semitones above the tonic for each major-scale degree (1–7). */
export const MAJOR_SCALE_SEMITONES = [0, 2, 4, 5, 7, 9, 11] as const;
