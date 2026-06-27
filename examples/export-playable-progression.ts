/**
 * PLAY-7.2 — Combined playback export example.
 *
 * Runs a seeded generation and writes BOTH a `.mid` and a `.wav` from the same
 * scheduled track, so the notation and the rendered audio can't drift:
 *   - artifacts/progression.mid — instructions a DAW/synth can play
 *   - artifacts/progression.wav — already-rendered sound you can hear directly
 *
 * Run it:
 *   npx tsx examples/export-playable-progression.ts
 * Or via npm:
 *   npm run example:export
 *
 * This doubles as the render step CI (#25) can invoke.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  createDefaultMvpGenerator,
  chordId,
  Mode,
  exportPlayableChordProgression,
} from "../src/index.js";

const SEED = 42;
const OUT_DIR = join(new URL(".", import.meta.url).pathname, "../artifacts");

mkdirSync(OUT_DIR, { recursive: true });

// ── Generate a progression (seeded → reproducible) ────────────────────────

const generator = createDefaultMvpGenerator({ key: "C", temperature: 0.8, seed: SEED });
const result = generator.generate({ steps: 8, initialChord: chordId("I") });

console.log(`Generated (seed ${SEED}):`);
console.log(`  ${result.chords.join(" - ")}\n`);

// ── Export both files from ONE shared track ───────────────────────────────

const { midi, wav } = exportPlayableChordProgression(result, {
  key: "C",
  mode: Mode.Major,
  bpm: 90,
});

const midiPath = join(OUT_DIR, "progression.mid");
const wavPath = join(OUT_DIR, "progression.wav");

writeFileSync(midiPath, midi);
writeFileSync(wavPath, wav);

console.log("Wrote:");
console.log(`  ${midiPath} (${midi.length} bytes)`);
console.log(`  ${wavPath} (${wav.length} bytes)`);
console.log("\nDone. Play progression.wav directly, or open progression.mid in a DAW.");
