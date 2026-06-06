import { ArrowLeft, Eye, EyeOff, Pause, Play, RotateCcw, SlidersHorizontal } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { getBokElementBySlug } from "../data/bok-content";
import {
  computeKMeansState,
  computeDeepLearningState,
  computeFeatureLearningState,
  generateFeatureExamples,
  generateRawSignalExamples,
  generateSupervisedDemandData,
  generateUnsupervisedTopicData,
  getTrainingDemo,
  getUnsupervisedPosition,
  predictFeatureDemand,
  predictSupervisedDemand,
  simulateReinforcementEpisode,
  TRAINING_DEMOS,
  type FeatureKey,
  type RewardObjective,
  type TrainingDemoKind,
  type UnsupervisedFeatureMode
} from "../data/training-demos";
import { routeToHash } from "../lib/routes";

type DemoPhase = "raw" | "split" | "training" | "trained";
type UnsupervisedPhase = "raw" | "embedding" | "clustering" | "clustered";

const SUPERVISED_THRESHOLD = 58;
const MAX_FEATURE_EPOCH = 8;
const MAX_DEEP_EPOCH = 10;
const MAX_SUPERVISED_EPOCH = 8;
const MAX_CLUSTER_ITERATION = 6;
const CLUSTER_COLORS = ["#00a6d6", "#28a745", "#ffc107", "#dc3545", "#7b61ff", "#00897b", "#9c6b00", "#455a64"];

function formatNumber(value: number, digits = 0): string {
  return new Intl.NumberFormat("en", { maximumFractionDigits: digits }).format(value);
}

function formatSigned(value: number, digits = 0): string {
  const formatted = formatNumber(Math.abs(value), digits);
  return `${value >= 0 ? "+" : "-"}${formatted}`;
}

export function TrainingDemoPage({ slug }: { slug: string }) {
  const demo = getTrainingDemo(slug);
  const element = getBokElementBySlug(slug);

  if (!demo) {
    return (
      <section className="empty-state">
        <SlidersHorizontal aria-hidden="true" />
        <h2>Training demo unavailable</h2>
        <p>This taxonomy element does not have an interactive training-strategy demo yet.</p>
        <a className="demo-back-link" href="#overview">
          <ArrowLeft aria-hidden="true" />
          Back to overview
        </a>
      </section>
    );
  }

  return (
    <>
      <section className="demo-hero">
        <a className="demo-back-link" href={routeToHash({ page: "overview", slug: demo.slug })}>
          <ArrowLeft aria-hidden="true" />
          Back to BoK bubble
        </a>
        <div className="demo-hero-grid">
          <div>
            <p className="eyebrow">{demo.eyebrow}</p>
            <h2>{demo.title}</h2>
            <p>{demo.scenario}</p>
          </div>
          <nav className="demo-tabs" aria-label="Training strategy demos">
            {TRAINING_DEMOS.map((item) => (
              <a key={item.slug} className={item.slug === demo.slug ? "active" : ""} href={routeToHash({ page: "demo", slug: item.slug })}>
                {item.title.replace(" Learning", "")}
              </a>
            ))}
          </nav>
        </div>
      </section>

      <section className="demo-layout">
        <div className="demo-stage-card">
          <TrainingDemoVisual kind={demo.kind} />
        </div>
        <aside className="demo-info-panel" aria-label={`${demo.title} explanation`}>
          <article>
            <div className="detail-kicker">
              <span>Training strategy</span>
              <span>{demo.title}</span>
            </div>
            <h2>{element.title}</h2>
            <p className="subtitle">{element.definition}</p>
            <section className="summary-block">
              <h3>Core lesson</h3>
              <p>{demo.lesson}</p>
            </section>
            <section className="summary-block">
              <h3>Where it sits</h3>
              <p>{element.relationship}</p>
            </section>
          </article>
        </aside>
      </section>
    </>
  );
}

function TrainingDemoVisual({ kind }: { kind: TrainingDemoKind }) {
  if (kind === "feature-ml") return <FeatureMachineLearningDemo />;
  if (kind === "supervised") return <SupervisedDemo />;
  if (kind === "unsupervised") return <UnsupervisedDemo />;
  if (kind === "deep-learning") return <DeepLearningDemo />;
  return <ReinforcementDemo />;
}

function DemoButton({ icon, label, onClick, active = false }: { icon: ReactNode; label: string; onClick: () => void; active?: boolean }) {
  return (
    <button className={active ? "demo-button active" : "demo-button"} type="button" onClick={onClick}>
      {icon}
      <span>{label}</span>
    </button>
  );
}

function MetricChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="demo-metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function LearningTimeline({ current, max, active, label }: { current: number; max: number; active: boolean; label: string }) {
  return (
    <div className="learning-timeline" aria-label={label}>
      <span>{label}</span>
      <div>
        {Array.from({ length: max + 1 }, (_, index) => (
          <i key={index} className={active && index <= current ? "done" : ""} title={`${label} ${index}`} />
        ))}
      </div>
    </div>
  );
}

