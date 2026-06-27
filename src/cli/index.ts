#!/usr/bin/env node
import { writeFileSync } from "node:fs";
import {
  createDefaultMvpGenerator,
  RomanNumeralRenderer,
  ProgressionTextRenderer,
  JsonTraceRenderer,
  CsvTraceRenderer,
  PhraseTemplates,
  StyleProfiles,
  MajorKeyTopologyBuilder,
  TopologyGraphDataBuilder,
  TrajectoryGraphDataBuilder,
  TensionTimelineDataBuilder,
  MermaidGraphAdapter,
  MermaidTrajectoryAdapter,
  SvgTopologyRenderer,
  SvgTensionTimelineRenderer,
  exportMidiFromGeneration,
  exportWavFromGeneration,
  type MidiExportConfig,
} from "../index.js";
import { loadGeneratorConfig, type RawGeneratorOptions } from "./loadGeneratorConfig.js";

// ---------------------------------------------------------------------------
// C11.1 / C11.3 — CLI entrypoint
//
// A thin wrapper around the core generator: parse flags, load config
// (loadGeneratorConfig, C11.2), generate a progression, print it, and
// optionally export the full trace as JSON or CSV (--trace, C11.3).
//
// It contains no music-theory or probability logic of its own; everything is
// delegated to the library so the CLI stays a presentation shell.
// ---------------------------------------------------------------------------

const TRACE_FORMATS = ["json", "csv"] as const;
type TraceFormat = (typeof TRACE_FORMATS)[number];

const VIZ_TYPES = ["topology", "trajectory", "tension"] as const;
type VizType = (typeof VIZ_TYPES)[number];

const VIZ_FORMATS = ["mermaid", "svg"] as const;
type VizFormat = (typeof VIZ_FORMATS)[number];

interface CliArgs extends RawGeneratorOptions {
  readonly trace?: TraceFormat;
  /** File to write the trace to; stdout when omitted. */
  readonly traceOut?: string;
  /** "roman" | "concrete" | "both" — progression output style. */
  readonly format?: string;
  /** Visualization type to emit: topology | trajectory | tension. */
  readonly viz?: VizType;
  /** Visualization output format: mermaid | svg. */
  readonly vizFormat?: VizFormat;
  /** File to write the visualization to; stdout when omitted. */
  readonly vizOut?: string;
  /** File to write the exported `.mid` to. */
  readonly midi?: string;
  /** File to write the exported `.wav` to. */
  readonly wav?: string;
  /** Tempo for the exported MIDI/WAV, in beats per minute. */
  readonly bpm?: number;
  readonly help?: boolean;
}

function out(text: string): void {
  process.stdout.write(text + "\n");
}

function err(text: string): void {
  process.stderr.write(text + "\n");
}

function main(argv: readonly string[]): number {
  let args: CliArgs;
  try {
    args = parseArgs(argv);
  } catch (cause) {
    err(`Error: ${message(cause)}`);
    err('Run "musiclab --help" for usage.');
    return 1;
  }

  if (args.help) {
    out(usage());
    return 0;
  }

  try {
    const { overrides, steps, initialChord } = loadGeneratorConfig(args);
    const generator = createDefaultMvpGenerator(overrides);
    const result = generator.generate({ steps, initialChord });

    const mode = (args.format ?? "both") as "roman" | "concrete" | "both";
    if (mode === "roman") {
      out(new RomanNumeralRenderer().render(result));
    } else {
      out(new ProgressionTextRenderer().render(result, { mode }));
    }

    if (result.trace.seed !== undefined) {
      err(`(seed: ${result.trace.seed} — pass --seed ${result.trace.seed} to reproduce)`);
    }

    if (args.trace) {
      exportTrace(result, args.trace, args.traceOut);
    }

    if (args.viz) {
      const topology = new MajorKeyTopologyBuilder().build();
      exportViz(result, topology, args.viz, args.vizFormat ?? "svg", args.vizOut);
    }

    if (args.midi) {
      exportMidi(result, overrides, args.bpm, args.midi);
    }

    if (args.wav) {
      exportWav(result, overrides, args.bpm, args.wav);
    }

    return 0;
  } catch (cause) {
    err(`Error: ${message(cause)}`);
    return 1;
  }
}

type GenerationResult = ReturnType<ReturnType<typeof createDefaultMvpGenerator>["generate"]>;

