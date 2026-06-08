import { ArrowUpDown, BookOpen, BrainCircuit, CalendarDays, Database, ExternalLink, FileText, Filter, RefreshCw, Search, Tag, X } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import taxonomy from "../data/taxonomy.json";
import { BokPresentationPage } from "./components/BokPresentationPage";
import { TaxonomyVenn } from "./components/TaxonomyVenn";
import { getSvgSection, hasSvgSection, svgSlideAsset, SVG_SECTIONS, SVG_VENN_SLIDE } from "./data/svg-slides";
import type { TaxonomyHotspot } from "./data/venn-hotspots";
import { getNextPresentationRoute, getPreviousPresentationRoute } from "./lib/presentation-sequence";
import { applyFilters, uniqueValues } from "./lib/search";
import { parseRouteHash, routeToHash, type AppRoute } from "./lib/routes";
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

const SECTION_SLUG_BY_HOTSPOT_ID = new Map([
  ["General Machine Learning", "machine-learning"],
  ["Machine Learning", "feature-based-ml"],
  ["Supervised learning", "supervised-learning"],
  ["Unsupervised learning", "unsupervised-learning"],
  ["Reinforcement learning", "reinforcement-learning"],
  ["Deep Learning", "deep-learning"],
  ["Foundation Models", "foundation-models"],
  ["Generative AI", "generative-ai"]
]);

const HOTSPOT_ID_BY_SECTION_SLUG = new Map(Array.from(SECTION_SLUG_BY_HOTSPOT_ID.entries()).map(([id, sectionSlug]) => [sectionSlug, id]));

const GENERAL_ML_HOTSPOT: TaxonomyHotspot = {
  id: "General Machine Learning",
  label: "Machine Learning overview",
  elementId: "Bps2xFq2",
  kind: "method",
  countX: 1248,
  countY: 262
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

function isFormTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return ["INPUT", "SELECT", "TEXTAREA", "BUTTON", "A"].includes(target.tagName);
}

function App() {
  const [route, setRoute] = useState<AppRoute>(() => parseRouteHash(window.location.hash));
  const [dataset, setDataset] = useState<ThesisDataset | null>(null);
  const [loadError, setLoadError] = useState("");
  const shellClassName =
    route.page === "overview" ? "app-shell presentation-mode overview-mode" : route.page === "learn" ? "app-shell presentation-mode slide-mode" : "app-shell";

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
    <main className={shellClassName}>
      <SiteHeader activePage={route.page} dataset={dataset} loadError={loadError} />
      {route.page === "overview" ? (
        <OverviewPage slug={route.slug} />
      ) : route.page === "learn" ? (
        <BokPresentationPage slug={route.slug} slide={route.slide} />
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
            <p className="eyebrow">TU Delft ESS</p>
            <h1>{activePage === "theses" ? "Machine Learning Thesis Explorer" : "Machine Learning Starter Guide"}</h1>
          </div>
        </div>
        <nav className="top-nav" aria-label="Site sections">
          <a
            className={activePage === "overview" || activePage === "learn" ? "top-nav-link active" : "top-nav-link"}
            href="#overview"
            aria-current={activePage === "overview" || activePage === "learn" ? "page" : undefined}
          >
            <BrainCircuit aria-hidden="true" />
            <span>Starter Guide</span>
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
  if (activePage === "learn") {
    return (
      <div className="source-pill">
        <BrainCircuit aria-hidden="true" />
        <span>Course guide</span>
      </div>
    );
  }

  if (activePage === "overview") {
    return (
      <div className="source-pill">
        <BrainCircuit aria-hidden="true" />
        <span>Beginner map</span>
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
        records={filteredRecords}
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

function OverviewPage({ slug }: { slug?: string }) {
  const selectedSection = getSvgSection(slug);
  const activeHotspotId = HOTSPOT_ID_BY_SECTION_SLUG.get(selectedSection.slug);

  useEffect(() => {
    if (slug && !hasSvgSection(slug)) {
      window.location.hash = routeToHash({ page: "overview", slug: selectedSection.slug });
    }
  }, [selectedSection.slug, slug]);

  function openSection(sectionSlug: string) {
    const section = getSvgSection(sectionSlug);
    window.location.hash = routeToHash({ page: "learn", slug: section.slug, slide: 1 });
  }

  useEffect(() => {
    const overviewRoute = { page: "overview", slug: selectedSection.slug } as const;

    function handleKeyDown(event: KeyboardEvent) {
      if (isFormTarget(event.target)) return;
      if (event.key === "ArrowRight" || event.key === "PageDown" || event.key === " ") {
        event.preventDefault();
        window.location.hash = routeToHash(getNextPresentationRoute(overviewRoute));
      }
      if (event.key === "ArrowLeft" || event.key === "PageUp") {
        event.preventDefault();
        window.location.hash = routeToHash(getPreviousPresentationRoute(overviewRoute));
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedSection.slug]);

  return (
    <>
      <section className="svg-overview-page" aria-label="Machine learning taxonomy slide hub">
        <div className="svg-hub-frame">
          <img className="svg-hub-image" src={svgSlideAsset(SVG_VENN_SLIDE.file)} alt={SVG_VENN_SLIDE.alt} />
          <TaxonomyVenn
            activeIds={activeHotspotId ? [activeHotspotId] : []}
            ariaLabel="Interactive hotspot layer for the machine learning taxonomy slide hub"
            baseVisible={false}
            className="svg-hub-hotspots"
            extraHotspots={[GENERAL_ML_HOTSPOT]}
            hotspotIds={Array.from(SECTION_SLUG_BY_HOTSPOT_ID.keys())}
            interactionLabel={(hotspot) => {
              const sectionSlug = SECTION_SLUG_BY_HOTSPOT_ID.get(hotspot.id);
              const section = sectionSlug ? getSvgSection(sectionSlug) : undefined;
              return section ? `Open ${section.title} slides` : `${hotspot.label} is not a slide section`;
            }}
            onSelect={(hotspot) => {
              const sectionSlug = SECTION_SLUG_BY_HOTSPOT_ID.get(hotspot.id);
              if (sectionSlug) openSection(sectionSlug);
            }}
            viewBoxPadding={10}
          />
        </div>

        <nav className="svg-section-dock" aria-label="Slide sections">
          {SVG_SECTIONS.map((section) => (
            <a key={section.slug} className={selectedSection.slug === section.slug ? "active" : ""} href={routeToHash({ page: "learn", slug: section.slug, slide: 1 })}>
              {section.shortTitle}
            </a>
          ))}
        </nav>
      </section>
    </>
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

function SiteFooter({ activePage }: { activePage: AppRoute["page"] }) {
  return (
    <footer className="site-footer-lite">
      <div className="footer-inner">
        <div>
          <h2>{activePage === "overview" || activePage === "learn" ? "TU Delft ESS Machine Learning Starter Guide" : "TU Delft ESS Machine Learning Thesis Explorer"}</h2>
          <p className="footer-description">
            {activePage === "overview" || activePage === "learn"
              ? "A navigable teaching layer for the Machine Learning Body of Knowledge overview."
              : "Generated from public TU Delft Repository metadata. Thesis files are linked, not mirrored."}
          </p>
          <p className="copyright-notice">&copy; {new Date().getFullYear()} TU Delft ESS, Engineering Systems and Services. Educational use; all rights reserved.</p>
        </div>
        {activePage === "overview" || activePage === "learn" ? (
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
