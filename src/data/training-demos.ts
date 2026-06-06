export type TrainingDemoSlug = "machine-learning" | "supervised-learning" | "unsupervised-learning" | "deep-learning" | "reinforcement-learning";
export type TrainingDemoKind = "supervised" | "unsupervised" | "reinforcement" | "feature-ml" | "deep-learning";
export type UnsupervisedFeatureMode = "abstract" | "abstract-keywords";
export type RewardObjective = "wait" | "emissions" | "balance";

export type TrainingDemoMetadata = {
  slug: string;
  bokId: string;
  kind: TrainingDemoKind;
  title: string;
  eyebrow: string;
  scenario: string;
  lesson: string;
};

export type SupervisedPoint = {
  id: string;
  hour: number;
  temperature: number;
  demand: number;
  label: "high demand" | "normal demand";
  split: "train" | "test";
};

export type FeatureKey = "hour" | "weather" | "history" | "station";

export type FeatureExample = {
  id: string;
  hour: number;
  rain: number;
  previousDemand: number;
  stationType: "hub" | "neighbourhood" | "campus";
  eventNearby: boolean;
  demand: number;
  highDemand: boolean;
};

export type FeatureLearningState = {
  epoch: number;
  loss: number;
  accuracy: number;
  weights: Record<FeatureKey, number>;
};

export type RawSignalExample = {
  id: string;
  label: "commute peak" | "event surge" | "quiet baseline" | "disruption";
  signal: number[];
  rawX: number;
  rawY: number;
  learnedX: number;
  learnedY: number;
};

export type DeepLearningState = {
  epoch: number;
  loss: number;
  accuracy: number;
  layerActivations: Array<{ layer: string; values: number[]; explanation: string }>;
};

export type ThesisTopicPoint = {
  id: string;
  title: string;
  domain: "TLO" | "ICT" | "E&I" | "SDM";
  topic: string;
  rawX: number;
  rawY: number;
  abstractX: number;
  abstractY: number;
  keywordX: number;
  keywordY: number;
};

export type ReinforcementEpisode = {
  episode: number;
  action: "north-south" | "east-west";
  stateLabel: string;
  northQueue: number;
  eastQueue: number;
  reward: number;
  rewardBreakdown: string;
  fixedTimerReward: number;
  averageWait: number;
  policyConfidence: number;
  qNorthSouth: number;
  qEastWest: number;
  previousQNorthSouth: number;
  previousQEastWest: number;
  targetValue: number;
  temporalDifference: number;
  learningRate: number;
};

export type KMeansCentroid = {
  id: string;
  x: number;
  y: number;
  previousX: number;
  previousY: number;
  label: string;
};

export type KMeansState = {
  iteration: number;
  assignments: Record<string, number>;
  centroids: KMeansCentroid[];
  movement: number;
  inertia: number;
};

export const TRAINING_DEMOS: TrainingDemoMetadata[] = [
  {
    slug: "machine-learning",
    bokId: "Machine Learning",
    kind: "feature-ml",
    title: "Machine Learning",
    eyebrow: "Feature table -> learned pattern",
    scenario: "Predict station demand from human-defined tabular features such as time, weather, demand history, and station type.",
    lesson: "Feature-based ML learns from prepared columns. The quality of the feature table strongly shapes what the model can discover."
  },
  {
    slug: "supervised-learning",
    bokId: "Supervised learning",
    kind: "supervised",
    title: "Supervised Learning",
    eyebrow: "Labeled examples -> prediction",
    scenario: "Forecast hourly station demand from weather, time of day, and known historical outcomes.",
    lesson: "The model learns because every training example already carries the answer it should predict."
  },
  {
    slug: "unsupervised-learning",
    bokId: "Unsupervised learning",
    kind: "unsupervised",
    title: "Unsupervised Learning",
    eyebrow: "Unlabeled records -> discovered structure",
    scenario: "Group thesis-like research records by similarity before any topic labels are shown.",
    lesson: "The algorithm proposes structure first; people decide whether the discovered groups make sense."
  },
  {
    slug: "deep-learning",
    bokId: "Deep Learning",
    kind: "deep-learning",
    title: "Deep Learning",
    eyebrow: "Raw signal -> learned representation",
    scenario: "Classify demand patterns directly from raw time-series shapes, letting layers build their own internal features.",
    lesson: "Deep learning is still machine learning, but it learns useful representations through layers instead of relying only on hand-built columns."
  },
  {
    slug: "reinforcement-learning",
    bokId: "Reinforcement learning",
    kind: "reinforcement",
    title: "Reinforcement Learning",
    eyebrow: "Actions -> rewards -> better policy",
    scenario: "Tune a traffic-light policy using repeated synthetic rush-hour episodes.",
    lesson: "The agent is not shown correct actions. It improves by trying actions and receiving consequences."
  }
];

