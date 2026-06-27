import { midiNote, type MidiNoteNumber } from "./MidiNoteNumber.js";
import type { PitchClass } from "./PitchClass.js";

export interface ChordVoicingInput {
  /** Ordered chord tones, root first (from ChordToneResolver). */
  readonly chordTones: readonly PitchClass[];
  /** Octave for the root note. Default 4 keeps voicings near middle C. */
  readonly preferredOctave: number;
  /** Voicing style. Only "closed" (root position, stacked up) is supported in the MVP. */
  readonly voicing: "closed";
}

/**
 * Converts ordered chord tones (root first) into MIDI note numbers.
 *
 * Closed root-position voicing: the root is placed at `preferredOctave`, and
 * each subsequent tone is placed at `rootMidi + intervalFromRoot`. This
 * preserves the original interval ordering so that e.g. V7 (G B D F) maps to
 * G4 B4 D5 F5, not a naively-sorted cluster.
 *
 * Pure and stateless.
 */
export class ChordVoicingEngine {
  static voice({ chordTones, preferredOctave }: ChordVoicingInput): readonly MidiNoteNumber[] {
    if (chordTones.length === 0) return [];

    const rootPc = chordTones[0] ?? 0;
    const rootMidi = midiNote(rootPc, preferredOctave);

    return chordTones.map((pc, i) => {
      if (i === 0) return rootMidi;
      const interval = (((pc - rootPc) % 12) + 12) % 12;
      return rootMidi + interval;
    });
  }
}