function FeatureMachineLearningDemo() {
  const examples = useMemo(() => generateFeatureExamples(), []);
  const [selectedFeatures, setSelectedFeatures] = useState<FeatureKey[]>(["hour", "weather", "history", "station"]);
  const [task, setTask] = useState<"regression" | "classification">("regression");
  const [epoch, setEpoch] = useState(0);
  const [playing, setPlaying] = useState(false);
  const state = useMemo(() => computeFeatureLearningState(examples, selectedFeatures, epoch), [examples, selectedFeatures, epoch]);
  const previewRows = examples.slice(0, 6);
  const testRows = examples.slice(-8);
  const averageError = testRows.reduce((sum, row) => sum + Math.abs(row.demand - predictFeatureDemand(row, state)), 0) / testRows.length;
  const classificationCorrect = testRows.filter((row) => (predictFeatureDemand(row, state) >= 62) === row.highDemand).length;
  const explanation =
    task === "regression"
      ? "Feature-based ML learns weights on prepared columns. The numeric prediction improves when useful columns are included and the loss falls over epochs."
      : "The same feature table can support classification by turning the numeric prediction into a category, such as high demand versus normal demand.";

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      setEpoch((current) => {
        if (current >= MAX_FEATURE_EPOCH) {
          setPlaying(false);
          return current;
        }
        return current + 1;
      });
    }, 650);
    return () => window.clearInterval(timer);
  }, [playing]);

  function toggleFeature(feature: FeatureKey) {
    setSelectedFeatures((current) => {
      if (current.includes(feature)) return current.filter((item) => item !== feature);
      return [...current, feature];
    });
  }

  function reset() {
    setPlaying(false);
    setEpoch(0);
  }

  return (
    <>
      <div className="demo-card-head">
        <div>
          <h2>Learning from predefined tabular features</h2>
          <p>Raw station observations become columns; the model learns which columns predict demand.</p>
        </div>
        <div className="demo-controls">
          <DemoButton icon={playing ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />} label={playing ? "Pause" : "Train weights"} onClick={() => setPlaying((value) => !value)} active={playing || epoch > 0} />
          <DemoButton icon={<RotateCcw aria-hidden="true" />} label="Reset" onClick={reset} />
        </div>
      </div>
      <div className="demo-control-row">
        <label className="demo-select">
          <span>Task</span>
          <select value={task} onChange={(event) => setTask(event.target.value as "regression" | "classification")}>
            <option value="regression">Regression: predict demand</option>
            <option value="classification">Classification: high demand?</option>
          </select>
        </label>
        <div className="feature-toggle-group" aria-label="Feature toggles">
          {(["hour", "weather", "history", "station"] as FeatureKey[]).map((feature) => (
            <button key={feature} type="button" className={selectedFeatures.includes(feature) ? "feature-chip active" : "feature-chip"} onClick={() => toggleFeature(feature)}>
              {feature}
            </button>
          ))}
        </div>
      </div>
      <div className="demo-metrics">
        <MetricChip label="Epoch" value={`${epoch}/${MAX_FEATURE_EPOCH}`} />
        <MetricChip label="Selected features" value={`${selectedFeatures.length}/4`} />
        <MetricChip label="Loss" value={epoch ? `${formatNumber(state.loss, 1)}` : "waiting"} />
        <MetricChip label={task === "regression" ? "Mean error" : "Class accuracy"} value={task === "regression" ? `${formatNumber(averageError, 1)} trips` : `${classificationCorrect}/${testRows.length}`} />
        <MetricChip label="Pattern learned" value={`${Math.round(state.accuracy * 100)}%`} />
      </div>
      <LearningTimeline current={epoch} max={MAX_FEATURE_EPOCH} active={epoch > 0 || playing} label="feature-weight updates" />
      <FeatureLearningSvg examples={previewRows} state={state} task={task} selectedFeatures={selectedFeatures} />
      <DemoExplainer text={explanation} />
    </>
  );
}

function FeatureLearningSvg({
  examples,
  state,
  task,
  selectedFeatures
}: {
  examples: ReturnType<typeof generateFeatureExamples>;
  state: ReturnType<typeof computeFeatureLearningState>;
  task: "regression" | "classification";
  selectedFeatures: FeatureKey[];
}) {
  const featureLabels: Record<FeatureKey, string> = {
    hour: "hour",
    weather: "rain",
    history: "previous",
    station: "station"
  };
  const selected = new Set(selectedFeatures);
  return (
    <div className="demo-svg-wrap">
      <svg className="demo-svg feature-ml-svg" viewBox="0 0 760 430" role="img" aria-label="Feature based machine learning animation">
        <rect x="0" y="0" width="760" height="430" rx="8" className="demo-plot-bg" />
        <g className="pipeline-labels">
          <text x="42" y="38">raw observations</text>
          <text x="280" y="38">human-defined feature table</text>
          <text x="572" y="38">learned model</text>
        </g>
        {examples.slice(0, 4).map((row, index) => (
          <g key={row.id} className="raw-card" transform={`translate(34 ${62 + index * 62})`}>
            <rect width="190" height="48" rx="8" />
            <text x="12" y="20">{`${row.hour}:00 ${row.stationType}`}</text>
            <text x="12" y="38">{`${row.rain}mm rain, prev ${row.previousDemand}`}</text>
          </g>
        ))}
        <path className="pipeline-arrow" d="M 232 180 C 252 180 252 180 270 180" />
        <g className="feature-table" transform="translate(278 64)">
          <rect width="250" height="244" rx="8" />
          {(["hour", "weather", "history", "station"] as FeatureKey[]).map((feature, index) => (
            <g key={feature} className={selected.has(feature) ? "feature-column active" : "feature-column"} transform={`translate(${12 + index * 58} 18)`}>
              <rect width="48" height="202" rx="6" />
              <text x="24" y="19" textAnchor="middle">{featureLabels[feature]}</text>
              {examples.slice(0, 5).map((row, rowIndex) => {
                const value =
                  feature === "hour"
                    ? `${row.hour}`
                    : feature === "weather"
                      ? `${row.rain}`
                      : feature === "history"
                        ? `${row.previousDemand}`
                        : row.stationType.slice(0, 3);
                return (
                  <text key={`${feature}-${row.id}`} x="24" y={48 + rowIndex * 29} textAnchor="middle">
                    {value}
                  </text>
                );
              })}
            </g>
          ))}
        </g>
        <path className="pipeline-arrow" d="M 536 180 C 556 180 556 180 574 180" />
        <g className="weight-panel" transform="translate(578 62)">
          <rect width="148" height="210" rx="8" />
          <text x="16" y="26">feature weights</text>
          {(["hour", "weather", "history", "station"] as FeatureKey[]).map((feature, index) => (
            <g key={feature} transform={`translate(16 ${52 + index * 36})`}>
              <text x="0" y="13">{featureLabels[feature]}</text>
              <rect x="62" y="2" width="64" height="12" rx="6" className="q-track" />
              <rect x="62" y="2" width={Math.max(2, state.weights[feature] * 64)} height="12" rx="6" className={selected.has(feature) ? "feature-weight active" : "feature-weight"} />
            </g>
          ))}
        </g>
        <g className="prediction-card" transform="translate(578 292)">
          <rect width="148" height="86" rx="8" />
          <text x="16" y="24">output</text>
          <text x="16" y="52">{task === "regression" ? "number: trips" : "category: high?"}</text>
          <text x="16" y="72">{task === "regression" ? `loss ${formatNumber(state.loss, 1)}` : `${Math.round(state.accuracy * 100)}% correct`}</text>
        </g>
        <g className="update-callout">
          <rect x="266" y="334" width="296" height="58" rx="8" />
          <text x="280" y="358">feature engineering decides what the model can see</text>
          <text x="280" y="378">training adjusts weights on selected columns</text>
        </g>
      </svg>
    </div>
  );
}

