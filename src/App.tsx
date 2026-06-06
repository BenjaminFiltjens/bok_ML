import { ArrowUpDown, BookOpen, BrainCircuit, CalendarDays, Database, ExternalLink, FileText, Filter, RefreshCw, Search, Tag, X } from "lucide-react";
import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import taxonomy from "../data/taxonomy.json";
import { TaxonomyVenn } from "./components/TaxonomyVenn";
import { TrainingDemoPage } from "./components/TrainingDemoPage";
import { BOK_BY_ID, BOK_BY_SLUG, BOK_ELEMENTS, getBokElementBySlug } from "./data/bok-content";
import { isTrainingDemoSlug } from "./data/training-demos";
import { applyFilters, uniqueValues } from "./lib/search";
import { parseRouteHash, routeToHash, type AppRoute } from "./lib/routes";
import type { BokElementContent, ExplorerFilters, ThesisDataset, ThesisRecord } from "./types";

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

type ZoomTarget = {
  slug: string;
  title: string;
  left: number;
  top: number;
  width: number;
  height: number;
  scale: number;
};

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
  const [route, setRoute] = useState<AppRoute>(() => parseRouteHash(window.location.hash));
  const [dataset, setDataset] = useState<ThesisDataset | null>(null);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    function syncRoute() {
      setRoute(parseRouteHash(window.location.hash));
    }

    window.addEventListener("hashchange", syncRoute);
    syncRoute();
    return () => window.removeEventListener("hashchange", syncRoute);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch(`${import.meta.env.BASE_URL}data/theses.json`)
      .then((response) => {
        if (!response.ok) throw new Error(`Could not load thesis data (${response.status})`);
        return response.json();
      })
      .then((data: ThesisDataset) => {
        if (!cancelled) setDataset(data);
      })
      .catch((error: Error) => {
        if (!cancelled) setLoadError(error.message);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="app-shell">
      <SiteHeader activePage={route.page} dataset={dataset} loadError={loadError} />
      {route.page === "overview" ? (
        <OverviewPage slug={route.slug} />
      ) : route.page === "demo" ? (
        <TrainingDemoPage slug={route.slug} />
      ) : (
        <ThesisExplorerPage dataset={dataset} loadError={loadError} />
      )}
      <SiteFooter activePage={route.page} />
    </main>
  );
}

function SiteHeader({ activePage, dataset, loadError }: { activePage: AppRoute["page"]; dataset: ThesisDataset | null; loadError: string }) {
  return (
    <header className="top-band">
      <div className="top-content">
        <div className="brand-lockup">
          <span className="logo-icon" aria-hidden="true">
            ML
          </span>
          <div>
            <p className="eyebrow">TU Delft TBM</p>
            <h1>{activePage === "overview" ? "Machine Learning BoK Overview" : activePage === "demo" ? "Interactive Training Demo" : "Machine Learning Thesis Explorer"}</h1>
          </div>
        </div>
        <nav className="top-nav" aria-label="Site sections">
          <a
            className={activePage === "overview" || activePage === "demo" ? "top-nav-link active" : "top-nav-link"}
            href="#overview"
            aria-current={activePage === "overview" || activePage === "demo" ? "page" : undefined}
          >
            <BrainCircuit aria-hidden="true" />
            <span>Overview</span>
          </a>
          <a className={activePage === "theses" ? "top-nav-link active" : "top-nav-link"} href="#theses" aria-current={activePage === "theses" ? "page" : undefined}>
            <BookOpen aria-hidden="true" />
            <span>Theses</span>
          </a>
        </nav>
        <HeaderStatus activePage={activePage} dataset={dataset} loadError={loadError} />
      </div>
    </header>
  );
}

