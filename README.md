# MusicLab

A stochastic harmonic potential-field generator: it models chord movement as a
seeded walk over a harmonic topology, where competing musical "forces" (gravity,
tension, phrase shape, cadence pull, novelty, surprise, style) score each
candidate move before a softmax turns those scores into probabilities.

See `PROJECT_OVERVIEW.md` for the design and `IMPLEMENTATION_PLAN.md` for the
task breakdown.

## CLI

Generate a progression from the command line (run from source with `tsx`):

```sh
npm run cli -- --steps 8 --key G --seed 42
```

Common flags (`npm run cli -- --help` lists them all):

| Flag | Meaning |
| --- | --- |
| `--steps <n>` | Number of chords to generate (default 8) |
| `--initial <chord>` | Starting chord, e.g. `I` (default `I`) |
| `--key <key>` | Key, e.g. `C`, `G`, `Bb` (default `C`) |
| `--mode <mode>` | `major`, `minor`, `dorian`, … (default `major`) |
| `--temperature <t>` | Softmax temperature, `>0` (default `0.8`) |
| `--seed <n>` | Seed for reproducible output (default random) |
| `--phrase <name>` | Phrase template (e.g. `eightBarLongArc`) |
| `--style <name>` | Style profile (e.g. `modalSurprising`) |
| `--format <mode>` | Output: `roman`, `concrete`, or `both` (default `both`) |
| `--config <path>` | JSON file with any of the above fields |
| `--trace <format>` | Also export the full trace: `json` or `csv` |
| `--trace-out <path>` | Write the trace to a file instead of stdout |

Flags override values from `--config`. Every run prints the seed it used so any
"random" progression can be reproduced by passing that seed back in.

```sh
# Reproducible run, with the full decision trace saved as CSV
npm run cli -- --seed 42 --trace csv --trace-out run.csv
```

When built (`npm run build`), the CLI is also exposed as the `musiclab` binary.

## Examples

Runnable scripts under `examples/` (each is a thin wrapper around the library):

```sh
npm run example:basic   # generate-basic-progression.ts — the minimal API call
npm run example:folk    # generate-folk-progression.ts  — how a StyleProfile steers output
npm run example:debug   # debug-potential-field.ts      — per-step candidate field + factor breakdown
```