function SupervisedDemo() {
  const data = useMemo(() => generateSupervisedDemandData(), []);
  const [phase, setPhase] = useState<DemoPhase>("raw");
  const [epoch, setEpoch] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [complexity, setComplexity] = useState(3);
  const [showLabels, setShowLabels] = useState(true);
  const trainingProgress = phase === "raw" || phase === "split" ? 0 : epoch / MAX_SUPERVISED_EPOCH;
  const testPoints = data.filter((point) => point.split === "test");
  const trainPoints = data.filter((point) => point.split === "train");
  const trainLoss = trainPoints.reduce((sum, point) => sum + Math.abs(point.demand - predictSupervisedDemand(point, complexity, trainingProgress)), 0) / trainPoints.length;
  const testLoss = testPoints.reduce((sum, point) => sum + Math.abs(point.demand - predictSupervisedDemand(point, complexity, trainingProgress)), 0) / testPoints.length;
  const correctCount =
    phase === "trained" || phase === "training"
      ? testPoints.filter((point) => {
          const predictedHigh = predictSupervisedDemand(point, complexity, trainingProgress) >= SUPERVISED_THRESHOLD;
          return predictedHigh === (point.label === "high demand");
        }).length
      : 0;
  const focusPoint = trainPoints[(Math.max(epoch, 1) * 3) % trainPoints.length];
  const nextLabel = phase === "raw" ? "Split data" : playing ? "Pause" : phase === "trained" ? "Replay epochs" : "Train epochs";
  const explanation =
    phase === "raw"
      ? "Every dot has a known demand label. Supervised learning starts with examples where the answer is already attached."
      : phase === "split"
        ? "The model sees only the training examples. The held-out test points wait on the side as an honest check."
        : phase === "training"
          ? "Each epoch compares predictions with labeled training points, measures error, and nudges the curve toward lower loss."
          : "After training, the frozen curve predicts unseen test demand. Green rings mark correct high/normal decisions; red rings show mistakes.";

  useEffect(() => {
    if (!playing) return;
    setPhase("training");
    const timer = window.setInterval(() => {
      setEpoch((current) => {
        if (current >= MAX_SUPERVISED_EPOCH) {
          setPlaying(false);
          setPhase("trained");
          return current;
        }
        return current + 1;
      });
    }, 650);
    return () => window.clearInterval(timer);
  }, [playing]);

  function advancePhase() {
    if (phase === "raw") {
      setPhase("split");
      return;
    }
    if (playing) {
      setPlaying(false);
      return;
    }
    if (phase === "trained") {
      setEpoch(0);
    }
    setPlaying(true);
    setPhase("training");
  }

  function reset() {
    setPlaying(false);
    setEpoch(0);
    setPhase("raw");
  }

  return (
    <>
      <div className="demo-card-head">
        <div>
          <h2>Predicting station demand</h2>
          <p>Historical observations carry the answer: normal or high demand.</p>
        </div>
        <div className="demo-controls">
          <DemoButton icon={playing ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />} label={nextLabel} onClick={advancePhase} active={phase !== "raw"} />
          <DemoButton icon={<RotateCcw aria-hidden="true" />} label="Reset" onClick={reset} />
          <DemoButton
            icon={showLabels ? <Eye aria-hidden="true" /> : <EyeOff aria-hidden="true" />}
            label={showLabels ? "Labels on" : "Labels off"}
            onClick={() => setShowLabels((value) => !value)}
            active={showLabels}
          />
        </div>
      </div>
      <div className="demo-control-row">
        <label className="demo-slider">
          <SlidersHorizontal aria-hidden="true" />
          <span>Model complexity</span>
          <input type="range" min="1" max="5" value={complexity} onChange={(event) => setComplexity(Number(event.target.value))} />
          <strong>{complexity}</strong>
        </label>
      </div>
      <div className="demo-metrics">
        <MetricChip label="Epoch" value={phase === "raw" || phase === "split" ? "not trained" : `${epoch}/${MAX_SUPERVISED_EPOCH}`} />
        <MetricChip label="Training loss" value={phase === "raw" || phase === "split" ? "waiting" : `${formatNumber(trainLoss, 1)} trips`} />
        <MetricChip label="Test loss" value={phase === "trained" ? `${formatNumber(testLoss, 1)} trips` : "held out"} />
        <MetricChip label="Test examples" value={formatNumber(testPoints.length)} />
        <MetricChip label="Test decisions" value={phase === "trained" ? `${correctCount}/${testPoints.length}` : "hidden"} />
      </div>
      <LearningTimeline current={epoch} max={MAX_SUPERVISED_EPOCH} active={phase === "training" || phase === "trained"} label="training epochs" />
      <SupervisedChart data={data} phase={phase} epoch={epoch} progress={trainingProgress} complexity={complexity} showLabels={showLabels} focusId={focusPoint?.id || ""} />
      <DemoExplainer text={explanation} />
    </>
  );
}

