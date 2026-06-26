import { Mode, type MusicalKey } from "../../core/model/MusicalState.js";

/**
 * Configuration for MIDI export. All fields have sensible defaults provided
 * by `DefaultMidiExportConfig`; use `resolveMidiExportConfig` to merge
 * caller-supplied overrides while respecting `exactOptionalPropertyTypes`.
 */
export interface MidiExportConfig {
  readonly key: MusicalKey;
  readonly mode: Mode;
  readonly bpm: number;
  readonly beatsPerMeasure: number;
  readonly chordDurationBeats: number;
  readonly velocity: number;
  readonly preferredOctave: number;
  readonly includeChordNamesAsMarkers: boolean;
}

export const DefaultMidiExportConfig: MidiExportConfig = {
  key: "C",
  mode: Mode.Major,
  bpm: 90,
  beatsPerMeasure: 4,
  chordDurationBeats: 4,
  velocity: 80,
  preferredOctave: 4,
  includeChordNamesAsMarkers: true,
};

/**
 * Merge caller overrides on top of `DefaultMidiExportConfig`.
 * Only defined keys in `overrides` are applied; undefined values are skipped
 * so that `exactOptionalPropertyTypes` is satisfied.
 */
export function resolveMidiExportConfig(overrides?: Partial<MidiExportConfig>): MidiExportConfig {
  if (overrides === undefined) {
    return DefaultMidiExportConfig;
  }

  return {
    ...DefaultMidiExportConfig,
    ...(overrides.key !== undefined ? { key: overrides.key } : {}),
    ...(overrides.mode !== undefined ? { mode: overrides.mode } : {}),
    ...(overrides.bpm !== undefined ? { bpm: overrides.bpm } : {}),
    ...(overrides.beatsPerMeasure !== undefined
      ? { beatsPerMeasure: overrides.beatsPerMeasure }
      : {}),
    ...(overrides.chordDurationBeats !== undefined
      ? { chordDurationBeats: overrides.chordDurationBeats }
      : {}),
    ...(overrides.velocity !== undefined ? { velocity: overrides.velocity } : {}),
    ...(overrides.preferredOctave !== undefined
      ? { preferredOctave: overrides.preferredOctave }
      : {}),
    ...(overrides.includeChordNamesAsMarkers !== undefined
      ? { includeChordNamesAsMarkers: overrides.includeChordNamesAsMarkers }
      : {}),
  };
}
