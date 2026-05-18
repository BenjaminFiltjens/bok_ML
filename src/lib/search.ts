import type { ExplorerFilters, ThesisRecord } from "../types";

export function normalizeText(value: string): string {
  return value.toLocaleLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
}

export function searchableText(record: ThesisRecord): string {
  return normalizeText(
    [
      record.title,
      record.subTitle,
      record.abstract,
      record.summary,
      record.year,
      record.objectType,
      record.programme,
      record.authors.join(" "),
      record.contributors.join(" "),
      record.essContributor || "",
      record.essContributors?.join(" ") || "",
      record.essSection || "",
      record.keywords.join(" "),
      record.methodTags.join(" "),
      record.methodFamilyTags.join(" "),
      record.applicationDomainTags.join(" "),
      record.dominantApplicationDomain,
      record.domainTags.join(" ")
    ].join(" ")
  );
}

export function textMatches(record: ThesisRecord, query: string): boolean {
  const terms = normalizeText(query).split(/\s+/).filter(Boolean);
  if (!terms.length) return true;
  const haystack = searchableText(record);
  return terms.every((term) => haystack.includes(term));
}

export function recordMatchesFilters(record: ThesisRecord, filters: ExplorerFilters): boolean {
  const contributorText = normalizeText([...record.authors, ...record.contributors, record.essContributor || "", ...(record.essContributors || [])].join(" "));
  return (
    textMatches(record, filters.query) &&
    (!filters.objectType || record.objectType === filters.objectType) &&
    (filters.includeArticles || record.recordCategory !== "article") &&
    (!filters.year || record.year === filters.year) &&
    (!filters.programme || record.programme === filters.programme) &&
    (!filters.methodNode || record.methodFamilyTags.includes(filters.methodNode) || record.methodTags.includes(filters.methodNode)) &&
    (!filters.domainNode || record.dominantApplicationDomain === filters.domainNode) &&
    (!filters.contributor || contributorText.includes(normalizeText(filters.contributor))) &&
    (filters.availability === "all" || record.hasPublicFile)
  );
}

export function sortRecords(records: ThesisRecord[], sort: ExplorerFilters["sort"], query = ""): ThesisRecord[] {
  const sorted = [...records];
  if (sort === "year-desc") {
    return sorted.sort((a, b) => (b.year || "").localeCompare(a.year || "") || a.title.localeCompare(b.title));
  }
  if (sort === "year-asc") {
    return sorted.sort((a, b) => (a.year || "").localeCompare(b.year || "") || a.title.localeCompare(b.title));
  }
  if (sort === "title") {
    return sorted.sort((a, b) => a.title.localeCompare(b.title));
  }
  const normalizedQuery = normalizeText(query);
  return sorted.sort((a, b) => scoreRecord(b, normalizedQuery) - scoreRecord(a, normalizedQuery) || (b.year || "").localeCompare(a.year || ""));
}

export function applyFilters(records: ThesisRecord[], filters: ExplorerFilters): ThesisRecord[] {
  return sortRecords(records.filter((record) => recordMatchesFilters(record, filters)), filters.sort, filters.query);
}

export function countTerms(records: ThesisRecord[], key: "methodTags" | "methodFamilyTags" | "domainTags" | "applicationDomainTags"): Array<{ label: string; count: number }> {
  const counts = new Map<string, number>();
  for (const record of records) {
    for (const tag of record[key]) {
      counts.set(tag, (counts.get(tag) || 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

export function countDominantDomains(records: ThesisRecord[]): Record<string, number> {
  return records.reduce<Record<string, number>>((counts, record) => {
    if (record.dominantApplicationDomain) {
      counts[record.dominantApplicationDomain] = (counts[record.dominantApplicationDomain] || 0) + 1;
    }
    return counts;
  }, {});
}

export function uniqueValues(records: ThesisRecord[], accessor: (record: ThesisRecord) => string | string[]): string[] {
  const values = new Set<string>();
  for (const record of records) {
    const next = accessor(record);
    const entries = Array.isArray(next) ? next : [next];
    for (const entry of entries) {
      if (entry) values.add(entry);
    }
  }
  return [...values].sort((a, b) => a.localeCompare(b));
}

function scoreRecord(record: ThesisRecord, query: string): number {
  if (!query) return Number(record.year || 0);
  const title = normalizeText(record.title);
  const keywords = normalizeText(record.keywords.join(" "));
  const tags = normalizeText([...record.methodTags, ...record.methodFamilyTags, ...record.applicationDomainTags, record.dominantApplicationDomain].join(" "));
  let score = 0;
  for (const term of query.split(/\s+/).filter(Boolean)) {
    if (title.includes(term)) score += 5;
    if (keywords.includes(term)) score += 3;
    if (tags.includes(term)) score += 2;
    if (searchableText(record).includes(term)) score += 1;
  }
  return score;
}
