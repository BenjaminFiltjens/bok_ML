import { getSvgSection } from "../data/svg-slides";
import { type AppRoute } from "./routes";

const PRESENTATION_STEPS: AppRoute[] = [
  { page: "learn", slug: "machine-learning", slide: 1 },
  { page: "learn", slug: "machine-learning", slide: 2 },
  { page: "overview", slug: "supervised-learning" },
  { page: "learn", slug: "supervised-learning", slide: 1 },
  { page: "learn", slug: "supervised-learning", slide: 2 },
  { page: "learn", slug: "unsupervised-learning", slide: 1 },
  { page: "learn", slug: "unsupervised-learning", slide: 2 },
  { page: "learn", slug: "self-supervised-learning", slide: 1 },
  { page: "learn", slug: "reinforcement-learning", slide: 1 },
  { page: "learn", slug: "reinforcement-learning", slide: 2 },
  { page: "overview", slug: "feature-based-ml" },
  { page: "learn", slug: "feature-based-ml", slide: 1 },
  { page: "learn", slug: "deep-learning", slide: 1 },
  { page: "learn", slug: "foundation-models", slide: 1 },
  { page: "learn", slug: "generative-ai", slide: 1 }
];

function routesMatch(left: AppRoute, right: AppRoute): boolean {
  if (left.page !== right.page) return false;
  if (left.page === "theses" || right.page === "theses") return true;
  if (left.page === "overview" && right.page === "overview") return left.slug === right.slug;
  if (left.page === "learn" && right.page === "learn") return left.slug === right.slug && left.slide === right.slide;
  return false;
}

function normalizeLearnRoute(route: AppRoute): AppRoute {
  if (route.page !== "learn") return route;
  const section = getSvgSection(route.slug);
  const slide = Math.min(Math.max(1, route.slide), section.slides.length);
  return { page: "learn", slug: section.slug, slide };
}

function findStepIndex(route: AppRoute): number {
  const normalized = normalizeLearnRoute(route);
  return PRESENTATION_STEPS.findIndex((step) => routesMatch(step, normalized));
}

export function getNextPresentationRoute(route: AppRoute): AppRoute {
  const stepIndex = findStepIndex(route);
  if (stepIndex >= 0) {
    return PRESENTATION_STEPS[Math.min(stepIndex + 1, PRESENTATION_STEPS.length - 1)];
  }

  if (route.page === "overview") {
    return { page: "learn", slug: getSvgSection(route.slug).slug, slide: 1 };
  }

  return route;
}

export function getPreviousPresentationRoute(route: AppRoute): AppRoute {
  const stepIndex = findStepIndex(route);
  if (stepIndex >= 0) {
    return PRESENTATION_STEPS[Math.max(stepIndex - 1, 0)];
  }

  if (route.page === "overview") {
    const section = getSvgSection(route.slug);
    return { page: "learn", slug: section.slug, slide: section.slides.length };
  }

  return route;
}

export function isPresentationRoute(route: AppRoute): boolean {
  return findStepIndex(route) >= 0 || route.page === "overview";
}
