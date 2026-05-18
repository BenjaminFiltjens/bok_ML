import { readFileSync } from "node:fs";
import path from "node:path";

const TAXONOMY_PATH = path.resolve("data/taxonomy.json");
const TAXONOMY = JSON.parse(readFileSync(TAXONOMY_PATH, "utf8"));

export function stripHtml(value = "") {
  return String(value)
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/p>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

export function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function rulesMatch(text, patterns) {
  return patterns.some((pattern) => new RegExp(pattern, "i").test(text));
}

function compileText(parts) {
  return stripHtml(parts.filter(Boolean).join(" "));
}

export function classifyText(text) {
  const haystack = stripHtml(text);
  const methods = [];
  const methodFamilies = [];
  for (const rule of TAXONOMY.methodRules) {
    if (rulesMatch(haystack, rule.patterns)) {
      methods.push(rule.tag);
      methodFamilies.push(...rule.families);
    }
  }
  if (methods.length > 0 && !methodFamilies.includes("Machine Learning")) {
    methodFamilies.push("Machine Learning");
  }

  const domains = [];
  const domainScores = {};
  for (const rule of TAXONOMY.domainRules) {
    if (rulesMatch(haystack, rule.patterns)) {
      domains.push(rule.tag);
      domainScores[rule.domain] = (domainScores[rule.domain] || 0) + 1;
    }
  }

  return {
    methods: uniqueSorted(methods),
    methodFamilies: uniqueSorted(methodFamilies),
    domains: uniqueSorted(domains),
    dominantDomain: chooseDominantDomain(domainScores)
  };
}

export function classifyRecordFields(fields) {
  const weightedFields = [
    { text: compileText([fields.title, fields.keywords]), weight: 3 },
    { text: compileText([fields.subTitle, fields.programme]), weight: 2 },
    { text: compileText([fields.abstract]), weight: 1 }
  ];
  const methodTags = [];
  const methodFamilyTags = [];
  const applicationDomainTags = [];
  const domainScores = {};

  for (const rule of TAXONOMY.methodRules) {
    if (weightedFields.some(({ text }) => rulesMatch(text, rule.patterns))) {
      methodTags.push(rule.tag);
      methodFamilyTags.push(...rule.families);
    }
  }
  if (methodTags.length > 0 && !methodFamilyTags.includes("Machine Learning")) {
    methodFamilyTags.push("Machine Learning");
  }

  for (const rule of TAXONOMY.domainRules) {
    let matched = false;
    for (const field of weightedFields) {
      if (rulesMatch(field.text, rule.patterns)) {
        matched = true;
        domainScores[rule.domain] = (domainScores[rule.domain] || 0) + field.weight;
      }
    }
    if (matched) applicationDomainTags.push(rule.tag);
  }

  return {
    methodTags: uniqueSorted(methodTags),
    methodFamilyTags: uniqueSorted(methodFamilyTags),
    applicationDomainTags: uniqueSorted(applicationDomainTags),
    dominantApplicationDomain: chooseDominantDomain(domainScores)
  };
}

function chooseDominantDomain(scores) {
  const entries = Object.entries(scores).filter(([, score]) => score > 0);
  if (!entries.length) return "";
  const priorities = Object.fromEntries(TAXONOMY.domainNodes.map((node) => [node.id, node.priority]));
  entries.sort((a, b) => b[1] - a[1] || (priorities[a[0]] || 99) - (priorities[b[0]] || 99));
  return entries[0][0];
}

export function buildSummary(record, methods, domains) {
  const abstract = stripHtml(record.abstract || "");
  const sentences = abstract
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
  const lead = sentences.slice(0, 2).join(" ");
  const fallback = record.subTitle ? `${record.title}: ${record.subTitle}.` : `${record.title}.`;
  const methodLine = methods.length ? `Methods signalled: ${methods.slice(0, 4).join(", ")}.` : "";
  const domainLine = domains.length ? `Application domains: ${domains.slice(0, 4).join(", ")}.` : "";
  const summary = [lead || fallback, methodLine, domainLine].filter(Boolean).join(" ");
  return summary.length > 850 ? `${summary.slice(0, 847).trim()}...` : summary;
}

export function getTaxonomy() {
  return TAXONOMY;
}
