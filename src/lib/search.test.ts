import { describe, expect, it } from "vitest";
import { applyFilters, countTerms, textMatches } from "./search";
import type { ExplorerFilters, ThesisRecord } from "../types";

const baseFilters: ExplorerFilters = {
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

const records: ThesisRecord[] = [
  {
    id: "1",
    thingId: "Thing_1",
    title: "Large Language Models in Banking",
    subTitle: "",
    year: "2025",
    objectType: "master thesis",
    recordCategory: "thesis",
    authors: ["Ada"],
    contributors: ["Grace"],
    programme: "MOT",
    abstract: "LLM adoption in banks",
    summary: "Large language models for financial decision support.",
    keywords: ["LLM"],
    methodTags: ["Foundation models", "Transformers"],
    methodFamilyTags: ["Machine Learning", "Deep Learning", "Foundation Models"],
    dominantApplicationDomain: "ICT",
    applicationDomainTags: ["Finance", "Natural language systems"],
    domainTags: ["Finance", "Natural language systems"],
    repositoryUrl: "#",
    resolverUrl: "#",
    files: [],
    hasPublicFile: true
  },
  {
    id: "2",
    thingId: "Thing_2",
    title: "Hydrogen Refueling Network",
    subTitle: "",
    year: "2022",
    objectType: "master thesis",
    recordCategory: "thesis",
    authors: ["Lin"],
    contributors: [],
    programme: "EPA",
    abstract: "K-means clustering for heavy duty trucks",
    summary: "Clustering for hydrogen station planning.",
    keywords: ["k-means"],
    methodTags: ["Clustering"],
    methodFamilyTags: ["Machine Learning", "Unsupervised learning"],
    dominantApplicationDomain: "TLO",
    applicationDomainTags: ["Energy", "Transport and logistics"],
    domainTags: ["Energy", "Transport and logistics"],
    repositoryUrl: "#",
    resolverUrl: "#",
    files: [],
    hasPublicFile: false
  },
  {
    id: "3",
    thingId: "Thing_3",
    title: "Deep Learning for Digital Platforms",
    subTitle: "",
    year: "2024",
    objectType: "journal article",
    recordCategory: "article",
    authors: ["Rita"],
    contributors: ["Yuri"],
    programme: "",
    abstract: "Deep learning for platform governance",
    summary: "Deep learning in ICT.",
    keywords: ["deep learning"],
    methodTags: ["CNNs"],
    methodFamilyTags: ["Machine Learning", "Deep Learning"],
    dominantApplicationDomain: "ICT",
    applicationDomainTags: ["Cloud and software platforms"],
    domainTags: ["Cloud and software platforms"],
    repositoryUrl: "#",
    resolverUrl: "#",
    files: [],
    hasPublicFile: true
  }
];

describe("explorer filters", () => {
  it("searches title, tags, people, and abstracts", () => {
    expect(textMatches(records[0], "banking grace")).toBe(true);
    expect(textMatches(records[1], "k-means trucks")).toBe(true);
  });

  it("filters by taxonomy method family and dominant domain", () => {
    const filtered = applyFilters(records, { ...baseFilters, methodNode: "Unsupervised learning", domainNode: "TLO" });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe("2");
  });

  it("treats deep learning as a subset of machine learning", () => {
    expect(applyFilters(records, { ...baseFilters, methodNode: "Machine Learning" })).toHaveLength(2);
    expect(applyFilters(records, { ...baseFilters, methodNode: "Machine Learning", includeArticles: true })).toHaveLength(3);
    expect(applyFilters(records, { ...baseFilters, methodNode: "Deep Learning" }).map((record) => record.id)).toEqual(["1"]);
    expect(applyFilters(records, { ...baseFilters, methodNode: "Foundation Models" }).map((record) => record.id)).toEqual(["1"]);
  });

  it("hides articles until the article opt-in is enabled", () => {
    expect(applyFilters(records, baseFilters).map((record) => record.id)).toEqual(["1", "2"]);
    expect(applyFilters(records, { ...baseFilters, includeArticles: true }).map((record) => record.id)).toEqual(["1", "3", "2"]);
  });

  it("combines ICT and deep learning taxonomy filters", () => {
    const filtered = applyFilters(records, { ...baseFilters, methodNode: "Deep Learning", domainNode: "ICT" });
    expect(filtered.map((record) => record.id)).toEqual(["1"]);
  });

  it("filters public files when availability is selected", () => {
    const filtered = applyFilters(records, { ...baseFilters, availability: "public" });
    expect(filtered.map((record) => record.id)).toEqual(["1"]);
  });

  it("counts method terms", () => {
    expect(countTerms(records.filter((record) => record.recordCategory === "thesis"), "methodTags")).toEqual([
      { label: "Clustering", count: 1 },
      { label: "Foundation models", count: 1 },
      { label: "Transformers", count: 1 }
    ]);
  });
});
