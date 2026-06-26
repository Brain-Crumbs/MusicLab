// Probability distribution model (P5.1)
export { DiscreteProbabilityDistribution } from "./ProbabilityDistribution.js";
export type { ProbabilityEntry, ProbabilityWeight } from "./ProbabilityDistribution.js";
// Re-export the model-layer contract for convenience.
export type { ProbabilityDistribution } from "../model/GenerationStep.js";

// Softmax normaliser (P5.2)
export { Softmax } from "./Softmax.js";
export type { ScoredCandidate } from "./Softmax.js";

// Random source interface and seeded implementation (P5.3, P5.4)
export type { RandomSource } from "./RandomSource.js";
export { SeededRandomSource } from "./SeededRandomSource.js";

// Weighted sampler (P5.5)
export { WeightedSampler } from "./WeightedSampler.js";
export type { SampledCandidate } from "./WeightedSampler.js";
