import type { AnyCircuitElement, CircuitJson, LayerRef } from "circuit-json"
import {
  type MouseEvent,
  type ReactElement,
  useEffect,
  useMemo,
  useState,
} from "react"
import { type Matrix, identity, toSVG } from "transformation-matrix"
import { useGlobalStore } from "../global-store"
import {
  type LocalSkewPair,
  type LocalSkewSegment,
  computeLocalSkew,
} from "../lib/local-skew/compute-local-skew"
import { skewColor } from "../lib/local-skew/skew-color"
import { zIndexMap } from "../lib/util/z-index-map"

/** Draw the overlay 10% wider than the copper so it covers the trace. */
const OVERLAY_WIDTH_FACTOR = 1.1

/** Keep overlay lines visible, in screen pixels, when zoomed far out. */
const MIN_STROKE_PIXELS = 2

/** Without a `maxLengthSkew`, colours saturate at the pair's largest skew but never below this, in mm. */
const MIN_FULL_SCALE = 0.05

/** Gap between the pointer and the hover readout, in screen pixels. */
const READOUT_OFFSET_PIXELS = 12

/** Decimal places shown for skew in mm (1 µm). */
const READOUT_DECIMALS = 3

/** The hovered overlay line, by index into the current pairs, and the pointer position in pixels. */
type HoveredSkew = {
  pairIndex: number
  side: "positive" | "negative"
  segmentIndex: number
  x: number
  y: number
}

/**
 * Colours each routed differential pair by its local skew when
 * "Show Local Skew" is on. It follows the viewer's layer visibility, hides
 * during X-ray, and shows the skew under the pointer on hover. Rendered
 * beside the board canvases, so toggling it never remounts them.
 */
export const LocalSkewOverlay = ({
  transform,
  elements,
  isXRayActive,
}: {
  transform?: Matrix
  elements: AnyCircuitElement[]
  isXRayActive: boolean
}): ReactElement | null => {
  const isShowingLocalSkew = useGlobalStore((s) => s.is_showing_local_skew)
  const selectedLayer = useGlobalStore((s) => s.selected_layer)
  const hiddenLayerOpacity = useGlobalStore((s) => s.hidden_layer_opacity)
  const [hovered, setHovered] = useState<HoveredSkew | null>(null)

  const pairs = useMemo(() => {
    if (!isShowingLocalSkew) return []
    return computeLocalSkew(elements as CircuitJson)
  }, [isShowingLocalSkew, elements])

  const matrix = transform ?? identity()
  const pixelsPerMm = Math.hypot(matrix.a, matrix.b)

  // A stale readout would describe a board or position that changed.
  useEffect(() => setHovered(null), [pairs, transform])

  const lines = useMemo(
    () =>
      pairs.flatMap((pair, pairIndex) =>
        (["positive", "negative"] as const).flatMap((side) =>
          pair[side].segments.map((segment, segmentIndex) => {
            const opacity = layerOpacity({
              layer: segment.layer,
              selectedLayer,
              hiddenLayerOpacity,
            })
            if (opacity === 0) return null
            const strokeWidth = Math.max(
              segment.width * OVERLAY_WIDTH_FACTOR,
              MIN_STROKE_PIXELS / pixelsPerMm,
            )
            let strokeDasharray: string | undefined
            if (segment.coupling === "interpolated") {
              strokeDasharray = `${strokeWidth * 2} ${strokeWidth}`
            }
            return (
              <line
                key={`${pair.source_bus_id}-${side}-${segmentIndex}`}
                data-pair-index={pairIndex}
                data-side={side}
                data-segment-index={segmentIndex}
                x1={segment.start.x}
                y1={segment.start.y}
                x2={segment.end.x}
                y2={segment.end.y}
                stroke={skewColor({
                  skew: segment.skew,
                  fullScale: fullScaleOf(pair),
                })}
                strokeOpacity={opacity}
                strokeWidth={strokeWidth}
                strokeDasharray={strokeDasharray}
                strokeLinecap="round"
              />
            )
          }),
        ),
      ),
    [pairs, selectedLayer, hiddenLayerOpacity, pixelsPerMm],
  )

  if (pairs.length === 0 || isXRayActive) return null

  const hoveredPair = hovered ? pairs[hovered.pairIndex] : undefined
  const hoveredSegment =
    hovered && hoveredPair
      ? hoveredPair[hovered.side].segments[hovered.segmentIndex]
      : undefined

  return (
    <>
      <svg
        className="pcb-local-skew-overlay"
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
          zIndex: zIndexMap.localSkewOverlay,
        }}
      >
        <g
          transform={toSVG(matrix)}
          style={{ pointerEvents: "stroke" }}
          onMouseMove={(event) => setHovered(hoveredFromEvent(event))}
          onMouseLeave={() => setHovered(null)}
        >
          {lines}
        </g>
      </svg>
      {hovered && hoveredPair && hoveredSegment && (
        <div
          style={{
            position: "absolute",
            left: hovered.x + READOUT_OFFSET_PIXELS,
            top: hovered.y + READOUT_OFFSET_PIXELS,
            zIndex: zIndexMap.localSkewOverlay,
            pointerEvents: "none",
            background: "#222",
            color: "#eee",
            border: "1px solid #555",
            borderRadius: 4,
            padding: "4px 6px",
            font: "12px sans-serif",
            whiteSpace: "nowrap",
          }}
        >
          {describeSkew({ pair: hoveredPair, segment: hoveredSegment })}
        </div>
      )}
    </>
  )
}

