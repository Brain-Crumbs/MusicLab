/**
 * C11.4 — Basic progression example.
 *
 * The smallest possible use of the library: wire the batteries-included MVP
 * generator, generate a short progression, and print it as Roman numerals and
 * concrete chords.
 *
 * Run it:
 *   npx tsx examples/generate-basic-progression.ts
 */
import {
  createDefaultMvpGenerator,
  chordId,
  RomanNumeralRenderer,
  ProgressionTextRenderer,
} from "../src/index.js";

// A fixed seed makes this script reproducible — drop it for a fresh
// progression every run.
const generator = createDefaultMvpGenerator({
  key: "C",
  temperature: 0.8,
  seed: 12345,
});

const result = generator.generate({
  steps: 8,
  initialChord: chordId("I"),
});

console.log("Roman numerals:");
console.log("  " + new RomanNumeralRenderer().render(result));

console.log("\nWith concrete chords (key of C):");
console.log(
  new ProgressionTextRenderer()
    .render(result, { mode: "both" })
    .split("\n")
    .map((line) => "  " + line)
    .join("\n"),
);

console.log(`\nSeed: ${result.trace.seed} (pass the same seed to reproduce)`);
