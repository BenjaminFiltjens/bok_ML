import { type KeyboardEvent, type MouseEvent } from "react";
import vennScene from "../data/venn-layout.json";
import { TAXONOMY_HOTSPOTS, type TaxonomyHotspot } from "../data/venn-hotspots";

type VennElement = {
  id: string;
  type: "ellipse" | "rectangle" | "text" | "image";
  x: number;
  y: number;
  width: number;
  height: number;
  angle?: number;
  strokeColor?: string;
  backgroundColor?: string;
  strokeWidth?: number;
  strokeStyle?: string;
  opacity?: number;
  roundness?: { type: number } | null;
  text?: string;
  fontSize?: number;
  fontFamily?: number;
  textAlign?: string;
  lineHeight?: number;
  fileId?: string;
  crop?: {
    x: number;
    y: number;
    width: number;
    height: number;
    naturalWidth: number;
    naturalHeight: number;
  } | null;
};

type VennScene = {
  elements: VennElement[];
  files?: Record<string, { fileName: string; mimeType: string }>;
};

type TaxonomyVennProps = {
  activeIds?: string[];
  ariaLabel: string;
  baseVisible?: boolean;
  className?: string;
  counts?: Record<string, number>;
  extraHotspots?: TaxonomyHotspot[];
  hotspotIds?: string[];
  interactionLabel?: (hotspot: TaxonomyHotspot) => string;
  onSelect: (hotspot: TaxonomyHotspot, rect?: DOMRect) => void;
  showCounts?: boolean;
  viewBoxPadding?: number;
};

const EXCALIDRAW_SCENE = vennScene as VennScene;
const VENN_ELEMENTS = EXCALIDRAW_SCENE.elements.filter((element) => !("isDeleted" in element) || !(element as VennElement & { isDeleted?: boolean }).isDeleted);
const VENN_ELEMENT_BY_ID = new Map(VENN_ELEMENTS.map((element) => [element.id, element]));
const VENN_BOUNDS = VENN_ELEMENTS.reduce(
  (bounds, element) => ({
    minX: Math.min(bounds.minX, element.x),
    minY: Math.min(bounds.minY, element.y),
    maxX: Math.max(bounds.maxX, element.x + element.width),
    maxY: Math.max(bounds.maxY, element.y + element.height)
  }),
  { minX: Number.POSITIVE_INFINITY, minY: Number.POSITIVE_INFINITY, maxX: Number.NEGATIVE_INFINITY, maxY: Number.NEGATIVE_INFINITY }
);
const VENN_PADDING = 28;

function formatCount(value: number): string {
  return new Intl.NumberFormat("en").format(value);
}

export function TaxonomyVenn({
  activeIds = [],
  ariaLabel,
  baseVisible = true,
  className = "",
  counts = {},
  extraHotspots = [],
  hotspotIds,
  interactionLabel,
  onSelect,
  showCounts = false,
  viewBoxPadding = VENN_PADDING
}: TaxonomyVennProps) {
  const activeSet = new Set(activeIds);
  const hotspotIdSet = hotspotIds ? new Set(hotspotIds) : undefined;
  const visibleHotspots = hotspotIdSet ? TAXONOMY_HOTSPOTS.filter((hotspot) => hotspotIdSet.has(hotspot.id)) : TAXONOMY_HOTSPOTS;
  const renderedHotspots = [...extraHotspots, ...visibleHotspots];

  return (
    <svg
      className={className ? `venn-scene ${className}` : "venn-scene"}
      viewBox={`${VENN_BOUNDS.minX - viewBoxPadding} ${VENN_BOUNDS.minY - viewBoxPadding} ${VENN_BOUNDS.maxX - VENN_BOUNDS.minX + viewBoxPadding * 2} ${
        VENN_BOUNDS.maxY - VENN_BOUNDS.minY + viewBoxPadding * 2
      }`}
      role="img"
      aria-label={ariaLabel}
    >
      <title>{ariaLabel}</title>
      {baseVisible ? (
        <g className="venn-base" aria-hidden="true">
          {VENN_ELEMENTS.map((element) => (
            <VennElementShape key={element.id} element={element} />
          ))}
        </g>
      ) : null}
      <g className="venn-hotspots">
        {renderedHotspots.map((hotspot) => (
          <VennHotspot
            key={hotspot.id}
            hotspot={hotspot}
            count={counts[hotspot.id] || 0}
            interactionLabel={interactionLabel?.(hotspot)}
            active={activeSet.has(hotspot.id)}
            onSelect={onSelect}
            showCount={showCounts}
          />
        ))}
      </g>
    </svg>
  );
}

