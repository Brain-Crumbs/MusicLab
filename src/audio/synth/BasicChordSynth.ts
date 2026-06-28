import type { MidiTrack } from "../../midi/model/MidiTrack.js";
import { MidiTiming } from "../../midi/model/MidiTiming.js";
import type { AudioBufferData } from "../model/AudioBufferData.js";
import { resolveAudioRenderConfig, type AudioRenderConfig } from "../model/AudioRenderConfig.js";
import { Envelope } from "./Envelope.js";
import { SineVoice } from "./SineVoice.js";

export interface BasicChordSynthInput {
  readonly track: MidiTrack;
  /** Optional render overrides; merged onto `DefaultAudioRenderConfig`. */
  readonly config?: Partial<AudioRenderConfig>;
}

/**
 * AUD-5.5 — turns a {@link MidiTrack} into an {@link AudioBufferData} with a
 * tiny, dependency-free additive sine synth.
 *
 * Each note is rendered by a {@link SineVoice} and mixed (added) into the output
 * buffer at its sample offset. After mixing, the buffer is peak-normalized to
 * the configured `gain` so stacked chords stay within [-1, 1] (AUD-5.6).
 *
 * Rendering is mono; when `config.channels` is 2 the mono mix is duplicated into
 * both interleaved channels so a stereo `.wav` can be written (issue #48). The
 * voices are identical in each channel — there is no panning in the MVP.
 *
 * Pure and deterministic: same track + config ⇒ identical samples.
 */
export class BasicChordSynth {
  static render({ track, config }: BasicChordSynthInput): AudioBufferData {
    const resolved = resolveAudioRenderConfig(config);
    const { sampleRate, bpm, gain, channels } = resolved;

    // Total duration is the latest note end, in seconds → samples.
    let lastEndBeat = 0;
    for (const note of track.notes) {
      const endBeat = note.startBeat + note.durationBeats;
      if (endBeat > lastEndBeat) {
        lastEndBeat = endBeat;
      }
    }
    const totalSeconds = MidiTiming.beatsToSeconds(lastEndBeat, bpm);
    const totalSamples = MidiTiming.secondsToSamples(totalSeconds, sampleRate);
    const samples = new Float32Array(totalSamples);

    const voice = new SineVoice(
      new Envelope(resolved.attackSeconds, resolved.releaseSeconds, sampleRate),
    );

    // Mix every note into the buffer at its start offset.
    for (const note of track.notes) {
      const startSeconds = MidiTiming.beatsToSeconds(note.startBeat, bpm);
      const durationSeconds = MidiTiming.beatsToSeconds(note.durationBeats, bpm);
      const offset = MidiTiming.secondsToSamples(startSeconds, sampleRate);

      const voiceSamples = voice.render(
        note.midiNoteNumber,
        durationSeconds,
        sampleRate,
        note.velocity,
      );

      for (let i = 0; i < voiceSamples.length; i++) {
        const target = offset + i;
        if (target >= 0 && target < totalSamples) {
          samples[target] = (samples[target] ?? 0) + (voiceSamples[i] ?? 0);
        }
      }
    }

    // AUD-5.6 — peak-normalize so the mix never clips. Only attenuate (never
    // amplify): scale = min(1, gain / peak).
    let peak = 0;
    for (const sample of samples) {
      const magnitude = Math.abs(sample);
      if (magnitude > peak) {
        peak = magnitude;
      }
    }
    if (peak > 0) {
      const scale = Math.min(1, gain / peak);
      if (scale < 1) {
        for (let i = 0; i < totalSamples; i++) {
          samples[i] = (samples[i] ?? 0) * scale;
        }
      }
    }

    if (channels === 2) {
      // Duplicate the mono mix into L and R (interleaved). `length` stays the
      // per-channel frame count; `samples` holds 2 values per frame.
      const stereo = new Float32Array(totalSamples * 2);
      for (let i = 0; i < totalSamples; i++) {
        const sample = samples[i] ?? 0;
        stereo[i * 2] = sample;
        stereo[i * 2 + 1] = sample;
      }
      return {
        sampleRate,
        channels: 2,
        samples: stereo,
        length: totalSamples,
      };
    }

    return {
      sampleRate,
      channels: 1,
      samples,
      length: totalSamples,
    };
  }
}
