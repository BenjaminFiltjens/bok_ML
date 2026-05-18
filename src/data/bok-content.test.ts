import { describe, expect, it } from "vitest";
import taxonomy from "../../data/taxonomy.json";
import { BOK_BY_ID, BOK_ELEMENTS, DEFAULT_BOK_SLUG, getBokElementBySlug } from "./bok-content";
import { TAXONOMY_HOTSPOTS } from "./venn-hotspots";

describe("BoK overview content", () => {
  it("covers every interactive Venn hotspot", () => {
    const contentIds = new Set(BOK_ELEMENTS.map((element) => element.id));
    expect(TAXONOMY_HOTSPOTS.map((hotspot) => hotspot.id).sort()).toEqual([...contentIds].sort());
  });

  it("uses ids from the taxonomy nodes", () => {
    const taxonomyIds = new Set([...taxonomy.methodNodes.map((node) => node.id), ...taxonomy.domainNodes.map((node) => node.id)]);
    for (const element of BOK_ELEMENTS) {
      expect(taxonomyIds.has(element.id)).toBe(true);
    }
  });

  it("keeps slugs unique and provides a default fallback", () => {
    const slugs = BOK_ELEMENTS.map((element) => element.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(getBokElementBySlug()).toBe(getBokElementBySlug(DEFAULT_BOK_SLUG));
    expect(getBokElementBySlug("not-a-real-slug").slug).toBe(DEFAULT_BOK_SLUG);
  });

  it("links only to known related elements", () => {
    for (const element of BOK_ELEMENTS) {
      for (const relatedId of element.relatedIds) {
        expect(BOK_BY_ID.has(relatedId)).toBe(true);
      }
    }
  });
});
