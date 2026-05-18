import { ArrowUpDown, BookOpen, BrainCircuit, CalendarDays, Database, ExternalLink, FileText, Filter, RefreshCw, Search, Tag, X } from "lucide-react";
import { useEffect, useMemo, useState, type KeyboardEvent } from "react";
import taxonomy from "../data/taxonomy.json";
import vennScene from "./data/venn-layout.json";
import { applyFilters, uniqueValues } from "./lib/search";
import type { ExplorerFilters, ThesisDataset, ThesisRecord } from "./types";

const EMPTY_FILTERS: ExplorerFilters = {
  query: "",
  objectType: "",
  year: "",
  programme: "",
  methodNode: "",
  domainNode: "",
  contributor: "",
  availability: "all",
  includeArticles: false,
  sort: "relevance"
};

type VennElement = {
  id: string;
  type: "ellipse" | "rectangle" | "text" | "image";
  x: number;
  y: number;
  width: number;
  height: number;
  angle?: number;
  strokeColor?: string;
  backgroundColor?: string;
  strokeWidth?: number;
  strokeStyle?: string;
  opacity?: number;
  roundness?: { type: number } | null;
  text?: string;
  fontSize?: number;
  fontFamily?: number;
  textAlign?: string;
  lineHeight?: number;
  fileId?: string;
  crop?: {
    x: number;
    y: number;
    width: number;
    height: number;
    naturalWidth: number;
    naturalHeight: number;
  } | null;
};

type VennScene = {
  elements: VennElement[];
  files?: Record<string, { fileName: string; mimeType: string }>;
};

type Hotspot = {
  id: string;
  label: string;
  elementId: string;
  kind: "method" | "domain";
  countX: number;
  countY: number;
  target?: {
    type: "ellipse" | "rectangle";
    x: number;
    y: number;
    width: number;
    height: number;
    rx?: number;
  };
};

const EXCALIDRAW_SCENE = vennScene as VennScene;
const VENN_ELEMENTS = EXCALIDRAW_SCENE.elements.filter((element) => !("isDeleted" in element) || !(element as VennElement & { isDeleted?: boolean }).isDeleted);
const VENN_ELEMENT_BY_ID = new Map(VENN_ELEMENTS.map((element) => [element.id, element]));
const VENN_BOUNDS = VENN_ELEMENTS.reduce(
  (bounds, element) => ({
    minX: Math.min(bounds.minX, element.x),
    minY: Math.min(bounds.minY, element.y),
    maxX: Math.max(bounds.maxX, element.x + element.width),
    maxY: Math.max(bounds.maxY, element.y + element.height)
  }),
  { minX: Number.POSITIVE_INFINITY, minY: Number.POSITIVE_INFINITY, maxX: Number.NEGATIVE_INFINITY, maxY: Number.NEGATIVE_INFINITY }
);
const VENN_PADDING = 28;

const TAXONOMY_HOTSPOTS: Hotspot[] = [
  {
    id: "Machine Learning",
    label: "Machine Learning",
    elementId: "Bps2xFq2",
    kind: "method",
    countX: 1248,
    countY: 262,
    target: { type: "rectangle", x: 760, y: 72, width: 540, height: 210, rx: 28 }
  },
  {
    id: "Deep Learning",
    label: "Deep Learning",
    elementId: "B0qF6tFv",
    kind: "method",
    countX: 1215,
    countY: 392,
    target: { type: "ellipse", x: 790, y: 282, width: 470, height: 155 }
  },
  { id: "Supervised learning", label: "Supervised learning", elementId: "JwKZ0Y4c", kind: "method", countX: 660, countY: 676 },
  { id: "Unsupervised learning", label: "Unsupervised learning", elementId: "nK5nq2Gx", kind: "method", countX: 1465, countY: 665 },
  { id: "Reinforcement learning", label: "Reinforcement learning", elementId: "lC-CPT4IQRzaFJfEXhK2w", kind: "method", countX: 1190, countY: 914 },
  { id: "Foundation Models", label: "Foundation models", elementId: "c0KcL4bF", kind: "method", countX: 1208, countY: 514 },
  { id: "Generative AI", label: "Generative AI", elementId: "tHk80p6p", kind: "method", countX: 1154, countY: 644 },
  { id: "TLO", label: "Transport & Logistics", elementId: "ZYfmmRO5", kind: "domain", countX: 640, countY: 282 },
  { id: "ICT", label: "ICT", elementId: "tF3bGfV9", kind: "domain", countX: 1812, countY: 272 },
  { id: "E&I", label: "Energy & Industry", elementId: "m4TfE2X5", kind: "domain", countX: 670, countY: 954 },
  { id: "SDM", label: "System Decision Methods", elementId: "2H9TQJtB", kind: "domain", countX: 1885, countY: 954 }
];

