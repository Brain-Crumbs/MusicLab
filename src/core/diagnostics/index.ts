// Diagnostics and traceability (Wave 7)
//
// These types and the TraceRecorder consume generation output to produce
// explainable, serialisable diagnostics.  Nothing here affects generation.

// Score breakdown model (D7.1)
export type { ScoreBreakdown, FactorContribution } from "./ScoreBreakdown.js";
export { buildScoreBreakdown, contributionsByInfluence } from "./ScoreBreakdown.js";

// Distribution snapshot model (D7.2)
export type { DistributionSnapshot, CandidateSnapshot } from "./DistributionSnapshot.js";
export { buildDistributionSnapshot, shannonEntropy } from "./DistributionSnapshot.js";

// State snapshot model (D7.3)
export type { StateSnapshot, CadenceSnapshot } from "./StateSnapshot.js";
export { toStateSnapshot } from "./StateSnapshot.js";

// Trace recorder (D7.4)
export type { RecordTraceArgs } from "./TraceRecorder.js";
export { TraceRecorder } from "./TraceRecorder.js";