function SupervisedChart({
  data,
  phase,
  epoch,
  progress,
  complexity,
  showLabels,
  focusId
}: {
  data: ReturnType<typeof generateSupervisedDemandData>;
  phase: DemoPhase;
  epoch: number;
  progress: number;
  complexity: number;
  showLabels: boolean;
  focusId: string;
}) {
  const width = 680;
  const height = 360;
  const pad = { left: 52, right: 24, top: 24, bottom: 48 };
  const innerWidth = width - pad.left - pad.right;
  const innerHeight = height - pad.top - pad.bottom;
  const xScale = (hour: number) => pad.left + (hour / 47) * innerWidth;
  const yScale = (demand: number) => pad.top + ((104 - demand) / 84) * innerHeight;
  const curve = Array.from({ length: 96 }, (_, index) => {
    const hour = (index / 95) * 47;
    const temperature = 10 + 8 * Math.sin((((hour % 24) - 6) / 24) * Math.PI * 2) + (hour >= 24 ? 1.8 : 0);
    return `${index === 0 ? "M" : "L"} ${xScale(hour).toFixed(1)} ${yScale(predictSupervisedDemand({ hour, temperature }, complexity, progress)).toFixed(1)}`;
  }).join(" ");
  const baselineCurve = `M ${xScale(0)} ${yScale(52)} L ${xScale(47)} ${yScale(52)}`;
  const showTrainingSignals = phase === "training" || phase === "trained";

  return (
    <div className="demo-svg-wrap">
      <svg className="demo-svg supervised-svg" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Supervised learning demand prediction chart">
        <rect x="0" y="0" width={width} height={height} rx="8" className="demo-plot-bg" />
        {[40, 60, 80, 100].map((tick) => (
          <g key={tick}>
            <line x1={pad.left} x2={width - pad.right} y1={yScale(tick)} y2={yScale(tick)} className="demo-grid-line" />
            <text x={pad.left - 12} y={yScale(tick) + 4} textAnchor="end" className="demo-axis-label">
              {tick}
            </text>
          </g>
        ))}
        {[0, 12, 24, 36, 47].map((tick) => (
          <text key={tick} x={xScale(tick)} y={height - 16} textAnchor="middle" className="demo-axis-label">
            {tick}h
          </text>
        ))}
        <line x1={pad.left} x2={width - pad.right} y1={height - pad.bottom} y2={height - pad.bottom} className="demo-axis" />
        <line x1={pad.left} x2={pad.left} y1={pad.top} y2={height - pad.bottom} className="demo-axis" />
        <rect x={xScale(34.8)} y={pad.top + 6} width={xScale(47) - xScale(34.8)} height={innerHeight - 12} rx="12" className={phase === "raw" ? "test-zone" : "test-zone visible"} />
        <text x={xScale(41)} y={pad.top + 28} textAnchor="middle" className={phase === "raw" ? "demo-faint-label" : "demo-zone-label"}>
          test examples
        </text>
        <path d={baselineCurve} className={phase === "raw" ? "baseline-line" : "baseline-line visible"} />
        <path d={curve} className={showTrainingSignals ? "prediction-line visible" : "prediction-line"} />
        {showTrainingSignals
          ? data
              .filter((point, index) => point.split === "train" && index % 4 === epoch % 4)
              .map((point) => {
                const predicted = predictSupervisedDemand(point, complexity, progress);
                return (
                  <line
                    key={`residual-${point.id}`}
                    x1={xScale(point.hour)}
                    x2={xScale(point.hour)}
                    y1={yScale(point.demand)}
                    y2={yScale(predicted)}
                    className={point.id === focusId ? "training-residual focus" : "training-residual"}
                  />
                );
              })
          : null}
        {data.map((point, index) => {
          const predictedHigh = predictSupervisedDemand(point, complexity, progress) >= SUPERVISED_THRESHOLD;
          const correct = predictedHigh === (point.label === "high demand");
          const className = [
            "supervised-point",
            point.label === "high demand" ? "high" : "normal",
            point.split,
            phase !== "raw" ? "split-visible" : "",
            showTrainingSignals && point.id === focusId ? "focus" : "",
            phase === "trained" && point.split === "test" ? (correct ? "correct" : "wrong") : ""
          ]
            .filter(Boolean)
            .join(" ");
          return (
            <g key={point.id}>
              <circle className={className} cx={xScale(point.hour)} cy={yScale(point.demand)} r={point.split === "test" && phase !== "raw" ? 6.8 : 5.2}>
                <title>{`${point.hour}:00, ${point.demand} trips, ${point.label}, ${point.split}`}</title>
              </circle>
              {showLabels && (index % 5 === 0 || (phase !== "raw" && point.split === "test")) ? (
                <text x={xScale(point.hour)} y={yScale(point.demand) - 11} textAnchor="middle" className="point-label">
                  {point.label === "high demand" ? "high" : "normal"}
                </text>
              ) : null}
            </g>
          );
        })}
        {showTrainingSignals ? (
          <g className="update-callout">
            <rect x="438" y="46" width="184" height="58" rx="8" />
            <text x="452" y="70">epoch {epoch}: compare prediction</text>
            <text x="452" y="90">loss nudges curve downward/upward</text>
          </g>
        ) : null}
      </svg>
    </div>
  );
}