function HeaderStatus({ activePage, dataset, loadError }: { activePage: AppRoute["page"]; dataset: ThesisDataset | null; loadError: string }) {
  if (activePage === "demo") {
    return (
      <div className="source-pill">
        <BrainCircuit aria-hidden="true" />
        <span>Interactive demo</span>
      </div>
    );
  }

  if (activePage === "overview") {
    return (
      <div className="source-pill">
        <BrainCircuit aria-hidden="true" />
        <span>BoK overview</span>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="source-pill">
        <Database aria-hidden="true" />
        <span>Data unavailable</span>
      </div>
    );
  }

  if (!dataset) {
    return (
      <div className="source-pill">
        <RefreshCw aria-hidden="true" className="spin" />
        <span>Loading data</span>
      </div>
    );
  }

  return (
    <div className="source-pill" title={dataset.source.note}>
      <Database aria-hidden="true" />
      <span>{formatDate(dataset.generatedAt)}</span>
    </div>
  );
}

function ThesisExplorerPage({ dataset, loadError }: { dataset: ThesisDataset | null; loadError: string }) {
  const [filters, setFilters] = useState<ExplorerFilters>(EMPTY_FILTERS);
  const [selectedId, setSelectedId] = useState("");

  useEffect(() => {
    if (dataset?.records[0] && !selectedId) {
      setSelectedId(dataset.records[0].id);
    }
  }, [dataset, selectedId]);

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
      <section className="empty-state">
        <Database aria-hidden="true" />
        <h2>Thesis data could not be loaded</h2>
        <p>{loadError}</p>
      </section>
    );
  }

  if (!dataset) {
    return (
      <section className="empty-state">
        <RefreshCw aria-hidden="true" className="spin" />
        <h2>Loading thesis explorer</h2>
      </section>
    );
  }

  return (
    <>
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
    </>
  );
}

function OverviewPage({ slug }: { slug: string }) {
  const selected = getBokElementBySlug(slug);
  const relatedElements = selected.relatedIds.map((id) => BOK_BY_ID.get(id)).filter((element): element is BokElementContent => Boolean(element));
  const methodCount = BOK_ELEMENTS.filter((element) => element.kind === "method").length;
  const domainCount = BOK_ELEMENTS.filter((element) => element.kind === "domain").length;
  const [zoomTarget, setZoomTarget] = useState<ZoomTarget | null>(null);

  useEffect(() => {
    if (!BOK_BY_SLUG.has(slug)) {
      window.location.hash = routeToHash({ page: "overview", slug: selected.slug });
    }
  }, [selected.slug, slug]);

  function shouldReduceMotion() {
    return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  }

  function openDemoWithZoom(content: BokElementContent, rect?: DOMRect) {
    const demoHash = routeToHash({ page: "demo", slug: content.slug });
    if (!rect || shouldReduceMotion()) {
      window.location.hash = demoHash;
      return;
    }

    const width = Math.max(rect.width, 80);
    const height = Math.max(rect.height, 80);
    const scale = Math.max(window.innerWidth / width, window.innerHeight / height) * 2.4;
    setZoomTarget({
      slug: content.slug,
      title: content.title,
      left: rect.left,
      top: rect.top,
      width,
      height,
      scale
    });
  }

  return (
    <>
      <section className="overview-intro">
        <div>
          <p className="eyebrow">Interactive BoK</p>
          <h2>Machine learning concepts in context</h2>
          <p>The overview connects core method families with TBM application areas, keeping the original BoK map visible while each element gets teaching-primer notes.</p>
        </div>
        <div className="overview-summary" aria-label="Overview summary">
          <span>{formatCount(methodCount)} method regions</span>
          <span>{formatCount(domainCount)} application areas</span>
        </div>
      </section>

      <section className="overview-shell">
        <div className="overview-map-column">
          <div className="taxonomy-header">
            <BrainCircuit aria-hidden="true" />
            <div>
              <h2>Machine Learning BoK Map</h2>
              <p>Method families sit in the centre; TBM application areas frame the map.</p>
            </div>
          </div>
          <div className="venn-stage overview-venn-stage">
            <TaxonomyVenn
              activeIds={[selected.id]}
              ariaLabel="Interactive BoK map for machine-learning methods and TBM application areas"
              onSelect={(hotspot, rect) => {
                const content = BOK_BY_ID.get(hotspot.id);
                if (!content) return;
                if (isTrainingDemoSlug(content.slug)) {
                  openDemoWithZoom(content, rect);
                } else {
                  window.location.hash = routeToHash({ page: "overview", slug: content.slug });
                }
              }}
            />
          </div>
        </div>

        <aside className="bok-panel" aria-label="Selected BoK element">
          <BokExplanation element={selected} relatedElements={relatedElements} />
        </aside>
      </section>
      <VennZoomOverlay target={zoomTarget} onComplete={() => zoomTarget && (window.location.hash = routeToHash({ page: "demo", slug: zoomTarget.slug }))} />
    </>
  );
}