function VennElementShape({ element }: { element: VennElement }) {
  const opacity = (element.opacity ?? 100) / 100;
  const stroke = element.strokeColor || "transparent";
  const fill = element.backgroundColor === "transparent" ? "transparent" : element.backgroundColor || "transparent";
  const strokeDasharray = element.strokeStyle === "dashed" ? "12 10" : undefined;

  if (element.type === "ellipse") {
    return (
      <ellipse
        cx={element.x + element.width / 2}
        cy={element.y + element.height / 2}
        rx={element.width / 2}
        ry={element.height / 2}
        fill={fill}
        stroke={stroke}
        strokeWidth={element.strokeWidth || 1}
        strokeDasharray={strokeDasharray}
        opacity={opacity}
      />
    );
  }

  if (element.type === "rectangle") {
    return (
      <rect
        x={element.x}
        y={element.y}
        width={element.width}
        height={element.height}
        rx={element.roundness ? 22 : 0}
        fill={fill}
        stroke={stroke}
        strokeWidth={element.strokeWidth || 1}
        opacity={opacity}
      />
    );
  }

  if (element.type === "image" && element.fileId) {
    const file = EXCALIDRAW_SCENE.files?.[element.fileId];
    if (!file?.fileName) return null;
    const href = `${import.meta.env.BASE_URL}assets/${file.fileName}`;
    const clipId = `clip-${element.id}`;
    if (!element.crop) {
      return <image href={href} x={element.x} y={element.y} width={element.width} height={element.height} opacity={opacity} preserveAspectRatio="xMidYMid meet" />;
    }
    const scaleX = element.width / element.crop.width;
    const scaleY = element.height / element.crop.height;
    return (
      <g opacity={opacity}>
        <clipPath id={clipId}>
          <rect x={element.x} y={element.y} width={element.width} height={element.height} />
        </clipPath>
        <image
          href={href}
          x={element.x - element.crop.x * scaleX}
          y={element.y - element.crop.y * scaleY}
          width={element.crop.naturalWidth * scaleX}
          height={element.crop.naturalHeight * scaleY}
          clipPath={`url(#${clipId})`}
          preserveAspectRatio="none"
        />
      </g>
    );
  }

  if (element.type === "text" && element.text) {
    const lines = element.text.split("\n");
    const fontSize = element.fontSize || 18;
    const lineHeight = fontSize * (element.lineHeight || 1.25);
    const textAnchor = element.textAlign === "center" ? "middle" : element.textAlign === "right" ? "end" : "start";
    const x = element.textAlign === "center" ? element.x + element.width / 2 : element.textAlign === "right" ? element.x + element.width : element.x;
    const weight = fontSize >= 30 ? 700 : 400;
    return (
      <text
        x={x}
        y={element.y}
        textAnchor={textAnchor}
        dominantBaseline="hanging"
        fill={element.strokeColor || "currentColor"}
        opacity={opacity}
        fontFamily={element.fontFamily === 1 ? "Roboto Slab, Georgia, serif" : "Arial, Helvetica, sans-serif"}
        fontSize={fontSize}
        fontWeight={weight}
      >
        {lines.map((line, index) => (
          <tspan key={`${element.id}-${index}`} x={x} dy={index === 0 ? 0 : lineHeight}>
            {line}
          </tspan>
        ))}
      </text>
    );
  }

  return null;
}

function VennHotspot({
  hotspot,
  count,
  interactionLabel,
  active,
  onSelect,
  showCount
}: {
  hotspot: TaxonomyHotspot;
  count: number;
  interactionLabel?: string;
  active: boolean;
  onSelect: (hotspot: TaxonomyHotspot, rect?: DOMRect) => void;
  showCount: boolean;
}) {
  const element = VENN_ELEMENT_BY_ID.get(hotspot.elementId);
  if (!element) return null;
  const countText = formatCount(count);
  const countWidth = Math.max(42, countText.length * 14 + 24);

  function handleSelect(event: MouseEvent<SVGGElement> | KeyboardEvent<SVGGElement>) {
    onSelect(hotspot, event.currentTarget.getBoundingClientRect());
  }

  function handleKeyDown(event: KeyboardEvent<SVGGElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleSelect(event);
    }
  }

  return (
    <g
      className={`venn-click-target ${active ? "active" : ""}`}
      role="button"
      tabIndex={0}
      aria-label={showCount ? `${hotspot.label}: ${countText} theses` : interactionLabel || `Open course explanation for ${hotspot.label}`}
      aria-pressed={active}
      onClick={handleSelect}
      onKeyDown={handleKeyDown}
    >
      <title>{showCount ? `${hotspot.label}: ${countText} theses` : interactionLabel || `Open course explanation for ${hotspot.label}`}</title>
      <VennTargetShape element={element} target={hotspot.target} />
      {showCount ? (
        <g className="venn-count" transform={`translate(${hotspot.countX} ${hotspot.countY})`} pointerEvents="none">
          <rect x={-countWidth / 2} y={-18} width={countWidth} height={36} rx={18} />
          <text textAnchor="middle" dominantBaseline="central">
            {countText}
          </text>
        </g>
      ) : null}
    </g>
  );
}

function VennTargetShape({ element, target }: { element: VennElement; target?: TaxonomyHotspot["target"] }) {
  const shape = target || {
    type: element.type === "ellipse" ? "ellipse" : "rectangle",
    x: element.x,
    y: element.y,
    width: element.width,
    height: element.height,
    rx: element.roundness ? 22 : 0
  };
  if (shape.type === "ellipse") {
    return <ellipse className="venn-target-shape" cx={shape.x + shape.width / 2} cy={shape.y + shape.height / 2} rx={shape.width / 2} ry={shape.height / 2} />;
  }

  return <rect className="venn-target-shape" x={shape.x} y={shape.y} width={shape.width} height={shape.height} rx={shape.rx || 0} />;
}
