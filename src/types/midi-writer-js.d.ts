/**
 * Ambient typings for midi-writer-js.
 *
 * The published package ships type declarations but its `package.json`
 * `exports` map omits a `types` condition, so under `moduleResolution:
 * "NodeNext"` TypeScript cannot resolve them (TS7016).  Rather than loosen
 * module resolution for the whole project, we declare the narrow slice of the
 * API that {@link MidiWriterFileExporter} actually uses.  If we adopt more of
 * the library later, extend this surface here.
 */
declare module "midi-writer-js" {
  /** Fields accepted by a `NoteEvent`; `pitch` accepts raw MIDI numbers. */
  interface NoteEventFields {
    pitch: Array<number | string> | number | string;
    duration: string | string[];
    velocity?: number;
    wait?: string | string[];
    channel?: number;
  }

  class NoteEvent {
    constructor(fields: NoteEventFields);
  }

  class ProgramChangeEvent {
    constructor(fields: { instrument: number; channel?: number; delta?: number });
  }

  class Track {
    addTrackName(text: string): Track;
    setTempo(bpm: number, tick?: number): Track;
    setTimeSignature(
      numerator: number,
      denominator: number,
      midiclockspertick?: number,
      notespermidiclock?: number,
    ): Track;
    addEvent(events: NoteEvent | ProgramChangeEvent | Array<NoteEvent | ProgramChangeEvent>): Track;
  }

  class Writer {
    constructor(tracks: Track | Track[]);
    /** Standard MIDI bytes for the assembled tracks. */
    buildFile(): Uint8Array;
    /** Base64 data URI form, included for completeness. */
    dataUri(): string;
  }

  const MidiWriter: {
    NoteEvent: typeof NoteEvent;
    ProgramChangeEvent: typeof ProgramChangeEvent;
    Track: typeof Track;
    Writer: typeof Writer;
  };

  export default MidiWriter;
  export { NoteEvent, ProgramChangeEvent, Track, Writer };
}