function exportTrace(
  result: GenerationResult,
  format: TraceFormat,
  traceOut: string | undefined,
): void {
  const rendered =
    format === "json"
      ? new JsonTraceRenderer().render(result)
      : new CsvTraceRenderer().render(result);

  if (traceOut) {
    writeFileSync(traceOut, rendered + "\n", "utf8");
    err(`Trace (${format}) written to ${traceOut}`);
  } else {
    out(rendered);
  }
}

function exportViz(
  result: GenerationResult,
  topology: ReturnType<MajorKeyTopologyBuilder["build"]>,
  vizType: VizType,
  vizFormat: VizFormat,
  vizOut: string | undefined,
): void {
  let rendered: string;

  if (vizType === "topology") {
    const graphData = new TopologyGraphDataBuilder().build(topology);
    rendered =
      vizFormat === "mermaid"
        ? new MermaidGraphAdapter().render(graphData)
        : new SvgTopologyRenderer().render(graphData);
  } else if (vizType === "trajectory") {
    const graphData = new TrajectoryGraphDataBuilder().build(result.trace);
    if (vizFormat === "svg") {
      rendered = new SvgTopologyRenderer().render(graphData);
    } else {
      rendered = new MermaidTrajectoryAdapter().render(graphData);
    }
  } else {
    const timelineData = new TensionTimelineDataBuilder().build(result.trace);
    if (vizFormat === "mermaid") {
      err("Note: tension timeline is not available in Mermaid format; using SVG.");
    }
    rendered = new SvgTensionTimelineRenderer().render(timelineData);
  }

  if (vizOut) {
    writeFileSync(vizOut, rendered + "\n", "utf8");
    err(`Visualization (${vizType}/${vizFormat}) written to ${vizOut}`);
  } else {
    out(rendered);
  }
}

function exportMidi(
  result: GenerationResult,
  overrides: ReturnType<typeof loadGeneratorConfig>["overrides"],
  bpm: number | undefined,
  midiOut: string,
): void {
  // Mirror the export to the key/mode the run actually used; `bpm` is a
  // MIDI-only control with no generator equivalent, so it comes straight off
  // the flag.  Undefined fields fall through to DefaultMidiExportConfig.
  const midiOverrides: Partial<MidiExportConfig> = {
    ...(overrides.key !== undefined ? { key: overrides.key } : {}),
    ...(overrides.mode !== undefined ? { mode: overrides.mode } : {}),
    ...(bpm !== undefined ? { bpm } : {}),
  };

  const bytes = exportMidiFromGeneration(result, midiOverrides);
  writeFileSync(midiOut, bytes);
  err(`MIDI written to ${midiOut}`);
}

function exportWav(
  result: GenerationResult,
  overrides: ReturnType<typeof loadGeneratorConfig>["overrides"],
  bpm: number | undefined,
  wavOut: string,
): void {
  // Mirror the same key/mode/bpm the MIDI path uses so audio and notation stay
  // in lock-step; undefined fields fall through to DefaultMidiExportConfig.
  const wavOverrides: Partial<MidiExportConfig> = {
    ...(overrides.key !== undefined ? { key: overrides.key } : {}),
    ...(overrides.mode !== undefined ? { mode: overrides.mode } : {}),
    ...(bpm !== undefined ? { bpm } : {}),
  };

  const bytes = exportWavFromGeneration(result, wavOverrides);
  writeFileSync(wavOut, bytes);
  err(`WAV written to ${wavOut}`);
}

// ---------------------------------------------------------------------------
// Argument parsing
// ---------------------------------------------------------------------------

/**
 * Parses `--flag value` and `--flag=value` forms.  `--help` is a boolean flag;
 * everything else expects a value.  Numeric flags are coerced and validated
 * here so downstream config loading sees real numbers.
 */
function parseArgs(argv: readonly string[]): CliArgs {
  const result: Record<string, unknown> = {};

  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (token === undefined || !token.startsWith("--")) {
      throw new Error(`Unexpected argument "${token}".`);
    }

    const body = token.slice(2);
    if (body === "help" || body === "h") {
      result.help = true;
      continue;
    }

    let name: string;
    let value: string;
    const eq = body.indexOf("=");
    if (eq >= 0) {
      name = body.slice(0, eq);
      value = body.slice(eq + 1);
    } else {
      name = body;
      const next = argv[i + 1];
      if (next === undefined || next.startsWith("--")) {
        throw new Error(`Flag "--${name}" expects a value.`);
      }
      value = next;
      i++;
    }

    assignFlag(result, name, value);
  }

  return result as CliArgs;
}

