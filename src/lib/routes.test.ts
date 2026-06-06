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

  it("parses demo routes with a default concept", () => {
    expect(parseRouteHash("#demo")).toEqual({ page: "demo", slug: DEFAULT_BOK_SLUG });
    expect(parseRouteHash("#demo/supervised-learning")).toEqual({ page: "demo", slug: "supervised-learning" });
  });

  it("serializes routes to shareable hashes", () => {
    expect(routeToHash({ page: "theses" })).toBe("#theses");
    expect(routeToHash({ page: "overview", slug: "generative-ai" })).toBe("#overview/generative-ai");
    expect(routeToHash({ page: "demo", slug: "reinforcement-learning" })).toBe("#demo/reinforcement-learning");
  });
});
