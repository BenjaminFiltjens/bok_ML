import { mkdir, readFile, writeFile } from "node:fs/promises";
import dns from "node:dns";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { buildSummary, classifyRecordFields, classifyText, stripHtml, uniqueSorted } from "./taxonomy.mjs";

dns.setDefaultResultOrder("ipv4first");

const API_BASE = process.env.TUD_REPOSITORY_API_BASE || "https://repository.tudelft.nl";
const ORG_ID = process.env.TUD_ORG_ID || "Organisation_03b4b014-5c14-4b45-b961-090135469dad";
const ORG_NAME = "Technology, Policy and Management";
const THESIS_OBJECT_TYPES = ["master thesis", "doctoral thesis"];
const ARTICLE_OBJECT_TYPES = ["journal article", "conference paper"];
const INCLUDE_ARTICLES = process.env.HARVEST_INCLUDE_ARTICLES === "1";
const OBJECT_TYPES = process.env.HARVEST_OBJECT_TYPES
  ? process.env.HARVEST_OBJECT_TYPES.split(",").map((entry) => entry.trim()).filter(Boolean)
  : [...THESIS_OBJECT_TYPES, ...(INCLUDE_ARTICLES ? ARTICLE_OBJECT_TYPES : [])];
const PAGE_SIZE = Number(process.env.HARVEST_PAGE_SIZE || 100);
const DETAIL_CONCURRENCY = Number(process.env.HARVEST_DETAIL_CONCURRENCY || 2);
const DETAIL_LIMIT = Number(process.env.HARVEST_DETAIL_LIMIT || 0);
const INDEX_LIMIT = Number(process.env.HARVEST_INDEX_LIMIT || 0);
const FETCH_ALL_DETAILS = process.env.HARVEST_FETCH_ALL_DETAILS === "1";
const SKIP_DETAILS = process.env.HARVEST_SKIP_DETAILS === "1";
const OUT_FILE = path.resolve("public/data/theses.json");
const OVERRIDE_FILE = path.resolve("data/manual-overrides.json");
const ADVISOR_SECTION_FILE = path.resolve("data/advisor-sections.json");
const ESS_STAFF_FILE = path.resolve("data/ess-staff.json");

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function stripRecordPrefix(value = "") {
  return String(value).replace(/^Thing_/, "").replace(/^uuid:/, "");
}

function fieldValue(payload, name) {
  const field = payload?.[name];
  if (!field || typeof field !== "object" || !("value" in field)) {
    return undefined;
  }
  return field.value;
}

function valueToText(value) {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number") return stripHtml(String(value));
  if (Array.isArray(value)) return value.map(valueToText).filter(Boolean).join(", ");
  if (typeof value === "object") {
    if (value.name) return stripHtml(value.name);
    if (value.full_name) return stripHtml(value.full_name);
    if (value.person) return valueToText(value.person);
    return Object.values(value).map(valueToText).filter(Boolean).join(", ");
  }
  return "";
}

function metadataField(payload, fieldName) {
  const groups = [payload?.metadata?.main, payload?.metadata?.additional].filter(Array.isArray);
  for (const group of groups) {
    const match = group.find((entry) => entry?.field === fieldName);
    if (match) return match.value;
  }
  return undefined;
}

function arrayText(value) {
  if (!value) return [];
  const values = Array.isArray(value) ? value : [value];
  return uniqueSorted(values.flatMap((entry) => valueToText(entry).split(/\s*,\s*/)).map((entry) => entry.trim()).filter(Boolean));
}

function extractYear(...values) {
  for (const value of values) {
    const match = String(value || "").match(/\b(19|20)\d{2}\b/);
    if (match) return match[0];
  }
  return "";
}

function recordCategoryFor(objectType = "") {
  if (THESIS_OBJECT_TYPES.includes(objectType)) return "thesis";
  if (ARTICLE_OBJECT_TYPES.includes(objectType)) return "article";
  return "other";
}

async function fetchJson(url, attempts = 3) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    let timeout;
    try {
      const controller = new AbortController();
      timeout = setTimeout(() => controller.abort(), 30000);
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          accept: "application/json",
          "user-agent": "tbm-ml-thesis-explorer/0.1 (+https://github.com)"
        }
      });
      clearTimeout(timeout);
      if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await sleep(1200 * attempt);
    } finally {
      clearTimeout(timeout);
    }
  }
  const cause = lastError.cause?.message ? ` (${lastError.cause.message})` : "";
  throw new Error(`${lastError.message}${cause} while fetching ${url}`);
}

