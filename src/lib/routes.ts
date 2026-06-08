import { DEFAULT_BOK_SLUG } from "../data/bok-content";

export type SlideNumber = number;

export type AppRoute = { page: "theses" } | { page: "overview"; slug?: string } | { page: "learn"; slug: string; slide: SlideNumber };

function parseSlide(value?: string): SlideNumber {
  const parsed = Number(value);
  if (Number.isInteger(parsed) && parsed > 0) return parsed;
  return 1;
}

export function parseRouteHash(hash: string): AppRoute {
  const path = hash.replace(/^#/, "").replace(/^\/+/, "");
  const [page, rawSlug, rawSlide] = path.split("/").filter(Boolean);

  if (page === "overview") {
    return { page: "overview", slug: rawSlug || DEFAULT_BOK_SLUG };
  }

  if (page === "learn") {
    return { page: "learn", slug: rawSlug || DEFAULT_BOK_SLUG, slide: parseSlide(rawSlide) };
  }

  if (page === "demo") {
    return { page: "learn", slug: rawSlug || DEFAULT_BOK_SLUG, slide: 1 };
  }

  return { page: "theses" };
}

export function routeToHash(route: AppRoute): string {
  if (route.page === "overview") {
    return route.slug ? `#overview/${route.slug}` : "#overview";
  }
  if (route.page === "learn") {
    return `#learn/${route.slug}/${route.slide}`;
  }
  return "#theses";
}
