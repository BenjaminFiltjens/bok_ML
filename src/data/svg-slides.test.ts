import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { SVG_SECTIONS, SVG_SECTION_ORDER, SVG_VENN_SLIDE } from "./svg-slides";

describe("SVG slide manifest", () => {
  it("keeps the intended section order", () => {
    expect(SVG_SECTION_ORDER).toEqual([
      "machine-learning",
      "supervised-learning",
      "self-supervised-learning",
      "unsupervised-learning",
      "reinforcement-learning",
      "feature-based-ml",
      "deep-learning",
      "foundation-models",
      "generative-ai"
    ]);
  });

  it("uses every exported SVG slide asset", () => {
    const files = new Set([SVG_VENN_SLIDE.file, ...SVG_SECTIONS.flatMap((section) => section.slides.map((slide) => slide.file))]);
    expect(files.size).toBe(14);

    for (const file of files) {
      expect(existsSync(path.join(process.cwd(), "public", "assets", "outlined_svgs", file))).toBe(true);
    }
  });

  it("keeps section slugs unique", () => {
    const sectionSlugs = SVG_SECTIONS.map((section) => section.slug);
    expect(new Set(sectionSlugs).size).toBe(sectionSlugs.length);
  });
});
