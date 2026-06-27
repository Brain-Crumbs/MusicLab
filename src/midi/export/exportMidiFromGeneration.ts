import type { GenerationResult } from "../../core/generator/GenerationResult.js";
import type { MidiExportConfig } from "../model/MidiExportConfig.js";
import type { MidiFileExporter } from "./MidiFileExporter.js";
import { resolveMidiExportConfig } from "../model/MidiExportConfig.js";
import { ChordTimelineBuilder } from "../timeline/ChordTimelineBuilder.js";
import { MidiEventScheduler } from "../timeline/MidiEventScheduler.js";
import { MidiWriterFileExporter } from "./MidiWriterFileExporter.js";

export interface ExportMidiOptions {
  /**
   * Encoder to serialize the scheduled track.  Defaults to the midi-writer-js
   * implementation; inject a different {@link MidiFileExporter} (e.g. a
   * `@tonejs/midi` adapter) to swap the byte encoder without touching the
   * generate → timeline → schedule pipeline.
   */
  readonly exporter?: MidiFileExporter;
}

const defaultExporter = new MidiWriterFileExporter();

/**
 * MIDI-4.4 — the one-call public bridge from a {@link GenerationResult} to a
 * standard MIDI byte stream.
 *
 * Runs the full export pipeline:
 *   resolveMidiExportConfig → ChordTimelineBuilder → MidiEventScheduler →
 *   MidiFileExporter.export → Uint8Array
 *
 * @param result    A finished generation run.
 * @param overrides Optional {@link MidiExportConfig} overrides (key, bpm, …);
 *                  merged onto `DefaultMidiExportConfig`.
 * @param options   Optional injection point for a custom exporter.
 * @returns The `.mid` bytes (begins with the `MThd` header chunk).
 */
export function exportMidiFromGeneration(
  result: GenerationResult,
  overrides?: Partial<MidiExportConfig>,
  options: ExportMidiOptions = {},
): Uint8Array {
  const config = resolveMidiExportConfig(overrides);
  const timeline = ChordTimelineBuilder.build({ result, config });
  const track = MidiEventScheduler.schedule({ timeline, config });
  const exporter = options.exporter ?? defaultExporter;
  return exporter.export(track, config);
}
