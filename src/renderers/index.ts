// Renderers (Wave 8)
//
// All renderers consume final generation output only — they never call back
// into the generator and have no effect on generation behaviour.

// Roman numeral renderer (R8.1)
export { RomanNumeralRenderer } from "./RomanNumeralRenderer.js";
export type { RomanNumeralRenderOptions } from "./RomanNumeralRenderer.js";

// Concrete chord renderer (R8.2)
export { ConcreteChordRenderer, defaultMvpResolver } from "./ConcreteChordRenderer.js";
export type { ChordResolver, ConcreteChordSymbols } from "./ConcreteChordRenderer.js";

// Progression text renderer (R8.3)
export { ProgressionTextRenderer } from "./ProgressionTextRenderer.js";
export type {
  ProgressionTextMode,
  ProgressionTextOptions,
  ProgressionTextRendererDeps,
} from "./ProgressionTextRenderer.js";

// Lead sheet renderer (R8.4)
export { LeadSheetRenderer } from "./LeadSheetRenderer.js";
export type { LeadSheetOptions } from "./LeadSheetRenderer.js";

// JSON trace renderer (R8.5)
export { JsonTraceRenderer } from "./JsonTraceRenderer.js";
export type {
  JsonTraceOptions,
  JsonTrace,
  JsonStep,
  JsonCandidate,
  JsonFactor,
} from "./JsonTraceRenderer.js";

// CSV trace renderer (R8.6)
export { CsvTraceRenderer } from "./CsvTraceRenderer.js";
export type { CsvTraceOptions } from "./CsvTraceRenderer.js";
