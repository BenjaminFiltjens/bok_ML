import { describe, expect, it } from "vitest";
import { classifyText, stripHtml } from "./taxonomy.mjs";
import { extractYear, normalizeRecord, stripRecordPrefix } from "./harvest.mjs";

describe("taxonomy helpers", () => {
  it("strips common repository HTML from abstracts", () => {
    expect(stripHtml("<p>Machine&nbsp;learning<br/>for &amp; policy</p>")).toBe("Machine learning for & policy");
  });

  it("detects method and domain tags", () => {
    const tags = classifyText("A k-means clustering model for hydrogen refueling station logistics.");
    expect(tags.methods).toContain("Clustering");
    expect(tags.methodFamilies).toContain("Machine Learning");
    expect(tags.methodFamilies).toContain("Unsupervised learning");
    expect(tags.domains).toContain("Energy");
    expect(tags.domains).toContain("Transport and logistics");
  });

  it("keeps foundation and generative models under deep learning", () => {
    const foundation = classifyText("A large language model with transformer pretraining for public services.");
    expect(foundation.methodFamilies).toEqual(expect.arrayContaining(["Machine Learning", "Deep Learning", "Foundation Models"]));
    const generative = classifyText("A generative AI diffusion model for synthetic records.");
    expect(generative.methodFamilies).toEqual(expect.arrayContaining(["Machine Learning", "Deep Learning", "Foundation Models", "Generative AI"]));
  });

  it("maps health applications into SDM and ICT examples into ICT", () => {
    expect(classifyText("Clinical monitoring and patient decision support for a hospital.").dominantDomain).toBe("SDM");
    expect(classifyText("Cybersecurity agents for cloud software platforms.").dominantDomain).toBe("ICT");
  });
});

describe("harvest normalization", () => {
  it("normalizes identifiers and publication years", () => {
    expect(stripRecordPrefix("Thing_abc")).toBe("abc");
    expect(stripRecordPrefix("uuid:def")).toBe("def");
    expect(extractYear("Graduation Date 16-07-2025")).toBe("2025");
  });

  it("creates a complete included record from summary metadata", () => {
    const summary = {
      thingID: "Thing_002f23e0-99c5-463e-850b-ec4986774cc8",
      title: "The Optimal European Hydrogen Refueling Station Network for Heavy Duty Trucks",
      description: "The design clusters truck datapoints using k-means clustering for hydrogen logistics.",
      object_type: "master thesis",
      publication_date: "2022",
      contributors: ["A. Researcher"]
    };
    const { record, isMachineLearning } = normalizeRecord(summary, null, { include: [], exclude: [], records: {} });
    expect(isMachineLearning).toBe(true);
    expect(record.title).toBe(summary.title);
    expect(record.repositoryUrl).toContain("/record/uuid:002f23e0-99c5-463e-850b-ec4986774cc8");
    expect(record.methodTags).toContain("Clustering");
    expect(record.methodFamilyTags).toContain("Unsupervised learning");
    expect(record.applicationDomainTags).toContain("Energy");
    expect(record.dominantApplicationDomain).toBe("TLO");
  });

  it("uses the matched ESS co-author section for the dominant domain", () => {
    const summary = {
      thingID: "Thing_advisor-section-test",
      title: "Machine learning for cloud software monitoring",
      description: "The work studies machine learning for cloud software platforms.",
      object_type: "master thesis",
      publication_date: "2025",
      contributors: ["A. Student", "S. van Cranenburgh"]
    };
    const advisorSections = {
      aliases: {},
      sectionDomains: { "Transport and Logistics": "TLO" },
      staff: {
        "S. van Cranenburgh": {
          section: "Transport and Logistics",
          domain: "TLO",
          sourceUrl: "https://research.tudelft.nl/en/persons/s-van-cranenburgh/"
        }
      }
    };
    const essStaff = {
      staff: [
        {
          displayName: "S. van Cranenburgh",
          aliases: ["S. van Cranenburgh", "Sander van Cranenburgh"],
          section: "Transport and Logistics",
          domain: "TLO",
          sectionSource: "https://www.tudelft.nl/staff/s.vancranenburgh/"
        }
      ]
    };
    const { record, isMachineLearning, isIncluded } = normalizeRecord(summary, null, { include: [], exclude: [], records: {} }, advisorSections, essStaff);
    expect(isMachineLearning).toBe(true);
    expect(isIncluded).toBe(true);
    expect(record.lastContributor).toBe("S. van Cranenburgh");
    expect(record.essContributor).toBe("S. van Cranenburgh");
    expect(record.essSection).toBe("Transport and Logistics");
    expect(record.dominantApplicationDomain).toBe("TLO");
    expect(record.dominantApplicationDomainSource).toBe("ess-section");
  });

  it("excludes ML records without a matched ESS co-author when an ESS list is provided", () => {
    const summary = {
      thingID: "Thing_no-ess-test",
      title: "Machine learning for cloud software monitoring",
      description: "The work studies machine learning for cloud software platforms.",
      object_type: "journal article",
      publication_date: "2025",
      contributors: ["A. Student", "External Supervisor"]
    };
    const essStaff = { staff: [{ displayName: "S. van Cranenburgh", aliases: ["S. van Cranenburgh"], section: "Transport and Logistics", domain: "TLO" }] };
    const { isMachineLearning, isIncluded, exclusionReason } = normalizeRecord(summary, null, { include: [], exclude: [], records: {} }, {}, essStaff);
    expect(isMachineLearning).toBe(true);
    expect(isIncluded).toBe(false);
    expect(exclusionReason).toBe("no-ess-contributor");
  });
});