function assignFlag(result: Record<string, unknown>, name: string, value: string): void {
  switch (name) {
    case "key":
    case "mode":
    case "initialChord":
    case "phrase":
    case "style":
    case "config":
    case "format":
    case "traceOut":
      result[name] = value;
      break;
    case "initial":
      result.initialChord = value;
      break;
    case "trace-out":
      result.traceOut = value;
      break;
    case "viz":
      if (!VIZ_TYPES.includes(value as VizType)) {
        throw new Error(`--viz must be one of ${VIZ_TYPES.join(" | ")}, got "${value}".`);
      }
      result.viz = value;
      break;
    case "viz-format":
      if (!VIZ_FORMATS.includes(value as VizFormat)) {
        throw new Error(`--viz-format must be one of ${VIZ_FORMATS.join(" | ")}, got "${value}".`);
      }
      result.vizFormat = value;
      break;
    case "viz-out":
      result.vizOut = value;
      break;
    case "midi":
      result.midi = value;
      break;
    case "wav":
      result.wav = value;
      break;
    case "bpm": {
      const bpm = parseNumber(name, value);
      if (bpm <= 0) {
        throw new Error(`--bpm must be a positive number, got "${value}".`);
      }
      result.bpm = bpm;
      break;
    }
    case "temperature":
    case "seed":
    case "steps":
      result[name] = parseNumber(name, value);
      break;
    case "trace":
      if (!TRACE_FORMATS.includes(value as TraceFormat)) {
        throw new Error(`--trace must be one of ${TRACE_FORMATS.join(" | ")}, got "${value}".`);
      }
      result.trace = value;
      break;
    default:
      throw new Error(`Unknown flag "--${name}".`);
  }
}

function parseNumber(name: string, value: string): number {
  const n = Number(value);
  if (!Number.isFinite(n)) {
    throw new Error(`Flag "--${name}" expects a number, got "${value}".`);
  }
  return n;
}

// ---------------------------------------------------------------------------
// Help
// ---------------------------------------------------------------------------

function usage(): string {
  const phrases = Object.keys(PhraseTemplates).join(", ");
  const styles = Object.keys(StyleProfiles).join(", ");
  return [
    "musiclab — generate a harmonic progression",
    "",
    "Usage:",
    "  musiclab [options]",
    "",
    "Options:",
    "  --steps <n>          Number of moves to generate after the start (default 8)",
    "  --initial <chord>    Starting chord, shown first, e.g. I (default I)",
    "  --key <key>          Key, e.g. C, G, Bb (default C)",
    "  --mode <mode>        major | minor | dorian | ... (default major)",
    "  --temperature <t>    Softmax temperature, >0 (default 0.8)",
    "  --seed <n>           Seed for reproducible output (default random)",
    `  --phrase <name>      Phrase template: ${phrases}`,
    `  --style <name>       Style profile: ${styles}`,
    "  --format <mode>      Output: roman | concrete | both (default both)",
    "  --config <path>      JSON file with any of the above fields",
    "  --trace <format>     Also export the full trace: json | csv",
    "  --trace-out <path>   Write the trace to a file instead of stdout",
    "  --viz <type>         Emit a visualization: topology | trajectory | tension",
    "  --viz-format <fmt>   Visualization format: mermaid | svg (default svg)",
    "  --viz-out <path>     Write the visualization to a file instead of stdout",
    "  --midi <path>        Export the progression as a .mid file",
    "  --wav <path>         Export the progression as a 16-bit PCM .wav file",
    "  --bpm <n>            Tempo for the exported MIDI/WAV, >0 (default 90)",
    "  --help               Show this help",
    "",
    "Examples:",
    "  musiclab --steps 8 --key G --seed 42",
    "  musiclab --style modalSurprising --phrase eightBarLongArc",
    "  musiclab --seed 42 --trace csv --trace-out run.csv",
    "  musiclab --seed 42 --viz topology --viz-format mermaid",
    "  musiclab --seed 42 --viz topology --viz-format svg --viz-out topology.svg",
    "  musiclab --seed 42 --viz tension --viz-out tension.svg",
    "  musiclab --seed 42 --midi out.mid --key G --bpm 110",
    "  musiclab --seed 42 --wav out.wav --bpm 90",
  ].join("\n");
}

function message(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause);
}

// ---------------------------------------------------------------------------
// Entrypoint
// ---------------------------------------------------------------------------

process.exitCode = main(process.argv.slice(2));
