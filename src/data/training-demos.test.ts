import { describe, expect, it } from "vitest";
import {
  computeDeepLearningState,
  computeFeatureLearningState,
  computeKMeansState,
  generateFeatureExamples,
  generateRawSignalExamples,
  generateSupervisedDemandData,
  generateUnsupervisedTopicData,
  getUnsupervisedClusterLabel,
  predictSupervisedDemand,
  simulateReinforcementEpisode
} from "./training-demos";

describe("training demo synthetic data", () => {
  it("generates a stable supervised train/test split", () => {
    const data = generateSupervisedDemandData();
    expect(data).toHaveLength(48);
    expect(data.filter((point) => point.split === "train")).toHaveLength(36);
    expect(data.filter((point) => point.split === "test")).toHaveLength(12);
    expect(data.some((point) => point.label === "high demand")).toBe(true);
    expect(data.some((point) => point.label === "normal demand")).toBe(true);
  });

  it("keeps supervised predictions finite across complexity levels", () => {
    const point = generateSupervisedDemandData()[8];
    expect(predictSupervisedDemand(point, 1, 1)).toBeGreaterThan(20);
    expect(predictSupervisedDemand(point, 5, 1)).toBeLessThan(110);
  });

  it("models feature-based ML as selected tabular feature weights", () => {
    const data = generateFeatureExamples();
    const untrained = computeFeatureLearningState(data, ["hour", "history"], 0);
    const trained = computeFeatureLearningState(data, ["hour", "history"], 8);
    const noWeather = computeFeatureLearningState(data, ["hour", "history"], 8);
    const withWeather = computeFeatureLearningState(data, ["hour", "history", "weather"], 8);
    expect(data).toHaveLength(30);
    expect(trained.loss).toBeLessThan(untrained.loss);
    expect(trained.weights.history).toBeGreaterThan(0);
    expect(trained.weights.station).toBe(0);
    expect(withWeather.accuracy).toBeGreaterThan(noWeather.accuracy);
  });

  it("models deep learning as improving layer activations and accuracy", () => {
    const signals = generateRawSignalExamples();
    const early = computeDeepLearningState(0);
    const late = computeDeepLearningState(10);
    expect(signals).toHaveLength(24);
    expect(new Set(signals.map((signal) => signal.label)).size).toBe(4);
    expect(late.loss).toBeLessThan(early.loss);
    expect(late.accuracy).toBeGreaterThan(early.accuracy);
    expect(late.layerActivations[2].values[0]).toBeGreaterThan(early.layerActivations[2].values[0]);
  });

  it("generates unlabeled topic points with stable cluster labels", () => {
    const data = generateUnsupervisedTopicData();
    expect(data).toHaveLength(36);
    expect(new Set(data.map((point) => point.domain)).size).toBe(4);
    expect(new Set(data.map((point) => getUnsupervisedClusterLabel(point, 2))).size).toBe(2);
    expect(new Set(data.map((point) => getUnsupervisedClusterLabel(point, 4))).size).toBe(4);
    expect(new Set(data.map((point) => getUnsupervisedClusterLabel(point, 6))).size).toBeGreaterThan(4);
  });

  it("shows k-means learning progress through lower within-cluster distance", () => {
    const data = generateUnsupervisedTopicData();
    const initial = computeKMeansState(data, "abstract-keywords", 4, 0);
    const learned = computeKMeansState(data, "abstract-keywords", 4, 6);
    expect(initial.centroids).toHaveLength(4);
    expect(learned.inertia).toBeLessThan(initial.inertia);
    expect(Object.keys(learned.assignments)).toHaveLength(data.length);
  });

  it("bounds reinforcement episode state", () => {
    const early = simulateReinforcementEpisode(0, 50, "wait");
    const late = simulateReinforcementEpisode(12, 20, "balance");
    expect(early.northQueue).toBeGreaterThanOrEqual(3);
    expect(early.eastQueue).toBeLessThanOrEqual(44);
    expect(late.policyConfidence).toBeGreaterThan(early.policyConfidence);
    expect(late.reward).toBeGreaterThan(early.reward);
    expect(Number.isFinite(late.qNorthSouth)).toBe(true);
    expect(Number.isFinite(late.temporalDifference)).toBe(true);
  });
});
