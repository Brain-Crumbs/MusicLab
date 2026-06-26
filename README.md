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
npm run example:basic     # generate-basic-progression.ts — the minimal API call
npm run example:folk      # generate-folk-progression.ts  — how a StyleProfile steers output
npm run example:debug     # debug-potential-field.ts      — per-step candidate field + factor breakdown
npm run example:visuals   # generate-visuals.ts           — writes an SVG/Mermaid/HTML gallery to artifacts/
```

## Visualizations

Four adapters turn generation output into diagrams.  All are pure string renderers — no DOM, no React, no charting library.

| Visualization | What it shows | Formats |
| --- | --- | --- |
| **Topology** | The permanent harmonic chord-space (what *can* happen) | SVG, Mermaid |
| **Trajectory** | The actual walk a run took through chord-space | SVG, Mermaid |
| **Tension timeline** | Target vs. actual tension at each step | SVG |

### From the CLI

Pass `--viz <type>` (and optionally `--viz-format`) to any `musiclab` command:

```sh
# Print a Mermaid topology diagram to stdout
musiclab --seed 42 --viz topology --viz-format mermaid

# Write an SVG topology to a file
musiclab --seed 42 --viz topology --viz-format svg --viz-out topology.svg

# Write a trajectory diagram (Mermaid)
musiclab --seed 42 --viz trajectory --viz-format mermaid --viz-out trajectory.mmd

# Write a tension-timeline SVG
musiclab --seed 42 --viz tension --viz-out tension.svg
```

The same flags work with `npm run cli --`:

```sh
npm run cli -- --seed 42 --viz topology --viz-format mermaid
```

### From the library

```ts
import {
  createDefaultMvpGenerator,
  chordId,
  MajorKeyTopologyBuilder,
  TopologyGraphDataBuilder,
  TrajectoryGraphDataBuilder,
  TensionTimelineDataBuilder,
  MermaidGraphAdapter,
  MermaidTrajectoryAdapter,
  SvgTopologyRenderer,
  SvgTensionTimelineRenderer,
} from "@harmonic-field/core";

const generator = createDefaultMvpGenerator({ seed: 42 });
const result = generator.generate({ steps: 8, initialChord: chordId("I") });

// Topology (static — independent of the run)
const topology = new MajorKeyTopologyBuilder().build();
const topologyData = new TopologyGraphDataBuilder().build(topology);
const topologySvg = new SvgTopologyRenderer().render(topologyData);
const topologyMmd = new MermaidGraphAdapter().render(topologyData);

// Trajectory (run-specific)
const trajectoryData = new TrajectoryGraphDataBuilder().build(result.trace);
const trajectoryMmd = new MermaidTrajectoryAdapter().render(trajectoryData);

// Tension timeline (run-specific)
const tensionData = new TensionTimelineDataBuilder().build(result.trace);
const tensionSvg = new SvgTensionTimelineRenderer().render(tensionData);
```

### Example gallery

`npm run example:visuals` generates a self-contained HTML gallery in `artifacts/` with all four visualizations embedded — useful as a quick sanity-check or as input to a CI artifact step.