async function loadOverrides() {
  try {
    return JSON.parse(await readFile(OVERRIDE_FILE, "utf8"));
  } catch {
    return { include: [], exclude: [], records: {} };
  }
}

async function loadAdvisorSections() {
  try {
    return JSON.parse(await readFile(ADVISOR_SECTION_FILE, "utf8"));
  } catch {
    return { aliases: {}, staff: {}, sectionDomains: {} };
  }
}

async function loadEssStaff() {
  try {
    return JSON.parse(await readFile(ESS_STAFF_FILE, "utf8"));
  } catch {
    return { staff: [], stats: { staffFound: 0, staffWithSection: 0 } };
  }
}

function normalizePersonName(value = "") {
  return stripHtml(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’']/g, "")
    .replace(/\b(professor|emeritus|prof|drs|dr|ir|msc|ll\.?m|mba|phd)\.?(?=\s|,|$)/gi, "")
    .replace(/\b(ba|llm|mba)\b/gi, "")
    .replace(/\([^)]*\)/g, " ")
    .replace(/[^a-z0-9]+/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function uniqueInOrder(values) {
  const seen = new Set();
  const output = [];
  for (const value of values) {
    const entry = String(value || "").trim();
    const key = normalizePersonName(entry);
    if (!entry || !key || seen.has(key)) continue;
    seen.add(key);
    output.push(entry);
  }
  return output;
}

function buildManualStaffLookup(advisorSections) {
  const aliases = advisorSections.aliases || {};
  const staff = advisorSections.staff || {};
  return {
    aliases: Object.fromEntries(Object.entries(aliases).map(([alias, canonical]) => [normalizePersonName(alias), canonical])),
    staff: Object.fromEntries(Object.entries(staff).map(([name, entry]) => [normalizePersonName(name), { canonicalName: name, ...entry }]))
  };
}

function buildEssStaffLookup(essStaff = { staff: [] }, advisorSections = { aliases: {}, staff: {}, sectionDomains: {} }) {
  const sectionDomains = advisorSections.sectionDomains || {};
  const manual = buildManualStaffLookup(advisorSections);
  const byAlias = new Map();
  for (const person of essStaff.staff || []) {
    const aliases = uniqueInOrder([person.displayName, ...(person.rawNames || []), ...(person.aliases || [])]);
    let section = person.section || "";
    let domain = person.domain || (section ? sectionDomains[section] : "");
    let sectionSource = person.sectionSource || person.profileUrl || person.pureProfileUrl || "";
    for (const alias of aliases) {
      const canonicalName = manual.aliases[normalizePersonName(alias)] || alias;
      const manualEntry = manual.staff[normalizePersonName(canonicalName)];
      if (manualEntry?.section) {
        section = manualEntry.section;
        domain = manualEntry.domain || sectionDomains[manualEntry.section] || "";
        sectionSource = manualEntry.sourceUrl || sectionSource || "";
      }
    }
    const entry = {
      displayName: person.displayName,
      aliases,
      profileUrl: person.profileUrl || "",
      pureProfileUrl: person.pureProfileUrl || "",
      section,
      domain,
      sectionSource
    };
    for (const alias of aliases) {
      byAlias.set(normalizePersonName(alias), entry);
    }
  }
  return byAlias;
}

function resolveEssSection(people, advisorSections, essStaff) {
  const allPeople = uniqueInOrder(people);
  const lastContributor = allPeople.at(-1) || "";
  const essLookup = buildEssStaffLookup(essStaff, advisorSections);
  const matches = [];
  for (const person of allPeople) {
    const match = essLookup.get(normalizePersonName(person));
    if (!match) continue;
    matches.push({
      contributorName: person,
      displayName: match.displayName,
      section: match.section || "",
      domain: match.domain || "",
      sectionSource: match.sectionSource || "",
      profileUrl: match.profileUrl || match.pureProfileUrl || ""
    });
  }
  const selected = [...matches].reverse().find((match) => match.section || match.domain) || matches.at(-1);
  return {
    lastContributor,
    essContributors: matches.map((match) => match.contributorName),
    essContributor: selected?.contributorName || "",
    essContributorDisplayName: selected?.displayName || "",
    essSection: selected?.section || "",
    essSectionSource: selected?.sectionSource || "",
    essDomain: selected?.domain || "",
    hasEssContributor: matches.length > 0
  };
}

async function harvestIndexForType(objectType) {
  const records = [];
  const pages = [];
  let complete = false;
  let stopReason = "unknown";
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const params = new URLSearchParams({
      limit: String(PAGE_SIZE),
      offset: String(offset),
      object_type: objectType
    });
    const url = `${API_BASE}/api/organisation/page/${encodeURIComponent(ORG_ID)}?${params}`;
    const payload = await fetchJson(url);
    const pageRecords = Array.isArray(payload?.records) ? payload.records : Array.isArray(payload?.aggregated_things) ? payload.aggregated_things : [];
    records.push(...pageRecords);
    pages.push({ offset, count: pageRecords.length });
    console.log(`Fetched ${pageRecords.length} ${objectType} records at offset ${offset}`);
    if (INDEX_LIMIT > 0 && records.length >= INDEX_LIMIT) {
      stopReason = "index-limit";
      break;
    }
    if (pageRecords.length < PAGE_SIZE) {
      complete = true;
      stopReason = "last-page";
      break;
    }
    await sleep(250);
  }
  return {
    objectType,
    complete,
    stopReason,
    pageSize: PAGE_SIZE,
    pages,
    records: INDEX_LIMIT > 0 ? records.slice(0, INDEX_LIMIT) : records
  };
}

async function mapConcurrent(items, worker, concurrency) {
  const output = new Array(items.length);
  let nextIndex = 0;
  async function run() {
    for (;;) {
      const index = nextIndex;
      nextIndex += 1;
      if (index >= items.length) return;
      output[index] = await worker(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: concurrency }, run));
  return output;
}

async function fetchDetail(summaryRecord, index) {
  const id = stripRecordPrefix(summaryRecord.thingID || summaryRecord.uuid || summaryRecord.id);
  try {
    await sleep(index * 150);
    const detail = await fetchJson(`${API_BASE}/api/record/uuid:${id}`, 2);
    if ((index + 1) % 100 === 0) {
      console.log(`Fetched ${index + 1} record details`);
    }
    return detail;
  } catch (error) {
    console.warn(`Detail fetch failed for ${id}: ${error.message}`);
    return null;
  }
}

function summaryRecordLooksMachineLearning(summaryRecord, overrides) {
  const id = stripRecordPrefix(summaryRecord.thingID || summaryRecord.uuid || summaryRecord.id);
  const override = overrides.records?.[id] || {};
  if (overrides.exclude?.includes(id) || override.include === false) return false;
  if (overrides.include?.includes(id) || override.include === true) return true;
  const text = [
    summaryRecord.title,
    summaryRecord.sub_title,
    summaryRecord.description,
    Array.isArray(summaryRecord.contributors) ? summaryRecord.contributors.join(" ") : summaryRecord.contributors
  ].join(" ");
  return classifyText(text).methods.length > 0;
}

function normalizeFiles(detail) {
  const files = fieldValue(detail, "files");
  if (!Array.isArray(files)) return [];
  return files.map((file) => ({
    name: stripHtml(file.name || ""),
    path: file.path || "",
    extension: file.extension || "",
    pages: file.pages || "",
    size: file.size || "",
    downloadsCounter: file.downloads_counter || "",
    isAccessible: Boolean(file.access_scope?.is_accessible),
    accessLevel: file.access_scope?.access_level || "",
    networkLevel: file.access_scope?.network_level || "",
    embargo: file.access_scope?.embargo || ""
  }));
}

function normalizeRecord(
  summaryRecord,
  detail,
  overrides,
  advisorSections = { aliases: {}, staff: {}, sectionDomains: {} },
  essStaff = { staff: [] }
) {
  const id = stripRecordPrefix(summaryRecord.thingID || summaryRecord.uuid || summaryRecord.id);
  const override = overrides.records?.[id] || {};
  const title = stripHtml(fieldValue(detail, "title") || summaryRecord.title || "");
  const subTitle = stripHtml(fieldValue(detail, "sub_title") || summaryRecord.sub_title || "");
  const objectType = stripHtml(fieldValue(detail, "object_type") || summaryRecord.object_type || "");
  const abstract = stripHtml(fieldValue(detail, "abstract") || summaryRecord.description || "");
  const keywords = arrayText(fieldValue(detail, "keywords"));
  const authors = arrayText(metadataField(detail, "authors"));
  const contributors = arrayText(metadataField(detail, "contributors") || summaryRecord.contributors);
  const people = uniqueInOrder([...authors, ...contributors]);
  const programme = valueToText(metadataField(detail, "programme"));
  const year = extractYear(fieldValue(detail, "publication_year"), summaryRecord.publication_date);
  const files = normalizeFiles(detail);
  const classified = classifyRecordFields({ title, subTitle, abstract, keywords: keywords.join(" "), programme });
  const ess = resolveEssSection(people, advisorSections, essStaff);
  const hasEssStaffList = Array.isArray(essStaff.staff) && essStaff.staff.length > 0;
  const methodTags = uniqueSorted([...(classified.methodTags || []), ...(override.methods || [])]);
  const methodFamilyTags = uniqueSorted([...(classified.methodFamilyTags || []), ...(override.methodFamilies || [])]);
  let applicationDomainTags = uniqueSorted([...(classified.applicationDomainTags || []), ...(override.applicationDomains || []), ...(override.domains || [])]);
  let dominantApplicationDomain = override.dominantApplicationDomain || ess.essDomain || (!hasEssStaffList ? classified.dominantApplicationDomain : "");
  let dominantApplicationDomainSource = override.dominantApplicationDomain
    ? "manual"
    : ess.essDomain
      ? "ess-section"
      : !hasEssStaffList && classified.dominantApplicationDomain
        ? "text-classifier"
        : "";
  const manuallyIncluded = overrides.include?.includes(id) || override.include === true;
  const manuallyExcluded = overrides.exclude?.includes(id) || override.include === false;
  const isMachineLearning = !manuallyExcluded && (manuallyIncluded || methodFamilyTags.includes("Machine Learning") || methodTags.length > 0);
  const hasRequiredEssContributor = !hasEssStaffList || ess.hasEssContributor;
  const hasRequiredEssSection = !hasEssStaffList || Boolean(dominantApplicationDomain);
  const isIncluded = isMachineLearning && hasRequiredEssContributor && hasRequiredEssSection;
  const repositoryUrl = `${API_BASE}/record/uuid:${id}`;
  const resolverUrl = fieldValue(detail, "persistent_url") || `https://resolver.tudelft.nl/uuid:${id}`;
  const record = {
    id,
    thingId: summaryRecord.thingID || `Thing_${id}`,
    title,
    subTitle,
    year,
    objectType,
    recordCategory: recordCategoryFor(objectType),
    authors,
    contributors,
    programme,
    abstract,
    summary: stripHtml(override.summary || buildSummary({ title, subTitle, abstract }, methodTags, applicationDomainTags)),
    keywords,
    methodTags,
    methodFamilyTags,
    dominantApplicationDomain,
    dominantApplicationDomainSource,
    applicationDomainTags,
    domainTags: applicationDomainTags,
    lastContributor: ess.lastContributor,
    essContributor: ess.essContributor,
    essContributors: ess.essContributors,
    essSection: ess.essSection,
    essSectionSource: ess.essSectionSource,
    advisorSection: ess.essSection,
    advisorSectionSource: ess.essSectionSource,
    repositoryUrl,
    resolverUrl,
    files,
    hasPublicFile: files.some((file) => file.isAccessible && file.accessLevel === "public")
  };
  return {
    record,
    isMachineLearning,
    isIncluded,
    hasEssContributor: ess.hasEssContributor,
    hasEssSection: Boolean(dominantApplicationDomain),
    exclusionReason: !isMachineLearning
      ? "not-machine-learning"
      : !hasRequiredEssContributor
        ? "no-ess-contributor"
        : !hasRequiredEssSection
          ? "no-ess-section"
          : ""
  };
}

function countBy(records, key) {
  return records.reduce((counts, record) => {
    const values = Array.isArray(record[key]) ? record[key] : [record[key]];
    for (const value of values) {
      if (!value) continue;
      counts[value] = (counts[value] || 0) + 1;
    }
    return counts;
  }, {});
}

async function main() {
  const overrides = await loadOverrides();
  const advisorSections = await loadAdvisorSections();
  const essStaff = await loadEssStaff();
  const indexRecords = [];
  const indexSummaries = [];
  for (const objectType of OBJECT_TYPES) {
    const summary = await harvestIndexForType(objectType);
    indexSummaries.push({
      objectType: summary.objectType,
      complete: summary.complete,
      stopReason: summary.stopReason,
      pages: summary.pages,
      recordsHarvested: summary.records.length
    });
    indexRecords.push(...summary.records);
  }
  const deduped = [...new Map(indexRecords.map((record) => [stripRecordPrefix(record.thingID || record.uuid), record])).values()];
  const detailCandidates = FETCH_ALL_DETAILS ? deduped : deduped.filter((record) => summaryRecordLooksMachineLearning(record, overrides));
  const recordsForDetails = DETAIL_LIMIT > 0 ? detailCandidates.slice(0, DETAIL_LIMIT) : detailCandidates;
  console.log(
    `Harvested ${deduped.length} unique records; ${detailCandidates.length} look ML-related from page metadata; ${
      SKIP_DETAILS ? "skipping detail fetches" : `fetching details for ${recordsForDetails.length}`
    }.`
  );
  const details = SKIP_DETAILS ? recordsForDetails.map(() => null) : await mapConcurrent(recordsForDetails, fetchDetail, DETAIL_CONCURRENCY);
  const detailSuccesses = details.filter(Boolean).length;
  const detailFailures = SKIP_DETAILS ? 0 : recordsForDetails.length - detailSuccesses;
  const normalizedEntries = recordsForDetails.map((summaryRecord, index) => normalizeRecord(summaryRecord, details[index], overrides, advisorSections, essStaff));
  const normalized = normalizedEntries
    .filter((entry) => entry.isIncluded)
    .map((entry) => entry.record)
    .sort((a, b) => (b.year || "").localeCompare(a.year || "") || a.title.localeCompare(b.title));
  const exclusionCounts = normalizedEntries.reduce((counts, entry) => {
    if (entry.isIncluded) return counts;
    counts[entry.exclusionReason] = (counts[entry.exclusionReason] || 0) + 1;
    return counts;
  }, {});

  const dataset = {
    generatedAt: new Date().toISOString(),
    source: {
      organisationId: ORG_ID,
      organisationName: ORG_NAME,
      apiBase: API_BASE,
      note: "Generated from public TU Delft Repository metadata. PDFs are linked, not mirrored."
    },
    harvest: {
      indexComplete: indexSummaries.every((summary) => summary.complete),
      objectTypes: OBJECT_TYPES,
      thesisObjectTypes: THESIS_OBJECT_TYPES,
      articleObjectTypes: ARTICLE_OBJECT_TYPES,
      includeArticles: INCLUDE_ARTICLES || ARTICLE_OBJECT_TYPES.some((objectType) => OBJECT_TYPES.includes(objectType)),
      pageSize: PAGE_SIZE,
      indexLimit: INDEX_LIMIT,
      detailMode: SKIP_DETAILS ? "index-only" : FETCH_ALL_DETAILS ? "all-details" : "candidate-details",
      detailCandidates: recordsForDetails.length,
      detailsFetched: detailSuccesses,
      detailFailures,
      essStaff: {
        sourceUrl: essStaff.sourceUrl || "",
        generatedAt: essStaff.generatedAt || "",
        staffFound: essStaff.stats?.staffFound || essStaff.staff?.length || 0,
        staffWithSection: essStaff.stats?.staffWithSection || (essStaff.staff || []).filter((person) => person.section).length
      },
      indexPages: indexSummaries,
      note: SKIP_DETAILS
        ? "The paginated index completed. Detail endpoints were skipped, so ML detection is based on page metadata and manual overrides. Records are included only when an ESS staff member is matched as author/co-author and has a mapped section/domain."
        : "The paginated index completed. Detail metadata was fetched where available. Records are included only when an ESS staff member is matched as author/co-author and has a mapped section/domain."
    },
    stats: {
      totalHarvested: deduped.length,
      totalCandidates: normalizedEntries.length,
      totalIncluded: normalized.length,
      exclusionCounts,
      byType: countBy(normalized, "objectType"),
      byCategory: countBy(normalized, "recordCategory"),
      methodCounts: countBy(normalized, "methodTags"),
      methodFamilyCounts: countBy(normalized, "methodFamilyTags"),
      domainCounts: countBy(normalized, "dominantApplicationDomain"),
      domainSourceCounts: countBy(normalized, "dominantApplicationDomainSource"),
      essSectionCounts: countBy(normalized, "essSection"),
      essContributorCounts: countBy(normalized, "essContributor"),
      applicationDomainCounts: countBy(normalized, "applicationDomainTags")
    },
    records: normalized
  };

  await mkdir(path.dirname(OUT_FILE), { recursive: true });
  await writeFile(OUT_FILE, `${JSON.stringify(dataset, null, 2)}\n`, "utf8");
  console.log(`Wrote ${normalized.length} ML records with matched ESS staff to ${OUT_FILE}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

export { extractYear, normalizeRecord, stripRecordPrefix };
