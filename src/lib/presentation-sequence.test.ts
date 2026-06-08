import { describe, expect, it } from "vitest";
import { getNextPresentationRoute, getPreviousPresentationRoute } from "./presentation-sequence";

describe("presentation sequence", () => {
  it("advances through the intended teaching order", () => {
    expect(getNextPresentationRoute({ page: "learn", slug: "machine-learning", slide: 2 })).toEqual({ page: "overview", slug: "supervised-learning" });
    expect(getNextPresentationRoute({ page: "overview", slug: "supervised-learning" })).toEqual({ page: "learn", slug: "supervised-learning", slide: 1 });
    expect(getNextPresentationRoute({ page: "learn", slug: "supervised-learning", slide: 2 })).toEqual({ page: "learn", slug: "unsupervised-learning", slide: 1 });
    expect(getNextPresentationRoute({ page: "learn", slug: "unsupervised-learning", slide: 2 })).toEqual({ page: "learn", slug: "self-supervised-learning", slide: 1 });
    expect(getNextPresentationRoute({ page: "learn", slug: "reinforcement-learning", slide: 2 })).toEqual({ page: "overview", slug: "feature-based-ml" });
    expect(getNextPresentationRoute({ page: "overview", slug: "feature-based-ml" })).toEqual({ page: "learn", slug: "feature-based-ml", slide: 1 });
    expect(getNextPresentationRoute({ page: "learn", slug: "foundation-models", slide: 1 })).toEqual({ page: "learn", slug: "generative-ai", slide: 1 });
  });

  it("moves backward across Venn stops and section boundaries", () => {
    expect(getPreviousPresentationRoute({ page: "overview", slug: "supervised-learning" })).toEqual({ page: "learn", slug: "machine-learning", slide: 2 });
    expect(getPreviousPresentationRoute({ page: "learn", slug: "unsupervised-learning", slide: 1 })).toEqual({ page: "learn", slug: "supervised-learning", slide: 2 });
    expect(getPreviousPresentationRoute({ page: "overview", slug: "feature-based-ml" })).toEqual({ page: "learn", slug: "reinforcement-learning", slide: 2 });
    expect(getPreviousPresentationRoute({ page: "learn", slug: "generative-ai", slide: 1 })).toEqual({ page: "learn", slug: "foundation-models", slide: 1 });
  });
});
