// Factor engine contracts (F4.1–F4.3)
export type { FactorEngine, RawFactorResult } from "./FactorEngine.js";
export { BaseFactor, clamp } from "./FactorEngine.js";
export type { FactorContext, BuildFactorContextArgs } from "./FactorContext.js";
export { buildFactorContext } from "./FactorContext.js";
export type { FactorScore } from "./FactorScore.js";
export { makeFactorScore } from "./FactorScore.js";

// Factor implementations (F4.4–F4.11)
export { HarmonicGravityFactor } from "./HarmonicGravityFactor.js";
export { TensionFitFactor } from "./TensionFitFactor.js";
export { PhraseFitFactor } from "./PhraseFitFactor.js";
export { CadenceFitFactor } from "./CadenceFitFactor.js";
export { NoveltyFactor } from "./NoveltyFactor.js";
export { SurpriseFactor } from "./SurpriseFactor.js";
export { StyleFactor } from "./StyleFactor.js";
export { MemoryFactor } from "./MemoryFactor.js";