function UnsupervisedDemo() {
  const data = useMemo(() => generateUnsupervisedTopicData(), []);
  const [phase, setPhase] = useState<UnsupervisedPhase>("raw");
  const [granularity, setGranularity] = useState(4);
  const [iteration, setIteration] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [featureMode, setFeatureMode] = useState<UnsupervisedFeatureMode>("abstract-keywords");
  const [revealLabels, setRevealLabels] = useState(false);
  const progress = phase === "raw" ? 0 : phase === "embedding" ? 0.68 : 1;
  const kMeansState = useMemo(() => computeKMeansState(data, featureMode, granularity, iteration), [data, featureMode, granularity, iteration]);
  const activeClusters = kMeansState.centroids.filter((centroid) => data.some((point) => kMeansState.assignments[point.id] === Number(centroid.id.replace("centroid-", "")))).length;
  const nextLabel = phase === "raw" ? "Embed records" : playing ? "Pause" : phase === "clustered" ? "Replay k-means" : "Run k-means";
  const explanation =
    phase === "raw"
      ? "The records begin without labels. The algorithm only sees similarity in their synthetic text features."
      : phase === "embedding"
        ? "Similar records move closer together. No one has named the groups yet; the structure is only geometric."
        : phase === "clustering"
          ? "Each iteration assigns points to their nearest centroid, then moves each centroid to the middle of its assigned points."
          : revealLabels
            ? "Labels are added after clustering, turning discovered groups into interpretable topic families."
            : "The clusters are stable, but the topic names remain hidden. This keeps the unsupervised step honest.";

  useEffect(() => {
    if (!playing) return;
    setPhase("clustering");
    const timer = window.setInterval(() => {
      setIteration((current) => {
        if (current >= MAX_CLUSTER_ITERATION) {
          setPlaying(false);
          setPhase("clustered");
          return current;
        }
        return current + 1;
      });
    }, 720);
    return () => window.clearInterval(timer);
  }, [playing]);

  function advancePhase() {
    if (phase === "raw") {
      setPhase("embedding");
      return;
    }
    if (playing) {
      setPlaying(false);
      return;
    }
    if (phase === "clustered") {
      setIteration(0);
    }
    setPhase("clustering");
    setPlaying(true);
  }

  function reset() {
    setPlaying(false);
    setIteration(0);
    setPhase("raw");
  }

  return (
    <>
      <div className="demo-card-head">
        <div>
          <h2>Discovering research neighborhoods</h2>
          <p>Records move into groups before their topic names are revealed.</p>
        </div>
        <div className="demo-controls">
          <DemoButton icon={playing ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />} label={nextLabel} onClick={advancePhase} active={phase !== "raw"} />
          <DemoButton icon={<RotateCcw aria-hidden="true" />} label="Reset" onClick={reset} />
          <DemoButton
            icon={revealLabels ? <Eye aria-hidden="true" /> : <EyeOff aria-hidden="true" />}
            label={revealLabels ? "Labels on" : "Labels off"}
            onClick={() => setRevealLabels((value) => !value)}
            active={revealLabels}
          />
        </div>
      </div>
      <div className="demo-control-row">
        <label className="demo-slider">
          <SlidersHorizontal aria-hidden="true" />
          <span>Granularity</span>
          <input type="range" min="2" max="6" value={granularity} onChange={(event) => setGranularity(Number(event.target.value))} />
          <strong>{granularity}</strong>
        </label>
        <label className="demo-select">
          <span>Feature mode</span>
          <select value={featureMode} onChange={(event) => setFeatureMode(event.target.value as UnsupervisedFeatureMode)}>
            <option value="abstract">Abstract only</option>
            <option value="abstract-keywords">Abstract + keywords</option>
          </select>
        </label>
      </div>
      <div className="demo-metrics">
        <MetricChip label="Records" value={formatNumber(data.length)} />
        <MetricChip label="k centroids" value={formatNumber(granularity)} />
        <MetricChip label="Iteration" value={phase === "raw" || phase === "embedding" ? "not started" : `${iteration}/${MAX_CLUSTER_ITERATION}`} />
        <MetricChip label="Centroid movement" value={phase === "clustering" || phase === "clustered" ? `${formatNumber(kMeansState.movement, 1)} px` : "waiting"} />
        <MetricChip label="Within-cluster distance" value={phase === "clustering" || phase === "clustered" ? formatNumber(kMeansState.inertia, 0) : "waiting"} />
        <MetricChip label="Active groups" value={formatNumber(activeClusters)} />
        <MetricChip label="Labels used" value={phase === "clustered" && revealLabels ? "afterward" : "none"} />
      </div>
      <LearningTimeline current={iteration} max={MAX_CLUSTER_ITERATION} active={phase === "clustering" || phase === "clustered"} label="k-means iterations" />
      <UnsupervisedMap data={data} phase={phase} progress={progress} featureMode={featureMode} revealLabels={revealLabels} kMeansState={kMeansState} />
      <DemoExplainer text={explanation} />
    </>
  );
}

function UnsupervisedMap({
  data,
  phase,
  progress,
  featureMode,
  revealLabels,
  kMeansState
}: {
  data: ReturnType<typeof generateUnsupervisedTopicData>;
  phase: UnsupervisedPhase;
  progress: number;
  featureMode: UnsupervisedFeatureMode;
  revealLabels: boolean;
  kMeansState: ReturnType<typeof computeKMeansState>;
}) {
  const showAssignments = phase === "clustering" || phase === "clustered";
  const showCentroids = phase !== "raw";

  return (
    <div className="demo-svg-wrap">
      <svg className="demo-svg unsupervised-svg" viewBox="0 0 640 390" role="img" aria-label="Unsupervised learning cluster animation">
        <rect x="0" y="0" width="640" height="390" rx="8" className="demo-plot-bg" />
        {kMeansState.centroids.map((cluster, index) => {
          const color = CLUSTER_COLORS[index % CLUSTER_COLORS.length];
          return (
          <g key={cluster.id} className={phase === "clustered" ? "cluster-halo visible" : "cluster-halo"} style={{ color }}>
            <ellipse cx={cluster.x} cy={cluster.y} rx="86" ry="56" />
            {revealLabels ? (
              <text x={cluster.x} y={cluster.y - 68} textAnchor="middle">
                {cluster.label}
              </text>
            ) : null}
          </g>
          );
        })}
        <line x1="320" x2="320" y1="40" y2="350" className="demo-grid-line" />
        <line x1="70" x2="570" y1="195" y2="195" className="demo-grid-line" />
        {showAssignments
          ? data.map((point) => {
              const position = getUnsupervisedPosition(point, featureMode, progress);
              const centroid = kMeansState.centroids[kMeansState.assignments[point.id]];
              if (!centroid) return null;
              return <line key={`assign-${point.id}`} x1={position.x} y1={position.y} x2={centroid.x} y2={centroid.y} className="assignment-line" />;
            })
          : null}
        {data.map((point) => {
          const position = getUnsupervisedPosition(point, featureMode, progress);
          const clusterIndex = kMeansState.assignments[point.id] || 0;
          const color = showAssignments ? CLUSTER_COLORS[clusterIndex % CLUSTER_COLORS.length] : "#5c5c5c";
          const label = kMeansState.centroids[clusterIndex]?.label || "unassigned";
          return (
            <circle key={point.id} className={phase === "raw" ? "topic-point raw" : "topic-point"} cx={position.x} cy={position.y} r={showAssignments ? 6.8 : 5.6} style={{ color }}>
              <title>{`${point.title} / ${revealLabels ? label : "unlabeled"}`}</title>
            </circle>
          );
        })}
        {showCentroids
          ? kMeansState.centroids.map((centroid, index) => {
              const color = CLUSTER_COLORS[index % CLUSTER_COLORS.length];
              return (
                <g key={`centroid-${centroid.id}`} className="centroid-marker" style={{ color }}>
                  <line x1={centroid.previousX} y1={centroid.previousY} x2={centroid.x} y2={centroid.y} />
                  <circle cx={centroid.previousX} cy={centroid.previousY} r="5" className="previous" />
                  <path d={`M ${centroid.x - 10} ${centroid.y} L ${centroid.x + 10} ${centroid.y} M ${centroid.x} ${centroid.y - 10} L ${centroid.x} ${centroid.y + 10}`} />
                  <circle cx={centroid.x} cy={centroid.y} r="12" />
                  <text x={centroid.x} y={centroid.y + 28} textAnchor="middle">
                    C{index + 1}
                  </text>
                </g>
              );
            })
          : null}
        {showAssignments ? (
          <g className="update-callout">
            <rect x="382" y="42" width="214" height="58" rx="8" />
            <text x="396" y="66">assign points {">"} move centroid</text>
            <text x="396" y="86">repeat until movement is small</text>
          </g>
        ) : null}
        <text x="34" y="364" className="demo-axis-label">
          similarity space
        </text>
      </svg>
    </div>
  );
}

