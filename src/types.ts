export interface ThesisFile {
  name: string;
  path: string;
  extension: string;
  pages: string;
  size: string;
  downloadsCounter: string;
  isAccessible: boolean;
  accessLevel: string;
  networkLevel: string;
  embargo: string;
}

export interface ThesisRecord {
  id: string;
  thingId: string;
  title: string;
  subTitle: string;
  year: string;
  objectType: string;
  recordCategory: "thesis" | "article" | "other";
  authors: string[];
  contributors: string[];
  programme: string;
  abstract: string;
  summary: string;
  keywords: string[];
  methodTags: string[];
  methodFamilyTags: string[];
  dominantApplicationDomain: string;
  dominantApplicationDomainSource?: string;
  applicationDomainTags: string[];
  domainTags: string[];
  lastContributor?: string;
  essContributor?: string;
  essContributors?: string[];
  essSection?: string;
  essSectionSource?: string;
  advisorSection?: string;
  advisorSectionSource?: string;
  repositoryUrl: string;
  resolverUrl: string;
  files: ThesisFile[];
  hasPublicFile: boolean;
}

export interface ThesisDataset {
  generatedAt: string;
  source: {
    organisationId: string;
    organisationName: string;
    apiBase: string;
    note: string;
  };
  harvest?: {
    indexComplete: boolean;
    objectTypes: string[];
    thesisObjectTypes?: string[];
    articleObjectTypes?: string[];
    includeArticles?: boolean;
    pageSize: number;
    indexLimit: number;
    detailMode: "index-only" | "candidate-details" | "all-details";
    detailCandidates: number;
    detailsFetched: number;
    detailFailures: number;
    essStaff?: {
      sourceUrl: string;
      generatedAt: string;
      staffFound: number;
      staffWithSection: number;
    };
    note: string;
    indexPages: Array<{
      objectType: string;
      complete: boolean;
      stopReason: string;
      recordsHarvested: number;
      pages: Array<{
        offset: number;
        count: number;
      }>;
    }>;
  };
  stats: {
    totalHarvested: number;
    totalCandidates?: number;
    totalIncluded: number;
    exclusionCounts?: Record<string, number>;
    byType: Record<string, number>;
    byCategory?: Record<string, number>;
    methodCounts: Record<string, number>;
    methodFamilyCounts?: Record<string, number>;
    domainCounts: Record<string, number>;
    domainSourceCounts?: Record<string, number>;
    essSectionCounts?: Record<string, number>;
    essContributorCounts?: Record<string, number>;
    applicationDomainCounts?: Record<string, number>;
  };
  records: ThesisRecord[];
}

export interface ExplorerFilters {
  query: string;
  objectType: string;
  year: string;
  programme: string;
  methodNode: string;
  domainNode: string;
  contributor: string;
  availability: "all" | "public";
  includeArticles: boolean;
  sort: "relevance" | "year-desc" | "year-asc" | "title";
}
