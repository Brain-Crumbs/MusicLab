# Example configs

Ready-to-run JSON configs for the CLI. Each one exercises a different slice of
the generator so you can try every feature without memorising flags.

Run any of them with `--config`:

```sh
npm run cli -- --config examples/configs/folk-stable.json
```

A config file may set any generator field: `key`, `mode`, `temperature`,
`seed`, `steps`, `initialChord`, `phrase`, and `style`. The output controls
(`--format`, `--trace`, `--trace-out`) are **CLI-only flags** — layer them on
top of any config:

```sh
# Print only Roman numerals
npm run cli -- --config examples/configs/long-arc.json --format roman

# Also dump the full decision trace as CSV to a file
npm run cli -- --config examples/configs/modal-surprising.json --trace csv --trace-out run.csv

# Inspect the per-step potential field as pretty JSON on stdout
npm run cli -- --config examples/configs/modal-surprising.json --trace json
```

Any flag overrides the same field in the file, so you can reuse a config and
tweak one thing:

```sh
npm run cli -- --config examples/configs/folk-stable.json --key D --steps 12
```

## What each config demonstrates

| Config | Feature under test |
| --- | --- |
| `minimal.json` | Smallest useful config — key + steps + seed, everything else default |
| `folk-stable.json` | `folkStable` style + `fourBarResolutionPump` — diatonic, cadential, resolves hard to I |
| `folk-wandering.json` | `folkWandering` style — same seed as folk-stable, but roams more (compare the two) |
| `modal-surprising.json` | `modalSurprising` style, Mixolydian mode, higher temperature — bVII / deceptive motion |
| `classical-cadential.json` | `classicalCadential` style, low temperature — strong V7→I authentic cadences |
| `exploratory-hot.json` | `temperature: 2.0` — near-uniform sampling, very unpredictable |
| `deterministic-cold.json` | `temperature: 0.25` — near-greedy, almost always picks the top-scoring move |
| `long-arc.json` | `eightBarLongArc` phrase over 16 steps — longer tension build/release |
| `half-cadence.json` | `fourBarHalfCadence` phrase — ends unresolved (on a half cadence) |
| `invalid.json` | **Error handling** — bad key/style/steps; shows the CLI's validation messages |

## Suggested tour

```sh
# 1. Baseline
npm run cli -- --config examples/configs/minimal.json

# 2. Style steering — run both, same seed, and compare
npm run cli -- --config examples/configs/folk-stable.json
npm run cli -- --config examples/configs/folk-wandering.json

# 3. Temperature — hot vs cold, same seed
npm run cli -- --config examples/configs/exploratory-hot.json --format roman
npm run cli -- --config examples/configs/deterministic-cold.json --format roman

# 4. Reproducibility — identical output every time (fixed seed)
npm run cli -- --config examples/configs/long-arc.json --format roman
npm run cli -- --config examples/configs/long-arc.json --format roman

# 5. Trace export
npm run cli -- --config examples/configs/classical-cadential.json --trace csv

# 6. Validation / error messages (exits non-zero)
npm run cli -- --config examples/configs/invalid.json
```