function formatDate(value: string): string {
  if (!value) return "Unknown refresh";
  try {
    return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
  } catch {
    return value;
  }
}

function formatCount(value: number): string {
  return new Intl.NumberFormat("en").format(value);
}

function formatList(values: string[]): string {
  if (values.length <= 1) return values[0] || "";
  if (values.length === 2) return values.join(" and ");
  return `${values.slice(0, -1).join(", ")}, and ${values.at(-1)}`;
}

function App() {
  const [dataset, setDataset] = useState<ThesisDataset | null>(null);
  const [loadError, setLoadError] = useState("");
  const [filters, setFilters] = useState<ExplorerFilters>(EMPTY_FILTERS);
  const [selectedId, setSelectedId] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch(`${import.meta.env.BASE_URL}data/theses.json`)
      .then((response) => {
        if (!response.ok) throw new Error(`Could not load thesis data (${response.status})`);
        return response.json();
      })
      .then((data: ThesisDataset) => {
        if (!cancelled) {
          setDataset(data);
          setSelectedId(data.records[0]?.id || "");
        }
      })
      .catch((error: Error) => {
        if (!cancelled) setLoadError(error.message);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const records = dataset?.records || [];
  const recordsInScope = useMemo(() => records.filter((record) => filters.includeArticles || record.recordCategory !== "article"), [records, filters.includeArticles]);
  const filteredRecords = useMemo(() => applyFilters(records, filters), [records, filters]);
  const recordsForTaxonomyCounts = useMemo(() => applyFilters(records, { ...filters, methodNode: "", domainNode: "" }), [records, filters]);
  const selectedRecord = filteredRecords.find((record) => record.id === selectedId) || filteredRecords[0] || recordsInScope[0] || records[0];
  const objectTypes = useMemo(() => uniqueValues(recordsInScope, (record) => record.objectType), [recordsInScope]);
  const years = useMemo(() => uniqueValues(recordsInScope, (record) => record.year).sort((a, b) => b.localeCompare(a)), [recordsInScope]);
  const programmes = useMemo(() => uniqueValues(recordsInScope, (record) => record.programme), [recordsInScope]);
  const methods = useMemo(() => uniqueValues(recordsInScope, (record) => record.methodTags), [recordsInScope]);

  function updateFilter<K extends keyof ExplorerFilters>(key: K, value: ExplorerFilters[K]) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function toggleTaxonomyNode(key: "methodNode" | "domainNode", label: string) {
    setFilters((current) => ({ ...current, [key]: current[key] === label ? "" : label }));
  }

  const activeFilterCount = Object.entries(filters).filter(([key, value]) => key !== "sort" && value && value !== "all").length;

  if (loadError) {
    return (
      <main className="app-shell">
        <section className="empty-state">
          <Database aria-hidden="true" />
          <h1>Thesis data could not be loaded</h1>
          <p>{loadError}</p>
        </section>
      </main>
    );
  }

  if (!dataset) {
    return (
      <main className="app-shell">
        <section className="empty-state">
          <RefreshCw aria-hidden="true" className="spin" />
          <h1>Loading thesis explorer</h1>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <header className="top-band">
        <div className="top-content">
          <div className="brand-lockup">
            <span className="logo-icon" aria-hidden="true">
              ML
            </span>
            <div>
              <p className="eyebrow">TU Delft TBM</p>
              <h1>Machine Learning Thesis Explorer</h1>
            </div>
          </div>
          <div className="source-pill" title={dataset.source.note}>
            <Database aria-hidden="true" />
            <span>{formatDate(dataset.generatedAt)}</span>
          </div>
        </div>
      </header>

      <section className="stats-band" aria-label="Dataset summary">
        <Metric icon={<BookOpen aria-hidden="true" />} label={filters.includeArticles ? "ML records" : "ML theses"} value={formatCount(recordsInScope.length)} />
        <Metric icon={<Database aria-hidden="true" />} label="Records checked" value={formatCount(dataset.stats.totalHarvested)} />
        <Metric icon={<Tag aria-hidden="true" />} label="Methods" value={formatCount(methods.length)} />
        <Metric icon={<CalendarDays aria-hidden="true" />} label="Years" value={formatCount(years.length)} />
      </section>

      <HarvestStatus dataset={dataset} />

      <section className="control-band" aria-label="Search and filters">
        <div className="search-row">
          <label className="search-box">
            <Search aria-hidden="true" />
            <span className="sr-only">Search theses</span>
            <input value={filters.query} onChange={(event) => updateFilter("query", event.target.value)} placeholder="Search title, abstract, tags, people" />
          </label>
          <label className="compact-control">
            <ArrowUpDown aria-hidden="true" />
            <span className="sr-only">Sort</span>
            <select value={filters.sort} onChange={(event) => updateFilter("sort", event.target.value as ExplorerFilters["sort"])}>
              <option value="relevance">Relevance</option>
              <option value="year-desc">Newest</option>
              <option value="year-asc">Oldest</option>
              <option value="title">Title</option>
            </select>
          </label>
          <button className="icon-button" type="button" onClick={() => setFilters(EMPTY_FILTERS)} title="Clear filters">
            <X aria-hidden="true" />
            <span className="sr-only">Clear filters</span>
          </button>
        </div>

        <div className="filter-grid">
          <SelectFilter icon={<Filter aria-hidden="true" />} label="Type" value={filters.objectType} options={objectTypes} onChange={(value) => updateFilter("objectType", value)} />
          <SelectFilter icon={<CalendarDays aria-hidden="true" />} label="Year" value={filters.year} options={years} onChange={(value) => updateFilter("year", value)} />
          <SelectFilter icon={<BookOpen aria-hidden="true" />} label="Programme" value={filters.programme} options={programmes} onChange={(value) => updateFilter("programme", value)} />
          <label className="field-control">
            <Search aria-hidden="true" />
            <span className="sr-only">Author or contributor</span>
            <input value={filters.contributor} onChange={(event) => updateFilter("contributor", event.target.value)} placeholder="Author or contributor" />
          </label>
          <label className="toggle-control">
            <input
              type="checkbox"
              checked={filters.availability === "public"}
              onChange={(event) => updateFilter("availability", event.target.checked ? "public" : "all")}
            />
            <FileText aria-hidden="true" />
            <span>Public file</span>
          </label>
          <label className="toggle-control">
            <input type="checkbox" checked={filters.includeArticles} onChange={(event) => updateFilter("includeArticles", event.target.checked)} />
            <BookOpen aria-hidden="true" />
            <span>Articles</span>
          </label>
        </div>
      </section>

      <TaxonomyMap
        records={recordsForTaxonomyCounts}
        activeMethod={filters.methodNode}
        activeDomain={filters.domainNode}
        onMethodSelect={(label) => toggleTaxonomyNode("methodNode", label)}
        onDomainSelect={(label) => toggleTaxonomyNode("domainNode", label)}
      />

      <section className="results-shell">
        <div className="results-column">
          <div className="results-head">
            <h2>
              {formatCount(filteredRecords.length)} matching {filters.includeArticles ? "records" : "theses"}
            </h2>
            {activeFilterCount > 0 ? <span>{activeFilterCount} active filters</span> : <span>Full ML catalogue</span>}
          </div>
          <div className="result-list">
            {filteredRecords.length ? (
              filteredRecords.map((record) => <ThesisListItem key={record.id} record={record} active={record.id === selectedRecord?.id} onSelect={() => setSelectedId(record.id)} />)
            ) : (
              <div className="empty-result">
                <Search aria-hidden="true" />
                <p>No theses match the current filters.</p>
              </div>
            )}
          </div>
        </div>

        <aside className="detail-panel" aria-label="Selected thesis">
          {selectedRecord ? <ThesisDetail record={selectedRecord} /> : null}
        </aside>
      </section>

      <footer className="site-footer-lite">
        <div className="footer-inner">
          <div>
            <h2>TBM Machine Learning Thesis Explorer</h2>
            <p>Generated from public TU Delft Repository metadata. Thesis files are linked, not mirrored.</p>
          </div>
          <a href="https://repository.tudelft.nl/" target="_blank" rel="noreferrer">
            <ExternalLink aria-hidden="true" />
            TU Delft Repository
          </a>
        </div>
      </footer>
    </main>
  );
}

function Metric({ icon, label, value }: { icon: JSX.Element; label: string; value: string }) {
  return (
    <div className="metric">
      {icon}
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

function SelectFilter({ icon, label, value, options, onChange }: { icon: JSX.Element; label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <label className="field-control">
      {icon}
      <span className="sr-only">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">{label}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function HarvestStatus({ dataset }: { dataset: ThesisDataset }) {
  const harvest = dataset.harvest;
  const indexLabel = harvest?.indexComplete ? "Index harvest complete" : "Index harvest status unknown";
  const articleText = harvest?.includeArticles ? " Thesis records are shown by default; journal articles and conference papers are available via the Articles toggle." : "";
  const essText = harvest?.essStaff?.staffFound
    ? ` ESS staff matching used ${formatCount(harvest.essStaff.staffFound)} department staff entries, with ${formatCount(
        harvest.essStaff.staffWithSection
      )} carrying a section/domain assignment; ML records without a matched ESS co-author and section were excluded.`
    : "";
  const detailLabel =
    harvest?.detailMode === "index-only"
      ? "Detail endpoint skipped"
      : harvest?.detailMode === "all-details"
        ? `${formatCount(harvest.detailsFetched)} detail records fetched`
        : harvest
          ? `${formatCount(harvest.detailsFetched)} candidate detail records fetched`
          : "Legacy dataset";
  const objectTypeText = harvest?.objectTypes?.length ? formatList(harvest.objectTypes) : "master and doctoral thesis";

  return (
    <section className="dataset-status" aria-label="Harvest status">
      <Database aria-hidden="true" />
      <p>
        <strong>{indexLabel}.</strong> The current file checked {formatCount(dataset.stats.totalHarvested)} TBM {objectTypeText} records and classified{" "}
        {formatCount(dataset.stats.totalIncluded)} as ML-related with a matched ESS author/co-author. This is the classifier-selected catalogue at generation time,
        not a hand-audited ground-truth total.{articleText}
        {essText}
      </p>
      <span>{detailLabel}</span>
    </section>
  );
}

function TaxonomyMap({
  records,
  activeMethod,
  activeDomain,
  onMethodSelect,
  onDomainSelect
}: {
  records: ThesisRecord[];
  activeMethod: string;
  activeDomain: string;
  onMethodSelect: (label: string) => void;
  onDomainSelect: (label: string) => void;
}) {
  const methodCounts = Object.fromEntries(
    taxonomy.methodNodes.map((node) => [
      node.id,
      records.filter((record) => record.methodFamilyTags.includes(node.id) || record.methodTags.includes(node.id)).length
    ])
  );
  const domainCounts = Object.fromEntries(
    taxonomy.domainNodes.map((node) => [node.id, records.filter((record) => record.dominantApplicationDomain === node.id).length])
  );

  return (
    <section className="taxonomy-section" aria-label="Interactive method and application taxonomy">
      <div className="taxonomy-header">
        <BrainCircuit aria-hidden="true" />
        <div>
          <h2>Interactive ML Taxonomy</h2>
          <p>Click a method region or application domain to filter the thesis catalogue.</p>
        </div>
      </div>
      <div className="venn-stage">
        <svg
          className="venn-scene"
          viewBox={`${VENN_BOUNDS.minX - VENN_PADDING} ${VENN_BOUNDS.minY - VENN_PADDING} ${VENN_BOUNDS.maxX - VENN_BOUNDS.minX + VENN_PADDING * 2} ${
            VENN_BOUNDS.maxY - VENN_BOUNDS.minY + VENN_PADDING * 2
          }`}
          role="img"
          aria-label="Interactive Venn taxonomy for machine-learning methods and application domains"
        >
          <title>Interactive Venn taxonomy</title>
          <g className="venn-base" aria-hidden="true">
            {VENN_ELEMENTS.map((element) => (
              <VennElementShape key={element.id} element={element} />
            ))}
          </g>
          <g className="venn-hotspots">
            {TAXONOMY_HOTSPOTS.map((hotspot) => {
              const count = hotspot.kind === "method" ? methodCounts[hotspot.id] || 0 : domainCounts[hotspot.id] || 0;
              const active = hotspot.kind === "method" ? activeMethod === hotspot.id : activeDomain === hotspot.id;
              const onSelect = hotspot.kind === "method" ? onMethodSelect : onDomainSelect;
              return <VennHotspot key={hotspot.id} hotspot={hotspot} count={count} active={active} onSelect={onSelect} />;
            })}
          </g>
        </svg>
      </div>
    </section>
  );
}

function VennElementShape({ element }: { element: VennElement }) {
  const opacity = (element.opacity ?? 100) / 100;
  const stroke = element.strokeColor || "transparent";
  const fill = element.backgroundColor === "transparent" ? "transparent" : element.backgroundColor || "transparent";
  const strokeDasharray = element.strokeStyle === "dashed" ? "12 10" : undefined;

  if (element.type === "ellipse") {
    return (
      <ellipse
        cx={element.x + element.width / 2}
        cy={element.y + element.height / 2}
        rx={element.width / 2}
        ry={element.height / 2}
        fill={fill}
        stroke={stroke}
        strokeWidth={element.strokeWidth || 1}
        strokeDasharray={strokeDasharray}
        opacity={opacity}
      />
    );
  }

  if (element.type === "rectangle") {
    return (
      <rect
        x={element.x}
        y={element.y}
        width={element.width}
        height={element.height}
        rx={element.roundness ? 22 : 0}
        fill={fill}
        stroke={stroke}
        strokeWidth={element.strokeWidth || 1}
        opacity={opacity}
      />
    );
  }

  if (element.type === "image" && element.fileId) {
    const file = EXCALIDRAW_SCENE.files?.[element.fileId];
    if (!file?.fileName) return null;
    const href = `${import.meta.env.BASE_URL}assets/${file.fileName}`;
    const clipId = `clip-${element.id}`;
    if (!element.crop) {
      return <image href={href} x={element.x} y={element.y} width={element.width} height={element.height} opacity={opacity} preserveAspectRatio="xMidYMid meet" />;
    }
    const scaleX = element.width / element.crop.width;
    const scaleY = element.height / element.crop.height;
    return (
      <g opacity={opacity}>
        <clipPath id={clipId}>
          <rect x={element.x} y={element.y} width={element.width} height={element.height} />
        </clipPath>
        <image
          href={href}
          x={element.x - element.crop.x * scaleX}
          y={element.y - element.crop.y * scaleY}
          width={element.crop.naturalWidth * scaleX}
          height={element.crop.naturalHeight * scaleY}
          clipPath={`url(#${clipId})`}
          preserveAspectRatio="none"
        />
      </g>
    );
  }

  if (element.type === "text" && element.text) {
    const lines = element.text.split("\n");
    const fontSize = element.fontSize || 18;
    const lineHeight = fontSize * (element.lineHeight || 1.25);
    const textAnchor = element.textAlign === "center" ? "middle" : element.textAlign === "right" ? "end" : "start";
    const x = element.textAlign === "center" ? element.x + element.width / 2 : element.textAlign === "right" ? element.x + element.width : element.x;
    const weight = fontSize >= 30 ? 700 : 400;
    return (
      <text
        x={x}
        y={element.y}
        textAnchor={textAnchor}
        dominantBaseline="hanging"
        fill={element.strokeColor || "currentColor"}
        opacity={opacity}
        fontFamily={element.fontFamily === 1 ? "Roboto Slab, Georgia, serif" : "Arial, Helvetica, sans-serif"}
        fontSize={fontSize}
        fontWeight={weight}
      >
        {lines.map((line, index) => (
          <tspan key={`${element.id}-${index}`} x={x} dy={index === 0 ? 0 : lineHeight}>
            {line}
          </tspan>
        ))}
      </text>
    );
  }

  return null;
}

function VennHotspot({ hotspot, count, active, onSelect }: { hotspot: Hotspot; count: number; active: boolean; onSelect: (label: string) => void }) {
  const element = VENN_ELEMENT_BY_ID.get(hotspot.elementId);
  if (!element) return null;
  const countText = formatCount(count);
  const countWidth = Math.max(42, countText.length * 14 + 24);

  function handleKeyDown(event: KeyboardEvent<SVGGElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelect(hotspot.id);
    }
  }

  return (
    <g
      className={`venn-click-target ${active ? "active" : ""}`}
      role="button"
      tabIndex={0}
      aria-label={`${hotspot.label}: ${countText} theses`}
      aria-pressed={active}
      onClick={() => onSelect(hotspot.id)}
      onKeyDown={handleKeyDown}
    >
      <VennTargetShape element={element} target={hotspot.target} />
      <g className="venn-count" transform={`translate(${hotspot.countX} ${hotspot.countY})`} pointerEvents="none">
        <rect x={-countWidth / 2} y={-18} width={countWidth} height={36} rx={18} />
        <text textAnchor="middle" dominantBaseline="central">
          {countText}
        </text>
      </g>
    </g>
  );
}

function VennTargetShape({ element, target }: { element: VennElement; target?: Hotspot["target"] }) {
  const shape = target || {
    type: element.type === "ellipse" ? "ellipse" : "rectangle",
    x: element.x,
    y: element.y,
    width: element.width,
    height: element.height,
    rx: element.roundness ? 22 : 0
  };
  if (shape.type === "ellipse") {
    return <ellipse className="venn-target-shape" cx={shape.x + shape.width / 2} cy={shape.y + shape.height / 2} rx={shape.width / 2} ry={shape.height / 2} />;
  }

  return <rect className="venn-target-shape" x={shape.x} y={shape.y} width={shape.width} height={shape.height} rx={shape.rx || 0} />;
}

function ThesisListItem({ record, active, onSelect }: { record: ThesisRecord; active: boolean; onSelect: () => void }) {
  return (
    <button className={active ? "thesis-row active" : "thesis-row"} type="button" onClick={onSelect}>
      <span className="year-badge">{record.year || "n.d."}</span>
      <span className="row-main">
        <strong>{record.title}</strong>
        <span>{[record.programme, record.objectType, record.dominantApplicationDomain, record.applicationDomainTags.slice(0, 2).join(", ")].filter(Boolean).join(" / ")}</span>
      </span>
      {record.hasPublicFile ? <FileText aria-hidden="true" className="file-mark" /> : null}
    </button>
  );
}

function ThesisDetail({ record }: { record: ThesisRecord }) {
  const people = [...record.authors, ...record.contributors].filter(Boolean);
  return (
    <article>
      <div className="detail-kicker">
        <span>{record.year || "Unknown year"}</span>
        <span>{record.objectType}</span>
        {record.recordCategory === "article" ? <span>Article</span> : null}
        {record.dominantApplicationDomain ? <span>{record.dominantApplicationDomain}</span> : null}
        {record.dominantApplicationDomainSource === "ess-section" || record.dominantApplicationDomainSource === "advisor-section" ? <span>ESS section</span> : null}
        {record.hasPublicFile ? <span>Public file listed</span> : null}
      </div>
      <h2>{record.title}</h2>
      {record.subTitle ? <p className="subtitle">{record.subTitle}</p> : null}

      <div className="tag-group">
        {record.methodTags.map((tag) => (
          <span key={tag} className="tag method">
            {tag}
          </span>
        ))}
        {record.methodFamilyTags.map((tag) => (
          <span key={tag} className="tag family">
            {tag}
          </span>
        ))}
        {record.applicationDomainTags.map((tag) => (
          <span key={tag} className="tag domain">
            {tag}
          </span>
        ))}
      </div>

      <section className="summary-block">
        <h3>Summary</h3>
        <p>{record.summary}</p>
      </section>

      <section className="summary-block">
        <h3>Abstract</h3>
        <p>{record.abstract || "No public abstract was available in the harvested metadata."}</p>
      </section>

      <dl className="metadata-list">
        {record.programme ? (
          <>
            <dt>Programme</dt>
            <dd>{record.programme}</dd>
          </>
        ) : null}
        {people.length ? (
          <>
            <dt>People</dt>
            <dd>{people.slice(0, 8).join(", ")}</dd>
          </>
        ) : null}
        {record.lastContributor ? (
          <>
            <dt>Last contributor</dt>
            <dd>{record.lastContributor}</dd>
          </>
        ) : null}
        {record.essContributor ? (
          <>
            <dt>ESS co-author</dt>
            <dd>{record.essContributor}</dd>
          </>
        ) : null}
        {record.essSection || record.advisorSection ? (
          <>
            <dt>ESS section</dt>
            <dd>{record.essSection || record.advisorSection}</dd>
          </>
        ) : null}
        {record.keywords.length ? (
          <>
            <dt>Keywords</dt>
            <dd>{record.keywords.slice(0, 12).join(", ")}</dd>
          </>
        ) : null}
      </dl>

      <div className="actions">
        <a href={record.repositoryUrl} target="_blank" rel="noreferrer">
          <ExternalLink aria-hidden="true" />
          Repository record
        </a>
        <a href={record.resolverUrl} target="_blank" rel="noreferrer">
          <ExternalLink aria-hidden="true" />
          Resolver link
        </a>
      </div>

      <p className="source-note">Summary generated from public metadata and abstract. Verify the original thesis before citing or reusing details.</p>
    </article>
  );
}

export default App;
