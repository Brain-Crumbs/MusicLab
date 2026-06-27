import type { ChordId } from "../../core/model/ChordId.js";
import type { ChordTimeline } from "./ChordTimeline.js";
import type { GenerationResult } from "../../core/generator/GenerationResult.js";
import type { MidiExportConfig } from "../model/MidiExportConfig.js";
import type { MidiChordEvent } from "../model/MidiChordEvent.js";
import type { MidiNoteEvent } from "../model/MidiNoteEvent.js";
import {
  ConcreteChordRenderer,
  defaultMvpResolver,
  type ChordResolver,
} from "../../renderers/ConcreteChordRenderer.js";
import type { MusicalKey } from "../../core/model/MusicalState.js";
import { ChordToneResolver } from "../mapping/ChordToneResolver.js";
import { ChordVoicingEngine } from "../mapping/ChordVoicingEngine.js";

export interface ChordTimelineBuildInput {
  readonly result: GenerationResult;
  readonly config: MidiExportConfig;
  /**
   * Resolves each `ChordId` to its `Chord` definition.  Defaults to the MVP
   * major-key catalog, the same source the renderers use, so audio and the
   * displayed progression stay in lock-step.
   */
  readonly resolver?: ChordResolver;
  /**
   * Optional key override.  By default the key comes from `config.key` (the
   * caller's explicit export choice).  Pass `result.finalState.key` here to
   * spell chords in the key the generator actually finished in instead.
   */
  readonly key?: MusicalKey;
}

const renderer = new ConcreteChordRenderer();

/**
 * MIDI-3.2 — turns a `GenerationResult` into a timed {@link ChordTimeline} of
 * block-chord events.
 *
 * Pure and deterministic: a fixed seed (hence a fixed `GenerationResult`) and a
 * fixed config always produce the same timeline.
 */
export class ChordTimelineBuilder {
  static build({ result, config, resolver, key }: ChordTimelineBuildInput): ChordTimeline {
    const chordResolver = resolver ?? defaultMvpResolver();

    // Which chords play?  `result.chords` holds only the N transition targets;
    // the chord the run *started* on lives in `result.initialChord`.  Post-#21
    // the displayed/heard progression begins on the requested chord, so we
    // prepend it here — e.g. `I - IV - V7 - I` is rendered and heard as 4
    // chords.  Audio must match what the renderer shows.
    const chordIds: readonly ChordId[] = [result.initialChord, ...result.chords];

    // Default the key from the export config (the caller's explicit choice).
    // A caller can override (e.g. with `result.finalState.key`) via `key`.
    const resolvedKey: MusicalKey = key ?? config.key;

    const events: MidiChordEvent[] = chordIds.map((chordId, i) => {
      const chord = chordResolver.getChord(chordId);
      const startBeat = i * config.chordDurationBeats;
      const durationBeats = config.chordDurationBeats;

      const chordTones = ChordToneResolver.resolve({ chord, key: resolvedKey });
      const midiNotes = ChordVoicingEngine.voice({
        chordTones,
        preferredOctave: config.preferredOctave,
        voicing: "closed",
      });

      // Block chord: every note shares the chord's start and full duration.
      const notes: readonly MidiNoteEvent[] = midiNotes.map((midiNoteNumber) => ({
        midiNoteNumber,
        startBeat,
        durationBeats,
        velocity: config.velocity,
      }));

      return {
        chordId,
        chordName: renderer.renderChord(chord, resolvedKey),
        startBeat,
        durationBeats,
        notes,
      };
    });

    return {
      events,
      bpm: config.bpm,
      beatsPerMeasure: config.beatsPerMeasure,
    };
  }
}