export const TRAINING_DEMO_SLUGS = TRAINING_DEMOS.map((demo) => demo.slug);

export function isTrainingDemoSlug(slug: string): slug is TrainingDemoSlug {
  return TRAINING_DEMO_SLUGS.includes(slug as TrainingDemoSlug);
}

export function getTrainingDemo(slug: string): TrainingDemoMetadata | undefined {
  return TRAINING_DEMOS.find((demo) => demo.slug === slug);
}

function wave(seed: number): number {
  return Math.sin(seed * 12.9898) * 43758.5453 - Math.floor(Math.sin(seed * 12.9898) * 43758.5453);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function commutePeak(hour: number, centre: number, width: number, height: number): number {
  const distance = hour - centre;
  return height * Math.exp(-(distance * distance) / width);
}

export function generateSupervisedDemandData(): SupervisedPoint[] {
  return Array.from({ length: 48 }, (_, index) => {
    const hour = index;
    const dayHour = index % 24;
    const temperature = 10 + 8 * Math.sin(((dayHour - 6) / 24) * Math.PI * 2) + (index >= 24 ? 1.8 : 0);
    const morning = commutePeak(dayHour, 8, 9, 26);
    const evening = commutePeak(dayHour, 17, 13, 22);
    const lunch = commutePeak(dayHour, 13, 18, 8);
    const deterministicNoise = (wave(index + 2) - 0.5) * 7;
    const demand = Math.round(30 + morning + evening + lunch + temperature * 0.75 + deterministicNoise);
    return {
      id: `demand-${index}`,
      hour,
      temperature: Number(temperature.toFixed(1)),
      demand,
      label: demand >= 58 ? "high demand" : "normal demand",
      split: index % 4 === 3 ? "test" : "train"
    };
  });
}

export function predictSupervisedDemand(point: Pick<SupervisedPoint, "hour" | "temperature">, complexity: number, progress: number): number {
  const dayHour = point.hour % 24;
  const learned =
    31 +
    commutePeak(dayHour, 8, 11, 20 + complexity * 1.6) +
    commutePeak(dayHour, 17, 15, 17 + complexity * 1.2) +
    commutePeak(dayHour, 13, 22, 5 + complexity * 0.9) +
    point.temperature * 0.7;
  const overfit = complexity > 3 ? Math.sin(point.hour * 2.15) * (complexity - 3) * 3.8 : 0;
  const baseline = 52;
  return baseline * (1 - progress) + (learned + overfit) * progress;
}

export function generateFeatureExamples(): FeatureExample[] {
  const stationTypes: FeatureExample["stationType"][] = ["hub", "neighbourhood", "campus"];
  return Array.from({ length: 30 }, (_, index) => {
    const hour = (index * 3 + Math.floor(index / 3)) % 24;
    const stationType = stationTypes[index % stationTypes.length];
    const rain = Number((wave(index + 101) * 1.8).toFixed(1));
    const eventNearby = index % 7 === 0 || index % 11 === 0;
    const previousDemand = Math.round(
      22 +
        commutePeak(hour, 8, 10, 18) +
        commutePeak(hour, 17, 14, 15) +
        (stationType === "hub" ? 18 : stationType === "campus" ? 9 : 0) +
        (wave(index + 122) - 0.5) * 9
    );
    const demand = Math.round(
      previousDemand * 0.58 +
        commutePeak(hour, 8, 8, 14) +
        commutePeak(hour, 17, 12, 15) +
        rain * 4.2 +
        (stationType === "hub" ? 13 : stationType === "campus" ? 7 : 1) +
        (eventNearby ? 14 : 0) +
        5
    );
    return {
      id: `feature-${index}`,
      hour,
      rain,
      previousDemand,
      stationType,
      eventNearby,
      demand,
      highDemand: demand >= 62
    };
  });
}

export function computeFeatureLearningState(examples: FeatureExample[], selectedFeatures: FeatureKey[], epoch: number): FeatureLearningState {
  const boundedEpoch = Math.round(clamp(epoch, 0, 8));
  const progress = 1 - Math.exp(-boundedEpoch / 2.6);
  const featureStrength: Record<FeatureKey, number> = {
    hour: 0.78,
    weather: 0.42,
    history: 0.92,
    station: 0.64
  };
  const selectedStrength = selectedFeatures.reduce((sum, feature) => sum + featureStrength[feature], 0);
  const maxStrength = Object.values(featureStrength).reduce((sum, value) => sum + value, 0);
  const coverage = selectedStrength / maxStrength;
  const loss = Number((34 - progress * 22 * coverage + (selectedFeatures.length < 2 ? 6 : 0)).toFixed(1));
  const accuracy = Number(clamp(0.48 + progress * 0.43 * coverage + selectedFeatures.length * 0.012, 0.48, 0.94).toFixed(2));
  const weights = Object.fromEntries(
    (Object.keys(featureStrength) as FeatureKey[]).map((feature) => [
      feature,
      Number(((selectedFeatures.includes(feature) ? featureStrength[feature] : 0) * progress).toFixed(2))
    ])
  ) as Record<FeatureKey, number>;
  return { epoch: boundedEpoch, loss, accuracy, weights };
}

export function predictFeatureDemand(example: FeatureExample, state: FeatureLearningState): number {
  const hourSignal = (commutePeak(example.hour, 8, 8, 1) + commutePeak(example.hour, 17, 12, 1)) * 28 * state.weights.hour;
  const weatherSignal = example.rain * 5.4 * state.weights.weather;
  const historySignal = example.previousDemand * 0.62 * state.weights.history;
  const stationSignal = (example.stationType === "hub" ? 20 : example.stationType === "campus" ? 11 : 3) * state.weights.station;
  return Number((32 + hourSignal + weatherSignal + historySignal + stationSignal).toFixed(1));
}

function signalValue(label: RawSignalExample["label"], step: number, variant: number): number {
  const base = label === "quiet baseline" ? 28 : label === "disruption" ? 42 : 34;
  const morning = label === "commute peak" ? commutePeak(step, 6, 7, 44) : commutePeak(step, 7, 12, 13);
  const evening = label === "commute peak" ? commutePeak(step, 15, 9, 36) : commutePeak(step, 15, 18, 9);
  const event = label === "event surge" ? commutePeak(step, 12 + variant, 8, 48) : 0;
  const disruption = label === "disruption" ? Math.max(0, (step - 8) * 3.4) : 0;
  const noise = (wave(step * 10 + variant * 13 + label.length) - 0.5) * 6;
  return Math.round(base + morning + evening + event + disruption + noise);
}

export function generateRawSignalExamples(): RawSignalExample[] {
  const labels: RawSignalExample["label"][] = ["commute peak", "event surge", "quiet baseline", "disruption"];
  return Array.from({ length: 24 }, (_, index) => {
    const label = labels[index % labels.length];
    const variant = Math.floor(index / labels.length);
    const signal = Array.from({ length: 18 }, (_, step) => signalValue(label, step, variant));
    const centreIndex = labels.indexOf(label);
    const learnedCentres = [
      { x: 150, y: 125 },
      { x: 472, y: 130 },
      { x: 165, y: 300 },
      { x: 480, y: 300 }
    ];
    const angle = wave(index + 211) * Math.PI * 2;
    return {
      id: `signal-${index}`,
      label,
      signal,
      rawX: Math.round(320 + Math.cos(angle) * (120 + wave(index + 214) * 70)),
      rawY: Math.round(210 + Math.sin(angle) * (70 + wave(index + 217) * 56)),
      learnedX: Math.round(learnedCentres[centreIndex].x + Math.cos(angle) * (16 + variant * 5)),
      learnedY: Math.round(learnedCentres[centreIndex].y + Math.sin(angle) * (14 + variant * 5))
    };
  });
}

export function computeDeepLearningState(epoch: number): DeepLearningState {
  const boundedEpoch = Math.round(clamp(epoch, 0, 10));
  const progress = 1 - Math.exp(-boundedEpoch / 3.1);
  return {
    epoch: boundedEpoch,
    loss: Number((1.48 - progress * 1.03).toFixed(2)),
    accuracy: Number(clamp(0.36 + progress * 0.55, 0.36, 0.92).toFixed(2)),
    layerActivations: [
      {
        layer: "Layer 1",
        explanation: "local peaks and dips",
        values: [0.22 + progress * 0.42, 0.18 + progress * 0.36, 0.28 + progress * 0.31]
      },
      {
        layer: "Layer 2",
        explanation: "daily motifs",
        values: [0.14 + progress * 0.58, 0.2 + progress * 0.45, 0.12 + progress * 0.52]
      },
      {
        layer: "Embedding",
        explanation: "learned similarity",
        values: [0.1 + progress * 0.72, 0.16 + progress * 0.66, 0.18 + progress * 0.61]
      }
    ].map((layer) => ({
      ...layer,
      values: layer.values.map((value) => Number(clamp(value, 0.05, 0.98).toFixed(2)))
    }))
  };
}

const TOPIC_SEEDS: Array<Pick<ThesisTopicPoint, "domain" | "topic" | "title">> = [
  { domain: "TLO", topic: "Routing", title: "Freight routing under urban delivery pressure" },
  { domain: "TLO", topic: "Mobility", title: "Bike-sharing demand around transit stations" },
  { domain: "TLO", topic: "Aviation", title: "Delay patterns in airport turnaround operations" },
  { domain: "ICT", topic: "NLP", title: "Classifying citizen reports with language models" },
  { domain: "ICT", topic: "Cybersecurity", title: "Detecting anomalous access in public platforms" },
  { domain: "ICT", topic: "Platforms", title: "Trust signals in digital service ecosystems" },
  { domain: "E&I", topic: "Energy", title: "Forecasting neighbourhood electricity peaks" },
  { domain: "E&I", topic: "Maintenance", title: "Predictive maintenance for industrial pumps" },
  { domain: "E&I", topic: "Climate", title: "Emission scenarios for circular supply chains" },
  { domain: "SDM", topic: "Decision support", title: "Monitoring policy trade-offs in crisis response" },
  { domain: "SDM", topic: "Healthcare", title: "Patient-flow alerts for hospital capacity planning" },
  { domain: "SDM", topic: "Governance", title: "Risk scoring for public infrastructure portfolios" }
];

const DOMAIN_CENTRES: Record<ThesisTopicPoint["domain"], { x: number; y: number }> = {
  TLO: { x: 165, y: 130 },
  ICT: { x: 470, y: 120 },
  "E&I": { x: 185, y: 275 },
  SDM: { x: 470, y: 275 }
};

const INITIAL_CENTROIDS = [
  { x: 130, y: 90 },
  { x: 510, y: 105 },
  { x: 155, y: 315 },
  { x: 505, y: 300 },
  { x: 320, y: 92 },
  { x: 318, y: 312 }
];

export function generateUnsupervisedTopicData(): ThesisTopicPoint[] {
  return Array.from({ length: 36 }, (_, index) => {
    const seed = TOPIC_SEEDS[index % TOPIC_SEEDS.length];
    const centre = DOMAIN_CENTRES[seed.domain];
    const offset = Math.floor(index / TOPIC_SEEDS.length);
    const angle = wave(index + 14) * Math.PI * 2;
    const rawRadius = 95 + wave(index + 44) * 85;
    const clusterRadius = 18 + wave(index + 7) * 25;
    return {
      id: `topic-${index}`,
      title: `${seed.title} ${offset + 1}`,
      domain: seed.domain,
      topic: seed.topic,
      rawX: Math.round(315 + Math.cos(angle) * rawRadius + (wave(index + 21) - 0.5) * 80),
      rawY: Math.round(200 + Math.sin(angle) * rawRadius * 0.72 + (wave(index + 28) - 0.5) * 58),
      abstractX: Math.round(centre.x + Math.cos(angle) * clusterRadius),
      abstractY: Math.round(centre.y + Math.sin(angle) * clusterRadius),
      keywordX: Math.round(centre.x + Math.cos(angle) * (clusterRadius + 18) + (offset - 1) * 16),
      keywordY: Math.round(centre.y + Math.sin(angle) * (clusterRadius + 12) + (index % 3 - 1) * 10)
    };
  });
}

export function getUnsupervisedClusterLabel(point: ThesisTopicPoint, granularity: number): string {
  if (granularity <= 2) {
    return point.domain === "ICT" || point.domain === "SDM" ? "Digital decision systems" : "Physical infrastructure systems";
  }
  if (granularity >= 5) {
    return point.topic;
  }
  return point.domain;
}

export function getUnsupervisedPosition(point: ThesisTopicPoint, featureMode: UnsupervisedFeatureMode, progress: number): { x: number; y: number } {
  const targetX = featureMode === "abstract-keywords" ? point.keywordX : point.abstractX;
  const targetY = featureMode === "abstract-keywords" ? point.keywordY : point.abstractY;
  return {
    x: point.rawX * (1 - progress) + targetX * progress,
    y: point.rawY * (1 - progress) + targetY * progress
  };
}

function targetPosition(point: ThesisTopicPoint, featureMode: UnsupervisedFeatureMode): { x: number; y: number } {
  return getUnsupervisedPosition(point, featureMode, 1);
}

function assignPoints(points: ThesisTopicPoint[], centroids: Array<{ x: number; y: number }>, featureMode: UnsupervisedFeatureMode): Record<string, number> {
  const assignments: Record<string, number> = {};
  for (const point of points) {
    const position = targetPosition(point, featureMode);
    let bestIndex = 0;
    let bestDistance = Number.POSITIVE_INFINITY;
    centroids.forEach((centroid, index) => {
      const dx = position.x - centroid.x;
      const dy = position.y - centroid.y;
      const distance = dx * dx + dy * dy;
      if (distance < bestDistance) {
        bestIndex = index;
        bestDistance = distance;
      }
    });
    assignments[point.id] = bestIndex;
  }
  return assignments;
}

function recomputeCentroids(
  points: ThesisTopicPoint[],
  assignments: Record<string, number>,
  centroids: Array<{ x: number; y: number }>,
  featureMode: UnsupervisedFeatureMode
): Array<{ x: number; y: number }> {
  return centroids.map((centroid, index) => {
    const assigned = points.filter((point) => assignments[point.id] === index);
    if (!assigned.length) return centroid;
    const sum = assigned.reduce(
      (current, point) => {
        const position = targetPosition(point, featureMode);
        return { x: current.x + position.x, y: current.y + position.y };
      },
      { x: 0, y: 0 }
    );
    return {
      x: sum.x / assigned.length,
      y: sum.y / assigned.length
    };
  });
}

function centroidLabel(points: ThesisTopicPoint[], assignments: Record<string, number>, index: number, clusterCount: number): string {
  const assigned = points.filter((point) => assignments[point.id] === index);
  if (!assigned.length) return `Cluster ${index + 1}`;
  const labels = assigned.map((point) => (clusterCount >= 5 ? point.topic : point.domain));
  const counts = labels.reduce<Record<string, number>>((current, label) => {
    current[label] = (current[label] || 0) + 1;
    return current;
  }, {});
  return Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0][0];
}

