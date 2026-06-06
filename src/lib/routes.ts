import { DEFAULT_BOK_SLUG } from "../data/bok-content";

export type AppRoute = { page: "theses" } | { page: "overview"; slug: string } | { page: "demo"; slug: string };

export function parseRouteHash(hash: string): AppRoute {
  const path = hash.replace(/^#/, "").replace(/^\/+/, "");
  const [page, rawSlug] = path.split("/").filter(Boolean);

  if (page === "overview") {
    return { page: "overview", slug: rawSlug || DEFAULT_BOK_SLUG };
  }

  if (page === "demo") {
    return { page: "demo", slug: rawSlug || DEFAULT_BOK_SLUG };
  }

  return { page: "theses" };
}

export function routeToHash(route: AppRoute): string {
  if (route.page === "overview") {
    return `#overview/${route.slug}`;
  }
  if (route.page === "demo") {
    return `#demo/${route.slug}`;
  }
  return "#theses";
}
