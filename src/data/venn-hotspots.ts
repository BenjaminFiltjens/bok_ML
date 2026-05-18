export type TaxonomyHotspot = {
  id: string;
  label: string;
  elementId: string;
  kind: "method" | "domain";
  countX: number;
  countY: number;
  target?: {
    type: "ellipse" | "rectangle";
    x: number;
    y: number;
    width: number;
    height: number;
    rx?: number;
  };
};

export const TAXONOMY_HOTSPOTS: TaxonomyHotspot[] = [
  {
    id: "Machine Learning",
    label: "Machine Learning",
    elementId: "Bps2xFq2",
    kind: "method",
    countX: 1248,
    countY: 262,
    target: { type: "rectangle", x: 760, y: 72, width: 540, height: 210, rx: 28 }
  },
  {
    id: "Deep Learning",
    label: "Deep Learning",
    elementId: "B0qF6tFv",
    kind: "method",
    countX: 1215,
    countY: 392,
    target: { type: "ellipse", x: 790, y: 282, width: 470, height: 155 }
  },
  { id: "Supervised learning", label: "Supervised learning", elementId: "JwKZ0Y4c", kind: "method", countX: 660, countY: 676 },
  { id: "Unsupervised learning", label: "Unsupervised learning", elementId: "nK5nq2Gx", kind: "method", countX: 1465, countY: 665 },
  { id: "Reinforcement learning", label: "Reinforcement learning", elementId: "lC-CPT4IQRzaFJfEXhK2w", kind: "method", countX: 1190, countY: 914 },
  { id: "Foundation Models", label: "Foundation models", elementId: "c0KcL4bF", kind: "method", countX: 1208, countY: 514 },
  { id: "Generative AI", label: "Generative AI", elementId: "tHk80p6p", kind: "method", countX: 1154, countY: 644 },
  { id: "TLO", label: "Transport & Logistics", elementId: "ZYfmmRO5", kind: "domain", countX: 640, countY: 282 },
  { id: "ICT", label: "ICT", elementId: "tF3bGfV9", kind: "domain", countX: 1812, countY: 272 },
  { id: "E&I", label: "Energy & Industry", elementId: "m4TfE2X5", kind: "domain", countX: 670, countY: 954 },
  { id: "SDM", label: "System Decision Methods", elementId: "2H9TQJtB", kind: "domain", countX: 1885, countY: 954 }
];