function VennZoomOverlay({ target, onComplete }: { target: ZoomTarget | null; onComplete: () => void }) {
  if (!target) return null;
  const style = {
    "--zoom-left": `${target.left}px`,
    "--zoom-top": `${target.top}px`,
    "--zoom-width": `${target.width}px`,
    "--zoom-height": `${target.height}px`,
    "--zoom-scale": target.scale.toString()
  } as CSSProperties;

  return (
    <div className="venn-zoom-overlay" aria-hidden="true">
      <div className="venn-zoom-bubble" style={style} onAnimationEnd={onComplete}>
        <span>{target.title}</span>
      </div>
    </div>
  );
}

function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
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

function SelectFilter({ icon, label, value, options, onChange }: { icon: ReactNode; label: string; value: string; options: string[]; onChange: (value: string) => void }) {
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
  const counts = { ...methodCounts, ...domainCounts };

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
        <TaxonomyVenn
          activeIds={[activeMethod, activeDomain].filter(Boolean)}
          ariaLabel="Interactive Venn taxonomy for machine-learning methods and application domains"
          counts={counts}
          onSelect={(hotspot) => {
            if (hotspot.kind === "method") onMethodSelect(hotspot.id);
            else onDomainSelect(hotspot.id);
          }}
          showCounts
        />
      </div>
    </section>
  );
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

function BokExplanation({ element, relatedElements }: { element: BokElementContent; relatedElements: BokElementContent[] }) {
  return (
    <article>
      <div className="detail-kicker">
        <span>{element.kind === "method" ? "Method region" : "Application area"}</span>
        <span>{element.id}</span>
      </div>
      <h2>{element.title}</h2>
      <p className="subtitle">{element.definition}</p>

      <section className="summary-block">
        <h3>Where it sits</h3>
        <p>{element.relationship}</p>
      </section>

      <BokListSection title="Common techniques and examples" items={element.examples} />
      <BokListSection title="TBM use cases" items={element.useCases} />
      <BokListSection title="Watch for" items={element.cautions} />

      {isTrainingDemoSlug(element.slug) ? (
        <div className="actions">
          <a href={routeToHash({ page: "demo", slug: element.slug })}>
            <BrainCircuit aria-hidden="true" />
            Open interactive demo
          </a>
        </div>
      ) : null}

      {relatedElements.length ? (
        <section className="summary-block">
          <h3>Related elements</h3>
          <div className="related-links">
            {relatedElements.map((related) => (
              <a key={related.id} className="related-link" href={routeToHash({ page: "overview", slug: related.slug })}>
                {related.title}
              </a>
            ))}
          </div>
        </section>
      ) : null}
    </article>
  );
}

function BokListSection({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="summary-block">
      <h3>{title}</h3>
      <ul className="bok-list">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}

function SiteFooter({ activePage }: { activePage: AppRoute["page"] }) {
  return (
    <footer className="site-footer-lite">
      <div className="footer-inner">
        <div>
          <h2>{activePage === "overview" || activePage === "demo" ? "TBM Machine Learning BoK Overview" : "TBM Machine Learning Thesis Explorer"}</h2>
          <p>
            {activePage === "overview" || activePage === "demo"
              ? "A navigable teaching layer for the Machine Learning Body of Knowledge overview."
              : "Generated from public TU Delft Repository metadata. Thesis files are linked, not mirrored."}
          </p>
        </div>
        {activePage === "overview" || activePage === "demo" ? (
          <a href="#theses">
            <BookOpen aria-hidden="true" />
            Thesis explorer
          </a>
        ) : (
          <a href="https://repository.tudelft.nl/" target="_blank" rel="noreferrer">
            <ExternalLink aria-hidden="true" />
            TU Delft Repository
          </a>
        )}
      </div>
    </footer>
  );
}

export default App;
