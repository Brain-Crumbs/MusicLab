/**
 * C11.5 — Folk-style progression example.
 *
 * Shows how a StyleProfile (M1.9) steers the generator through the StyleFactor
 * (F4.10): the same engine, seed, and phrase produce noticeably different
 * progressions under a stable-folk profile versus a wandering-folk one.
 *
 * "Folk — Stable" favours diatonic, cadential motion (strong V7 -> I pulls);
 * "Folk — Wandering" leans into modal returns (bVII -> I) and deceptive moves,
 * so it roams further before resolving.
 *
 * Run it:
 *   npx tsx examples/generate-folk-progression.ts
 */
import {
  createDefaultMvpGenerator,
  chordId,
  StyleProfiles,
  PhraseTemplates,
  ProgressionTextRenderer,
  type StyleProfile,
} from "../src/index.js";

const SEED = 2024;
const STEPS = 8;
const text = new ProgressionTextRenderer();

function runWithStyle(style: StyleProfile): void {
  const generator = createDefaultMvpGenerator({
    key: "G",
    styleProfile: style,
    // An eight-bar arc gives the style room to express itself before the
    // closing resolution.
    phraseTemplate: PhraseTemplates.eightBarLongArc,
    temperature: 0.85,
    seed: SEED,
  });

  const result = generator.generate({ steps: STEPS, initialChord: chordId("I") });

  console.log(`\n${style.name} (${style.id}):`);
  console.log(
    text
      .render(result, { mode: "both" })
      .split("\n")
      .map((line) => "  " + line)
      .join("\n"),
  );
}

console.log(`Folk progressions in G major (seed ${SEED}, same phrase + seed):`);
runWithStyle(StyleProfiles.folkStable);
runWithStyle(StyleProfiles.folkWandering);

console.log(
  "\nSame seed, different style profile → the StyleFactor reshapes the field," +
    " not the randomness.",
);