export function computeKMeansState(points: ThesisTopicPoint[], featureMode: UnsupervisedFeatureMode, clusterCount: number, iteration: number): KMeansState {
  const boundedCount = Math.round(clamp(clusterCount, 2, INITIAL_CENTROIDS.length));
  const boundedIteration = Math.round(clamp(iteration, 0, 6));
  let centroids = INITIAL_CENTROIDS.slice(0, boundedCount).map((centroid) => ({ ...centroid }));
  let previous = centroids.map((centroid) => ({ ...centroid }));
  let assignments = assignPoints(points, centroids, featureMode);

  for (let step = 0; step < boundedIteration; step += 1) {
    assignments = assignPoints(points, centroids, featureMode);
    previous = centroids.map((centroid) => ({ ...centroid }));
    centroids = recomputeCentroids(points, assignments, centroids, featureMode);
  }

  assignments = assignPoints(points, centroids, featureMode);
  const inertia = points.reduce((sum, point) => {
    const position = targetPosition(point, featureMode);
    const centroid = centroids[assignments[point.id]];
    const dx = position.x - centroid.x;
    const dy = position.y - centroid.y;
    return sum + Math.sqrt(dx * dx + dy * dy);
  }, 0);
  const movement = centroids.reduce((sum, centroid, index) => {
    const dx = centroid.x - previous[index].x;
    const dy = centroid.y - previous[index].y;
    return sum + Math.sqrt(dx * dx + dy * dy);
  }, 0);

  return {
    iteration: boundedIteration,
    assignments,
    centroids: centroids.map((centroid, index) => ({
      id: `centroid-${index}`,
      x: centroid.x,
      y: centroid.y,
      previousX: previous[index].x,
      previousY: previous[index].y,
      label: centroidLabel(points, assignments, index, boundedCount)
    })),
    movement: Number(movement.toFixed(1)),
    inertia: Number(inertia.toFixed(1))
  };
}

