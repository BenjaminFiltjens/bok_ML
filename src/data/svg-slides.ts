import { DEFAULT_BOK_SLUG } from "./bok-content";

export type SvgSectionCategory = "overview" | "learning-strategy" | "method-family" | "emerging-paradigm";

export type SvgSlide = {
  title: string;
  file: string;
  alt: string;
};

export type SvgSection = {
  slug: string;
  title: string;
  shortTitle: string;
  category: SvgSectionCategory;
  overviewSlug: string;
  slides: SvgSlide[];
};

export const SVG_VENN_SLIDE: SvgSlide = {
  title: "Machine Learning Venn Diagram",
  file: "venn_outlined.svg",
  alt: "Venn diagram overview of machine learning, deep learning, foundation models, generative AI, learning strategies, and TBM domains."
};

export const SVG_SECTIONS: SvgSection[] = [
  {
    slug: "machine-learning",
    title: "Machine Learning",
    shortTitle: "Machine Learning",
    category: "overview",
    overviewSlug: "machine-learning",
    slides: [
      {
        title: "Machine Learning Pipeline",
        file: "ML_pipeline_slide1_outlined.svg",
        alt: "Machine learning pipeline slide showing how data, models, training, and evaluation connect."
      },
      {
        title: "Machine Learning Terms",
        file: "ML_terms_slide2_outlined.svg",
        alt: "Machine learning terms slide explaining features, labels, models, training, validation, and prediction."
      }
    ]
  },
  {
    slug: "supervised-learning",
    title: "Supervised Learning",
    shortTitle: "Supervised",
    category: "learning-strategy",
    overviewSlug: "supervised-learning",
    slides: [
      {
        title: "Supervised Learning Terms",
        file: "SL_pipeline_terms_slide1_outlined.svg",
        alt: "Supervised learning slide explaining inputs, known labels, model training, and prediction."
      },
      {
        title: "Supervised Learning Examples",
        file: "SL_pipeline_examples_slide2_outlined.svg",
        alt: "Supervised learning examples slide with regression, classification, and forecasting examples."
      }
    ]
  },
  {
    slug: "unsupervised-learning",
    title: "Unsupervised Learning",
    shortTitle: "Unsupervised",
    category: "learning-strategy",
    overviewSlug: "unsupervised-learning",
    slides: [
      {
        title: "Unsupervised Learning Terms",
        file: "UL_pipeline_terms_slide1_outlined.svg",
        alt: "Unsupervised learning slide explaining pattern discovery without labels."
      },
      {
        title: "Unsupervised Learning Examples",
        file: "UL_pipeline_examples_slide2_outlined.svg",
        alt: "Unsupervised learning examples slide with clustering, dimensionality reduction, and topic discovery examples."
      }
    ]
  },
  {
    slug: "self-supervised-learning",
    title: "Self-Supervised Learning",
    shortTitle: "Self-Supervised",
    category: "learning-strategy",
    overviewSlug: "machine-learning",
    slides: [
      {
        title: "Self-Supervised Learning Terms",
        file: "SSL_pipeline_terms_slide1_outlined.svg",
        alt: "Self-supervised learning slide explaining how models create training signals from raw data."
      }
    ]
  },
  {
    slug: "reinforcement-learning",
    title: "Reinforcement Learning",
    shortTitle: "Reinforcement",
    category: "learning-strategy",
    overviewSlug: "reinforcement-learning",
    slides: [
      {
        title: "Reinforcement Learning Pipeline",
        file: "RL_pipeline_slide1_outlined.svg",
        alt: "Reinforcement learning pipeline slide showing agent, actions, environment, rewards, and policy learning."
      },
      {
        title: "Reinforcement Learning Examples",
        file: "RL_pipeline_examples_slide2_outlined.svg",
        alt: "Reinforcement learning examples slide with sequential decision and control examples."
      }
    ]
  },
  {
    slug: "feature-based-ml",
    title: "Classical Machine Learning",
    shortTitle: "Classical ML",
    category: "method-family",
    overviewSlug: "machine-learning",
    slides: [
      {
        title: "Classical Machine Learning",
        file: "ML_classical_slide1_outlined.svg",
        alt: "Classical machine learning slide explaining predefined tabular features and traditional model families."
      }
    ]
  },
  {
    slug: "deep-learning",
    title: "Deep Learning",
    shortTitle: "Deep Learning",
    category: "method-family",
    overviewSlug: "deep-learning",
    slides: [
      {
        title: "Deep Learning",
        file: "ML_deep_slide1_outlined.svg",
        alt: "Deep learning slide explaining learned representations from raw or high-dimensional data."
      }
    ]
  },
  {
    slug: "foundation-models",
    title: "Foundation Models",
    shortTitle: "Foundation",
    category: "emerging-paradigm",
    overviewSlug: "foundation-models",
    slides: [
      {
        title: "Foundation Models",
        file: "ML_foundation_slide1_outlined.svg",
        alt: "Foundation models slide explaining broad pretraining and adaptation to downstream tasks."
      }
    ]
  },
  {
    slug: "generative-ai",
    title: "Generative AI",
    shortTitle: "GenAI",
    category: "emerging-paradigm",
    overviewSlug: "generative-ai",
    slides: [
      {
        title: "Generative AI",
        file: "ML_genAI_slide1_outlined.svg",
        alt: "Generative AI slide explaining models that create text, images, code, or other outputs."
      }
    ]
  }
];

export const SVG_SECTION_ORDER = SVG_SECTIONS.map((section) => section.slug);

export const SVG_SECTION_BY_SLUG = new Map(SVG_SECTIONS.map((section) => [section.slug, section]));

export function hasSvgSection(slug?: string): boolean {
  return SVG_SECTION_BY_SLUG.has(slug || "");
}

export function getSvgSection(slug?: string): SvgSection {
  return SVG_SECTION_BY_SLUG.get(slug || "") || SVG_SECTION_BY_SLUG.get(DEFAULT_BOK_SLUG) || SVG_SECTIONS[0];
}

export function getSvgSectionIndex(slug?: string): number {
  const index = SVG_SECTION_ORDER.indexOf(getSvgSection(slug).slug);
  return index >= 0 ? index : 0;
}

export function getNextSvgSection(slug?: string): SvgSection | undefined {
  const index = getSvgSectionIndex(slug);
  return SVG_SECTIONS[index + 1];
}

export function getPreviousSvgSection(slug?: string): SvgSection | undefined {
  const index = getSvgSectionIndex(slug);
  return index > 0 ? SVG_SECTIONS[index - 1] : undefined;
}

export function svgSlideAsset(file: string): string {
  const base = import.meta.env.BASE_URL.endsWith("/") ? import.meta.env.BASE_URL : `${import.meta.env.BASE_URL}/`;
  return `${base}assets/outlined_svgs/${file}`;
}
