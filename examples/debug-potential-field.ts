/**
 * C11.6 — Potential-field debug example.
 *
 * Makes the generator's decisions explainable.  For each step it prints:
 *   1. the candidate field — every reachable chord, its total score, and the
 *      probability the softmax assigned it (the "potential field" the engine
 *      sampled from);
 *   2. the factor breakdown for the move actually chosen — why that candidate
 *      won.
 * It closes with the tension timeline (target vs. actual) so you can see the
 * resolution pump working across the phrase.
 *
 * Everything here is a pure projection of generation output via the Wave 9 data
 * builders — inspecting a run never changes it.
 *
 * Run it:
 *   npx tsx examples/debug-potential-field.ts
 */
import {
  createDefaultMvpGenerator,
  chordId,
  CandidateDistributionDataBuilder,
  FactorContributionDataBuilder,
  TensionTimelineDataBuilder,
} from "../src/index.js";

const generator = createDefaultMvpGenerator({
  key: "C",
  temperature: 0.8,
  seed: 777, // fixed so the trace is reproducible
});

const result = generator.generate({ steps: 6, initialChord: chordId("I") });

const distribution = new CandidateDistributionDataBuilder();
const contribution = new FactorContributionDataBuilder();
const timeline = new TensionTimelineDataBuilder();

const pct = (p: number): string => (p * 100).toFixed(1).padStart(5) + "%";
const num = (n: number): string => (n >= 0 ? "+" : "") + n.toFixed(2);

console.log(`Potential-field trace — seed ${result.trace.seed}\n`);

for (const step of result.steps) {
  const from = step.previousState.currentChord;
  console.log(`Step ${step.stepIndex}: from ${from}`);
  console.log("  candidate field:");
  console.log("    chord    score    prob");

  for (const c of distribution.build(step)) {
    const marker = c.selected ? " <-- chosen" : "";
    console.log(
      `    ${c.chord.padEnd(6)} ${c.score.toFixed(2).padStart(6)}  ${pct(
        c.probability,
      )}${marker}`,
    );
  }

  console.log(`  why ${from} -> ${step.selectedChord}:`);
  const factors = contribution.buildForSelected(step);
  for (const f of factors) {
    console.log(`    ${f.factorId.padEnd(16)} ${num(f.weightedScore)}`);
  }
  const total = factors.reduce((sum, f) => sum + f.weightedScore, 0);
  console.log(`    ${"total".padEnd(16)} ${num(total)}\n`);
}

console.log("Tension timeline (target vs. actual):");
console.log("  step  chord   target  actual   error");
for (const t of timeline.build(result.trace)) {
  console.log(
    `  ${String(t.stepIndex).padStart(4)}  ${t.chord.padEnd(6)} ` +
      `${t.targetTension.toFixed(2).padStart(6)}  ` +
      `${t.actualTension.toFixed(2).padStart(6)}  ${num(t.tensionError).padStart(6)}`,
  );
}
