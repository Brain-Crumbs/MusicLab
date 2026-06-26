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

interface CliArgs extends RawGeneratorOptions {
  readonly trace?: TraceFormat;
  /** File to write the trace to; stdout when omitted. */
  readonly traceOut?: string;
  /** "roman" | "concrete" | "both" — progression output style. */
  readonly format?: string;
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

    return 0;
  } catch (cause) {
    err(`Error: ${message(cause)}`);
    return 1;
  }
}

function exportTrace(
  result: ReturnType<ReturnType<typeof createDefaultMvpGenerator>["generate"]>,
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
    "  --steps <n>          Number of chords to generate (default 8)",
    "  --initial <chord>    Starting chord, e.g. I (default I)",
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
    "  --help               Show this help",
    "",
    "Examples:",
    "  musiclab --steps 8 --key G --seed 42",
    "  musiclab --style modalSurprising --phrase eightBarLongArc",
    "  musiclab --seed 42 --trace csv --trace-out run.csv",
  ].join("\n");
}

function message(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause);
}

// ---------------------------------------------------------------------------
// Entrypoint
// ---------------------------------------------------------------------------

process.exitCode = main(process.argv.slice(2));