function DeepLearningDemo() {
  const examples = useMemo(() => generateRawSignalExamples(), []);
  const [epoch, setEpoch] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [selectedId, setSelectedId] = useState(examples[0]?.id || "");
  const state = useMemo(() => computeDeepLearningState(epoch), [epoch]);
  const selected = examples.find((example) => example.id === selectedId) || examples[0];
  const progress = epoch / MAX_DEEP_EPOCH;
  const explanation =
    epoch === 0
      ? "The model starts with raw sequences and weak internal features. Similar patterns are still mixed together."
      : epoch < MAX_DEEP_EPOCH
        ? "Training changes layer activations. Early layers respond to local peaks, deeper layers combine them into motifs, and the embedding begins to separate."
        : "The learned embedding now groups raw signals by pattern. The important difference is that the useful features were learned inside the layers.";

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      setEpoch((current) => {
        if (current >= MAX_DEEP_EPOCH) {
          setPlaying(false);
          return current;
        }
        return current + 1;
      });
    }, 680);
    return () => window.clearInterval(timer);
  }, [playing]);

  function reset() {
    setPlaying(false);
    setEpoch(0);
  }

  return (
    <>
      <div className="demo-card-head">
        <div>
          <h2>Learning representations from raw signals</h2>
          <p>Instead of hand-built columns, layers discover peaks, motifs, and similarity structure.</p>
        </div>
        <div className="demo-controls">
          <DemoButton icon={playing ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />} label={playing ? "Pause" : "Train layers"} onClick={() => setPlaying((value) => !value)} active={playing || epoch > 0} />
          <DemoButton icon={<RotateCcw aria-hidden="true" />} label="Reset" onClick={reset} />
        </div>
      </div>
      <div className="demo-control-row">
        <label className="demo-select">
          <span>Inspect signal</span>
          <select value={selected.id} onChange={(event) => setSelectedId(event.target.value)}>
            {examples.slice(0, 8).map((example) => (
              <option key={example.id} value={example.id}>
                {example.label} {example.id.replace("signal-", "#")}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="demo-metrics">
        <MetricChip label="Epoch" value={`${epoch}/${MAX_DEEP_EPOCH}`} />
        <MetricChip label="Input type" value="raw signal" />
        <MetricChip label="Loss" value={epoch ? formatNumber(state.loss, 2) : "untrained"} />
        <MetricChip label="Pattern accuracy" value={`${Math.round(state.accuracy * 100)}%`} />
        <MetricChip label="Feature source" value="learned layers" />
      </div>
      <LearningTimeline current={epoch} max={MAX_DEEP_EPOCH} active={epoch > 0 || playing} label="representation updates" />
      <DeepLearningSvg examples={examples} selected={selected} state={state} progress={progress} />
      <DemoExplainer text={explanation} />
    </>
  );
}

function DeepLearningSvg({
  examples,
  selected,
  state,
  progress
}: {
  examples: ReturnType<typeof generateRawSignalExamples>;
  selected: ReturnType<typeof generateRawSignalExamples>[number];
  state: ReturnType<typeof computeDeepLearningState>;
  progress: number;
}) {
  const labelColor: Record<string, string> = {
    "commute peak": "#00a6d6",
    "event surge": "#28a745",
    "quiet baseline": "#ffc107",
    disruption: "#dc3545"
  };
  const xSignal = (index: number) => 42 + (index / (selected.signal.length - 1)) * 194;
  const ySignal = (value: number) => 204 - ((value - 20) / 95) * 126;
  const signalPath = selected.signal.map((value, index) => `${index === 0 ? "M" : "L"} ${xSignal(index).toFixed(1)} ${ySignal(value).toFixed(1)}`).join(" ");

  return (
    <div className="demo-svg-wrap">
      <svg className="demo-svg deep-learning-svg" viewBox="0 0 760 430" role="img" aria-label="Deep learning representation learning animation">
        <rect x="0" y="0" width="760" height="430" rx="8" className="demo-plot-bg" />
        <g className="pipeline-labels">
          <text x="42" y="38">raw demand signal</text>
          <text x="292" y="38">learned layers</text>
          <text x="560" y="38">embedding space</text>
        </g>
        <g className="raw-signal-panel" transform="translate(30 62)">
          <rect width="226" height="172" rx="8" />
          <path d={signalPath} />
          {selected.signal.map((value, index) => (
            index % 3 === 0 ? <circle key={index} cx={xSignal(index) - 30} cy={ySignal(value) - 62} r="3.5" /> : null
          ))}
          <text x="14" y="150">{selected.label}</text>
        </g>
        <path className="pipeline-arrow" d="M 264 148 C 284 148 284 148 302 148" />
        <g className="deep-layer-stack" transform="translate(308 62)">
          {state.layerActivations.map((layer, layerIndex) => (
            <g key={layer.layer} transform={`translate(${layerIndex * 82} 0)`}>
              <rect width="66" height="172" rx="8" />
              <text x="33" y="22" textAnchor="middle">{layer.layer}</text>
              {layer.values.map((value, valueIndex) => (
                <rect key={valueIndex} x={14 + valueIndex * 14} y={142 - value * 88} width="10" height={value * 88} rx="5" />
              ))}
              <text x="33" y="154" textAnchor="middle">{layer.explanation}</text>
            </g>
          ))}
        </g>
        <path className="pipeline-arrow" d="M 552 148 C 572 148 572 148 590 148" />
        <g className="embedding-panel" transform="translate(592 62)">
          <rect width="132" height="172" rx="8" />
          <line x1="14" x2="118" y1="86" y2="86" className="demo-grid-line" />
          <line x1="66" x2="66" y1="16" y2="156" className="demo-grid-line" />
          {examples.map((example) => {
            const x = (example.rawX * (1 - progress) + example.learnedX * progress - 100) * 0.22;
            const y = (example.rawY * (1 - progress) + example.learnedY * progress - 70) * 0.36;
            return (
              <circle key={example.id} cx={x} cy={y} r={example.id === selected.id ? 6 : 4.5} style={{ color: labelColor[example.label] }} className={example.id === selected.id ? "embedding-point selected" : "embedding-point"}>
                <title>{example.label}</title>
              </circle>
            );
          })}
        </g>
        <g className="deep-comparison" transform="translate(42 280)">
          <rect width="676" height="88" rx="8" />
          <text x="18" y="28">Classical feature-based ML asks: which columns should humans prepare?</text>
          <text x="18" y="54">Deep learning asks: can layers learn useful internal features directly from raw signals?</text>
          <text x="18" y="76">As epochs advance, the embedding separates because representation learning improves.</text>
        </g>
      </svg>
    </div>
  );
}

function ReinforcementDemo() {
  const [episode, setEpisode] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [exploration, setExploration] = useState(34);
  const [objective, setObjective] = useState<RewardObjective>("wait");
  const state = simulateReinforcementEpisode(episode, exploration, objective);
  const history = Array.from({ length: episode + 1 }, (_, index) => simulateReinforcementEpisode(index, exploration, objective));
  const chosenLabel = state.action === "north-south" ? "N-S green" : "E-W green";
  const qBefore = state.action === "north-south" ? state.previousQNorthSouth : state.previousQEastWest;
  const qAfter = state.action === "north-south" ? state.qNorthSouth : state.qEastWest;
  const explanation =
    episode === 0
      ? "The first policy is uncertain. Watch the loop: observe queues, choose a light, get a reward, then update the chosen action value."
      : episode < 6
        ? `The reward creates a target value. ${chosenLabel} moves from ${formatNumber(qBefore, 1)} toward ${formatNumber(state.targetValue, 1)}, ending at ${formatNumber(qAfter, 1)}.`
        : "The policy is now more confident because repeated reward updates have changed which light action looks valuable in this queue state.";

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      setEpisode((current) => {
        if (current >= 12) {
          setPlaying(false);
          return current;
        }
        return current + 1;
      });
    }, 720);
    return () => window.clearInterval(timer);
  }, [playing]);

  return (
    <>
      <div className="demo-card-head">
        <div>
          <h2>Learning a traffic-light policy</h2>
          <p>Actions are judged by queue and delay consequences across repeated episodes.</p>
        </div>
        <div className="demo-controls">
          <DemoButton icon={playing ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />} label={playing ? "Pause" : "Run episodes"} onClick={() => setPlaying((value) => !value)} active={playing} />
          <DemoButton icon={<Play aria-hidden="true" />} label="Next episode" onClick={() => setEpisode((current) => Math.min(12, current + 1))} />
          <DemoButton
            icon={<RotateCcw aria-hidden="true" />}
            label="Reset policy"
            onClick={() => {
              setPlaying(false);
              setEpisode(0);
            }}
          />
        </div>
      </div>
      <div className="demo-control-row">
        <label className="demo-select">
          <span>Reward objective</span>
          <select value={objective} onChange={(event) => setObjective(event.target.value as RewardObjective)}>
            <option value="wait">Minimize wait</option>
            <option value="emissions">Reduce emissions</option>
            <option value="balance">Balance queues</option>
          </select>
        </label>
        <label className="demo-slider">
          <SlidersHorizontal aria-hidden="true" />
          <span>Exploration</span>
          <input type="range" min="5" max="70" value={exploration} onChange={(event) => setExploration(Number(event.target.value))} />
          <strong>{exploration}%</strong>
        </label>
      </div>
      <div className="demo-metrics">
        <MetricChip label="Episode" value={`${episode}/12`} />
        <MetricChip label="Observed state" value={state.stateLabel} />
        <MetricChip label="Chosen action" value={chosenLabel} />
        <MetricChip label="Reward" value={formatNumber(state.reward)} />
        <MetricChip label="TD error" value={formatSigned(state.temporalDifference, 1)} />
        <MetricChip label="Average wait" value={`${formatNumber(state.averageWait, 1)} s`} />
        <MetricChip label="Policy confidence" value={`${Math.round(state.policyConfidence * 100)}%`} />
      </div>
      <ReinforcementScene state={state} history={history} />
      <DemoExplainer text={explanation} />
    </>
  );
}

