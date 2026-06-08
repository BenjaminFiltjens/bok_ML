import { describe, expect, it } from "vitest";
import { DEFAULT_BOK_SLUG } from "../data/bok-content";
import { parseRouteHash, routeToHash } from "./routes";

describe("hash routing", () => {
  it("defaults to the thesis explorer", () => {
    expect(parseRouteHash("")).toEqual({ page: "theses" });
    expect(parseRouteHash("#theses")).toEqual({ page: "theses" });
    expect(parseRouteHash("#unknown")).toEqual({ page: "theses" });
  });

  it("parses overview routes with a default concept", () => {
    expect(parseRouteHash("#overview")).toEqual({ page: "overview", slug: DEFAULT_BOK_SLUG });
    expect(parseRouteHash("#overview/deep-learning")).toEqual({ page: "overview", slug: "deep-learning" });
  });

  it("parses learn routes with a default concept and slide", () => {
    expect(parseRouteHash("#learn")).toEqual({ page: "learn", slug: DEFAULT_BOK_SLUG, slide: 1 });
    expect(parseRouteHash("#learn/supervised-learning/3")).toEqual({ page: "learn", slug: "supervised-learning", slide: 3 });
    expect(parseRouteHash("#learn/supervised-learning/9")).toEqual({ page: "learn", slug: "supervised-learning", slide: 9 });
    expect(parseRouteHash("#learn/supervised-learning/nope")).toEqual({ page: "learn", slug: "supervised-learning", slide: 1 });
  });

  it("keeps old demo hashes as learn-route aliases", () => {
    expect(parseRouteHash("#demo")).toEqual({ page: "learn", slug: DEFAULT_BOK_SLUG, slide: 1 });
    expect(parseRouteHash("#demo/supervised-learning")).toEqual({ page: "learn", slug: "supervised-learning", slide: 1 });
  });

  it("serializes routes to shareable hashes", () => {
    expect(routeToHash({ page: "theses" })).toBe("#theses");
    expect(routeToHash({ page: "overview", slug: "generative-ai" })).toBe("#overview/generative-ai");
    expect(routeToHash({ page: "overview" })).toBe("#overview");
    expect(routeToHash({ page: "learn", slug: "reinforcement-learning", slide: 4 })).toBe("#learn/reinforcement-learning/4");
  });
});
