import { ArrowLeft, ChevronLeft, ChevronRight, Home, Maximize2 } from "lucide-react";
import { useEffect } from "react";
import { getSvgSection, svgSlideAsset, SVG_SECTION_ORDER, SVG_SECTIONS } from "../data/svg-slides";
import { getNextPresentationRoute, getPreviousPresentationRoute } from "../lib/presentation-sequence";
import { routeToHash, type SlideNumber } from "../lib/routes";

function isFormTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return ["INPUT", "SELECT", "TEXTAREA", "BUTTON", "A"].includes(target.tagName);
}

function categoryLabel(category: string): string {
  if (category === "learning-strategy") return "Learning strategy";
  if (category === "method-family") return "Method family";
  if (category === "emerging-paradigm") return "Emerging paradigm";
  return "Taxonomy overview";
}

function clampSlide(slide: SlideNumber, totalSlides: number): number {
  return Math.min(Math.max(1, slide), totalSlides);
}

function toggleFullscreen() {
  if (document.fullscreenElement) {
    void document.exitFullscreen?.();
    return;
  }
  void document.documentElement.requestFullscreen?.();
}

export function BokPresentationPage({ slug, slide }: { slug: string; slide: SlideNumber }) {
  const section = getSvgSection(slug);
  const currentSlideNumber = clampSlide(slide, section.slides.length);
  const currentSlide = section.slides[currentSlideNumber - 1];
  const sectionIndex = SVG_SECTION_ORDER.indexOf(section.slug);
  const previousSection = sectionIndex > 0 ? SVG_SECTIONS[sectionIndex - 1] : undefined;
  const nextSection = sectionIndex >= 0 ? SVG_SECTIONS[sectionIndex + 1] : undefined;
  const overviewHash = routeToHash({ page: "overview", slug: section.overviewSlug });
  const currentRoute = { page: "learn", slug: section.slug, slide: currentSlideNumber } as const;

  function goToOverview() {
    window.location.hash = overviewHash;
  }

  function advance() {
    window.location.hash = routeToHash(getNextPresentationRoute(currentRoute));
  }

  function previous() {
    window.location.hash = routeToHash(getPreviousPresentationRoute(currentRoute));
  }

  useEffect(() => {
    if (section.slug !== slug || currentSlideNumber !== slide) {
      window.location.hash = routeToHash({ page: "learn", slug: section.slug, slide: currentSlideNumber });
    }
  }, [currentSlideNumber, section.slug, slide, slug]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (isFormTarget(event.target)) return;
      if (event.key === "ArrowRight" || event.key === "PageDown" || event.key === " ") {
        event.preventDefault();
        advance();
      }
      if (event.key === "ArrowLeft" || event.key === "PageUp") {
        event.preventDefault();
        previous();
      }
      if (event.key === "Escape" || event.key === "Home") {
        event.preventDefault();
        goToOverview();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  return (
    <section className="svg-slide-page" aria-label={`${section.title} slides`}>
      <div className="svg-slide-toolbar">
        <a className="demo-back-link" href={overviewHash}>
          <ArrowLeft aria-hidden="true" />
          Venn diagram
        </a>
        <div className="svg-slide-title">
          <p className="eyebrow">{categoryLabel(section.category)}</p>
          <h2>{section.title}</h2>
        </div>
        <span className="svg-slide-progress" aria-label={`Slide ${currentSlideNumber} of ${section.slides.length}`}>
          {currentSlideNumber} / {section.slides.length}
        </span>
        <button className="demo-button ghost svg-fullscreen-button" type="button" onClick={toggleFullscreen}>
          <Maximize2 aria-hidden="true" />
          Full screen
        </button>
      </div>

      <button className="svg-slide-stage" type="button" onClick={advance} aria-label="Advance slide">
        <img className="svg-slide-image" src={svgSlideAsset(currentSlide.file)} alt={currentSlide.alt} />
      </button>

      <div className="svg-slide-controls" aria-label="Slide navigation">
        <button type="button" className="demo-button ghost" onClick={previous}>
          <ChevronLeft aria-hidden="true" />
          Previous
        </button>
        <div className="svg-section-jump">
          {previousSection ? <a href={routeToHash({ page: "learn", slug: previousSection.slug, slide: 1 })}>{previousSection.shortTitle}</a> : null}
          <a className="active" href={routeToHash({ page: "learn", slug: section.slug, slide: currentSlideNumber })}>
            {section.shortTitle}
          </a>
          {nextSection ? <a href={routeToHash({ page: "learn", slug: nextSection.slug, slide: 1 })}>{nextSection.shortTitle}</a> : null}
        </div>
        <button type="button" className="demo-button primary" onClick={advance}>
          Next
          {section.slug === "generative-ai" && currentSlideNumber === section.slides.length ? <Home aria-hidden="true" /> : <ChevronRight aria-hidden="true" />}
        </button>
      </div>
    </section>
  );
}