function qValueFor(
  action: "north-south" | "east-west",
  episode: number,
  explorationPenalty: number,
  objective: RewardObjective,
  northQueue: number,
  eastQueue: number
): number {
  const learning = 1 - Math.exp(-episode / 4.2);
  const actionQueue = action === "north-south" ? northQueue : eastQueue;
  const otherQueue = action === "north-south" ? eastQueue : northQueue;
  const balanceTerm = objective === "balance" ? -Math.abs(actionQueue - otherQueue) * 0.2 : 0;
  const emissionsTerm = objective === "emissions" ? -actionQueue * 0.1 : 0;
  const explorationTerm = -explorationPenalty * 4;
  return Number((learning * 28 - actionQueue * 0.42 + otherQueue * 0.1 + balanceTerm + emissionsTerm + explorationTerm).toFixed(1));
}

export function simulateReinforcementEpisode(episode: number, exploration: number, objective: RewardObjective): ReinforcementEpisode {
  const boundedEpisode = clamp(episode, 0, 12);
  const learning = 1 - Math.exp(-boundedEpisode / 4.2);
  const explorationPenalty = exploration / 100;
  const balancePressure = objective === "balance" ? 0.78 : 1;
  const emissionsPressure = objective === "emissions" ? 0.86 : 1;
  const northArrival = 28 + Math.round(8 * Math.sin((boundedEpisode + 1) * 0.8));
  const eastArrival = 24 + Math.round(7 * Math.cos((boundedEpisode + 2) * 0.72));
  const learnedService = 10 + learning * 22 - explorationPenalty * 5;
  const northQueue = Math.round(clamp((northArrival - learnedService * balancePressure) * emissionsPressure + 18 * (1 - learning), 3, 44));
  const eastQueue = Math.round(clamp((eastArrival - learnedService * (2 - balancePressure)) * emissionsPressure + 16 * (1 - learning), 3, 44));
  const averageWait = Number(clamp((northQueue + eastQueue) * 0.42 + explorationPenalty * 8, 4, 42).toFixed(1));
  const fixedTimerReward = -34;
  const objectiveBonus = objective === "emissions" ? 5 : objective === "balance" ? 3 : 0;
  const reward = Math.round(clamp(-averageWait + learning * 25 + objectiveBonus - explorationPenalty * 5, -45, 18));
  const previousEpisode = Math.max(0, boundedEpisode - 1);
  const previousLearning = 1 - Math.exp(-previousEpisode / 4.2);
  const previousNorthQueue = Math.round(clamp((northArrival - (10 + previousLearning * 22 - explorationPenalty * 5) * balancePressure) * emissionsPressure + 18 * (1 - previousLearning), 3, 44));
  const previousEastQueue = Math.round(
    clamp((eastArrival - (10 + previousLearning * 22 - explorationPenalty * 5) * (2 - balancePressure)) * emissionsPressure + 16 * (1 - previousLearning), 3, 44)
  );
  const previousQNorthSouth = qValueFor("north-south", previousEpisode, explorationPenalty, objective, previousNorthQueue, previousEastQueue);
  const previousQEastWest = qValueFor("east-west", previousEpisode, explorationPenalty, objective, previousNorthQueue, previousEastQueue);
  const action = northQueue >= eastQueue ? "north-south" : "east-west";
  const previousChosen = action === "north-south" ? previousQNorthSouth : previousQEastWest;
  const nextBest = Math.max(previousQNorthSouth, previousQEastWest);
  const learningRate = 0.35;
  const discount = 0.62;
  const targetValue = Number((reward + discount * nextBest).toFixed(1));
  const temporalDifference = Number((targetValue - previousChosen).toFixed(1));
  const updatedChosen = Number((previousChosen + learningRate * temporalDifference).toFixed(1));
  const qNorthSouth = action === "north-south" ? updatedChosen : previousQNorthSouth;
  const qEastWest = action === "east-west" ? updatedChosen : previousQEastWest;
  const stateLabel = northQueue > eastQueue + 5 ? "N-S queue pressure" : eastQueue > northQueue + 5 ? "E-W queue pressure" : "balanced queues";
  const rewardBreakdown =
    objective === "emissions"
      ? "reward = low delay + fewer idling cars"
      : objective === "balance"
        ? "reward = short wait + balanced queues"
        : "reward = low average wait";
  return {
    episode: boundedEpisode,
    action,
    stateLabel,
    northQueue,
    eastQueue,
    reward,
    rewardBreakdown,
    fixedTimerReward,
    averageWait,
    policyConfidence: Number(clamp(0.22 + learning * 0.7 - explorationPenalty * 0.18, 0.12, 0.94).toFixed(2)),
    qNorthSouth,
    qEastWest,
    previousQNorthSouth,
    previousQEastWest,
    targetValue,
    temporalDifference,
    learningRate
  };
}