function ReinforcementScene({ state, history }: { state: ReturnType<typeof simulateReinforcementEpisode>; history: Array<ReturnType<typeof simulateReinforcementEpisode>> }) {
  const nsGreen = state.action === "north-south";
  const northCars = Math.min(9, Math.ceil(state.northQueue / 5));
  const eastCars = Math.min(9, Math.ceil(state.eastQueue / 5));
  const chosenBefore = state.action === "north-south" ? state.previousQNorthSouth : state.previousQEastWest;
  const chosenAfter = state.action === "north-south" ? state.qNorthSouth : state.qEastWest;
  const qWidth = (value: number) => Math.max(5, Math.min(148, ((value + 35) / 60) * 148));

  return (
    <div className="demo-svg-wrap">
      <svg className="demo-svg reinforcement-svg" viewBox="0 0 760 440" role="img" aria-label="Reinforcement learning traffic signal animation">
        <rect x="0" y="0" width="760" height="440" rx="8" className="demo-plot-bg" />
        <g className="rl-loop">
          <g transform="translate(36 28)">
            <rect width="142" height="72" rx="8" />
            <text x="16" y="28">1. observe state</text>
            <text x="16" y="50">{state.stateLabel}</text>
          </g>
          <path d="M 182 64 L 228 64" />
          <g transform="translate(232 28)">
            <rect width="142" height="72" rx="8" />
            <text x="16" y="28">2. choose action</text>
            <text x="16" y="50">{state.action === "north-south" ? "give N-S green" : "give E-W green"}</text>
          </g>
          <path d="M 378 64 L 424 64" />
          <g transform="translate(428 28)">
            <rect width="142" height="72" rx="8" />
            <text x="16" y="28">3. get reward</text>
            <text x="16" y="50">{formatSigned(state.reward)}</text>
          </g>
          <path d="M 574 64 L 620 64" />
          <g transform="translate(624 28)">
            <rect width="100" height="72" rx="8" />
            <text x="14" y="28">4. update</text>
            <text x="14" y="50">Q + {formatSigned(state.temporalDifference, 1)}</text>
          </g>
        </g>

        <rect x="88" y="132" width="88" height="238" rx="10" className="road" />
        <rect x="24" y="204" width="226" height="86" rx="10" className="road" />
        <rect x="96" y="212" width="72" height="70" rx="8" className="intersection-core" />
        <line x1="132" x2="132" y1="146" y2="354" className="lane-line" />
        <line x1="38" x2="236" y1="247" y2="247" className="lane-line" />
        {Array.from({ length: northCars }, (_, index) => (
          <rect key={`n-${index}`} x={106 + (index % 2) * 28} y={150 + index * 18} width="20" height="11" rx="4" className={nsGreen ? "traffic-car moving" : "traffic-car"} />
        ))}
        {Array.from({ length: eastCars }, (_, index) => (
          <rect key={`e-${index}`} x={38 + index * 22} y={254 + (index % 2) * 20} width="21" height="12" rx="4" className={nsGreen ? "traffic-car" : "traffic-car moving"} />
        ))}
        <g className="traffic-light" transform="translate(196 156)">
          <rect x="0" y="0" width="42" height="78" rx="12" />
          <circle cx="21" cy="23" r="9" className={nsGreen ? "light-on" : "light-off"} />
          <circle cx="21" cy="55" r="9" className={nsGreen ? "light-off" : "light-on"} />
        </g>
        <g className="queue-bars">
          <text x="278" y="146">environment response</text>
          <rect x="278" y="164" width="26" height={state.northQueue * 3.3} rx="6" transform={`translate(0 ${150 - state.northQueue * 3.3})`} />
          <rect x="314" y="164" width="26" height={state.eastQueue * 3.3} rx="6" transform={`translate(0 ${150 - state.eastQueue * 3.3})`} className="secondary" />
          <text x="291" y="324" textAnchor="middle">N-S</text>
          <text x="327" y="324" textAnchor="middle">E-W</text>
          <text x="278" y="350">{state.rewardBreakdown}</text>
        </g>
        <g className="q-update-panel">
          <text x="402" y="148">policy update from this episode</text>
          <text x="402" y="176">chosen Q before</text>
          <rect x="532" y="162" width="148" height="18" rx="9" className="q-track" />
          <rect x="532" y="162" width={qWidth(chosenBefore)} height="18" rx="9" className="q-before chosen" />
          <text x="690" y="176" className="q-number">{formatNumber(chosenBefore, 1)}</text>
          <text x="402" y="208">target = reward + future</text>
          <rect x="532" y="194" width="148" height="18" rx="9" className="q-track" />
          <rect x="532" y="194" width={qWidth(state.targetValue)} height="18" rx="9" className="q-target" />
          <text x="690" y="208" className="q-number">{formatNumber(state.targetValue, 1)}</text>
          <text x="402" y="240">chosen Q after</text>
          <rect x="532" y="226" width="148" height="18" rx="9" className="q-track" />
          <rect x="532" y="226" width={qWidth(chosenAfter)} height="18" rx="9" className="q-after chosen" />
          <text x="690" y="240" className="q-number">{formatNumber(chosenAfter, 1)}</text>
          <text x="402" y="280">current policy values</text>
          <text x="402" y="306">N-S</text>
          <rect x="452" y="292" width="148" height="16" rx="8" className="q-track" />
          <rect x="452" y="292" width={qWidth(state.qNorthSouth)} height="16" rx="8" className={state.action === "north-south" ? "q-after chosen" : "q-after"} />
          <text x="402" y="332">E-W</text>
          <rect x="452" y="318" width="148" height="16" rx="8" className="q-track" />
          <rect x="452" y="318" width={qWidth(state.qEastWest)} height="16" rx="8" className={state.action === "east-west" ? "q-after chosen" : "q-after"} />
          <text x="610" y="306" className="q-number">
            {formatNumber(state.qNorthSouth, 1)}
          </text>
          <text x="610" y="332" className="q-number">
            {formatNumber(state.qEastWest, 1)}
          </text>
        </g>
        <g className="reward-history">
          <text x="70" y="396">reward history</text>
          {history.map((entry, index) => (
            <rect key={entry.episode} x={70 + index * 18} y={424 - (entry.reward + 45) * 1.35} width="12" height={(entry.reward + 45) * 1.35} rx="3" />
          ))}
          <line x1="70" x2="304" y1="424" y2="424" className="demo-axis" />
          <line x1="70" x2="304" y1={424 - (state.fixedTimerReward + 45) * 1.35} y2={424 - (state.fixedTimerReward + 45) * 1.35} className="fixed-timer-line" />
        </g>
        <g className="policy-meter">
          <text x="402" y="396">policy confidence</text>
          <rect x="402" y="410" width="170" height="18" rx="9" />
          <rect x="402" y="410" width={170 * state.policyConfidence} height="18" rx="9" className="policy-fill" />
        </g>
      </svg>
    </div>
  );
}

function DemoExplainer({ text }: { text: string }) {
  return (
    <section className="demo-explainer" aria-label="What changed">
      <h3>What changed?</h3>
      <p>{text}</p>
    </section>
  );
}