/** The hovered line and pointer position from a mouse event on the overlay, in pixels relative to it. */
function hoveredFromEvent(event: MouseEvent<SVGGElement>): HoveredSkew | null {
  const line = event.target as SVGElement
  const side = line.dataset.side
  if (side !== "positive" && side !== "negative") return null
  const bounds = event.currentTarget.ownerSVGElement?.getBoundingClientRect()
  if (!bounds) return null
  return {
    pairIndex: Number(line.dataset.pairIndex),
    side,
    segmentIndex: Number(line.dataset.segmentIndex),
    x: event.clientX - bounds.left,
    y: event.clientY - bounds.top,
  }
}

/** How opaque a layer's overlay is: full on the selected layer, the hidden-layer opacity elsewhere. */
function layerOpacity({
  layer,
  selectedLayer,
  hiddenLayerOpacity,
}: {
  layer: LayerRef
  selectedLayer: LayerRef
  hiddenLayerOpacity: number
}): number {
  if (layer === selectedLayer) return 1
  return hiddenLayerOpacity
}

/** The skew, in mm, drawn with the full longer or shorter colour. */
function fullScaleOf(pair: LocalSkewPair): number {
  if (pair.max_length_skew !== undefined) return pair.max_length_skew
  return Math.max(MIN_FULL_SCALE, pair.max_skew ?? 0)
}

/**
 * The hover readout, e.g. "USB: +1.236 mm longer than its partner
 * (measured), max 1.236 mm, limit 0.100 mm".
 */
function describeSkew({
  pair,
  segment,
}: {
  pair: LocalSkewPair
  segment: LocalSkewSegment
}): string {
  let local = "skew unknown (traces not running together)"
  if (segment.skew !== null) {
    let comparison = "longer than"
    if (segment.skew < 0) comparison = "shorter than"
    let source = "measured"
    if (segment.coupling === "interpolated") source = "interpolated"
    local = `${formatMm(Math.abs(segment.skew))} ${comparison} its partner (${source})`
    if (formatMm(segment.skew) === formatMm(0)) {
      local = `in step with its partner (${source})`
    }
  }

  let description = `${pair.name ?? "Pair"}: ${local}`
  if (pair.max_skew !== null) {
    description += `, max ${formatMm(pair.max_skew)}`
  }
  if (pair.max_length_skew !== undefined) {
    description += `, limit ${formatMm(pair.max_length_skew)}`
  }
  return description
}

/** Formats a length in mm at the readout precision, without "-0". */
function formatMm(mm: number): string {
  const text = Math.abs(mm).toFixed(READOUT_DECIMALS)
  if (mm < 0 && Number(text) !== 0) return `-${text} mm`
  return `${text} mm`
}
