import type { Point } from "@tscircuit/math-utils"
import type { AnyCircuitElement, LayerRef } from "circuit-json"
import {
  type CSSProperties,
  type ReactElement,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import {
  type Matrix,
  applyToPoint,
  identity,
  inverse,
  toSVG,
} from "transformation-matrix"
import { useGlobalStore } from "../global-store"
import { getCopperLayerRefsFromElements } from "../lib/copper-layers"
import { getCanvasLayerZIndexes } from "../lib/Drawer"
import {
  type LocalSkewPair,
  type LocalSkewSegment,
  computeLocalSkew,
} from "../lib/local-skew/compute-local-skew"
import { fullScaleFor, skewColor } from "../lib/local-skew/skew-color"
import { zIndexMap } from "../lib/util/z-index-map"

/** Draw the overlay 10% wider than the copper so it covers the trace. */
const OVERLAY_WIDTH_FACTOR = 1.1

/** Keep overlay lines visible, in screen pixels, when zoomed far out. */
const MIN_STROKE_PIXELS = 2

/** Interpolated stretches are drawn at this opacity, so estimates read as fainter than measurements. */
const INTERPOLATED_OPACITY = 0.45

/** Extra reach, in screen pixels, beyond a line's drawn half-width that still hovers it. */
const HOVER_SLACK_PIXELS = 2

/** Gap between the pointer and the readout, in screen pixels. The trace tooltip sits below-right, so the readout goes above. */
const READOUT_OFFSET_PIXELS = 12

/** Below this distance from the viewer's top, in pixels, the readout goes below the pointer so it stays visible. */
const READOUT_FLIP_PIXELS = 48

/** Keep the readout this far inside the viewer's edges, in pixels. */
const READOUT_MARGIN_PIXELS = 4

/** Decimal places shown for skew in mm (1 µm). */
const READOUT_DECIMALS = 3

/** An overlay segment, by pair, side and index. */
type SegmentRef = {
  pairIndex: number
  side: "positive" | "negative"
  segmentIndex: number
}

/** The hovered segment and where to place the readout, in viewer pixels. */
type HoveredSkew = SegmentRef & {
  x: number
  y: number
  viewerWidth: number
}

/** Overlay lines grouped for drawing: by layer, then by coupling, then by stroke width. */
type LineGroup = {
  layer: LayerRef
  interpolated: boolean
  width: number
  lines: ReactElement[]
}

/**
 * Colours each routed differential pair by its local skew when
 * "Show Local Skew" is on. Each layer's overlay is stacked right above that
 * layer's copper canvas and faded like it, so foreground copper stays on
 * top. It hides during X-ray, and shows the skew of the visible overlay
 * line under the pointer. It never takes pointer events, so panning and the
 * viewer's own hover work as usual.
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
  const containerRef = useRef<HTMLDivElement>(null)

  const pairs = useMemo(() => {
    if (!isShowingLocalSkew) return []
    return computeLocalSkew(elements)
  }, [isShowingLocalSkew, elements])
  const innerLayers = useMemo(
    () =>
      getCopperLayerRefsFromElements(elements).filter((layer) =>
        layer.startsWith("inner"),
      ),
    [elements],
  )
  const zIndexes = useMemo(
    () =>
      getCanvasLayerZIndexes({ innerLayers, foregroundLayer: selectedLayer }),
    [innerLayers, selectedLayer],
  )

  const matrix = transform ?? identity()
  const pixelsPerMm = Math.hypot(matrix.a, matrix.b)

  // Built without the zoom, so zooming only changes group attributes.
  const groups = useMemo(() => groupLines({ pairs }), [pairs])

  // Hover is read from the viewer's own pointer events, so the overlay never
  // captures the pointer. A readout would be stale once the board, view or
  // visible layers change, so it clears then.
  useEffect(() => {
    setHovered(null)
    const viewer = containerRef.current?.parentElement
    if (!viewer || pairs.length === 0 || isXRayActive) return
    const view = transform ?? identity()
    const onMove = (event: MouseEvent) => {
      const bounds = viewer.getBoundingClientRect()
      const x = event.clientX - bounds.left
      const y = event.clientY - bounds.top
      const segment = segmentUnderPointer({
        pairs,
        point: applyToPoint(inverse(view), { x, y }),
        pixelsPerMm: Math.hypot(view.a, view.b),
        zIndexes,
        opacityOf: (layer) =>
          layerOpacity({ layer, selectedLayer, hiddenLayerOpacity }),
      })
      if (!segment) {
        setHovered(null)
        return
      }
      setHovered({ ...segment, x, y, viewerWidth: bounds.width })
    }
    const onLeave = () => setHovered(null)
    viewer.addEventListener("mousemove", onMove)
    viewer.addEventListener("mouseleave", onLeave)
    return () => {
      viewer.removeEventListener("mousemove", onMove)
      viewer.removeEventListener("mouseleave", onLeave)
    }
  }, [
    pairs,
    transform,
    zIndexes,
    selectedLayer,
    hiddenLayerOpacity,
    isXRayActive,
  ])

  if (pairs.length === 0 || isXRayActive) return null

  const layers = [...new Set(groups.map((group) => group.layer))]
  const hoveredPair = hovered ? pairs[hovered.pairIndex] : undefined
  const hoveredSegment =
    hovered && hoveredPair?.[hovered.side].segments[hovered.segmentIndex]

  return (
    <div
      ref={containerRef}
      className="pcb-local-skew-overlay"
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
      }}
    >
      {layers.map((layer) => {
        const opacity = layerOpacity({
          layer,
          selectedLayer,
          hiddenLayerOpacity,
        })
        if (opacity === 0) return null
        return (
          <svg
            key={layer}
            data-layer={layer}
            opacity={opacity}
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              width: "100%",
              height: "100%",
              zIndex: zIndexes.get(layer) ?? zIndexMap.localSkewOverlay,
            }}
          >
            <g transform={toSVG(matrix)} strokeLinecap="round">
              {groups
                .filter((group) => group.layer === layer)
                .map((group) => {
                  let groupOpacity = 1
                  let coupling = "measured"
                  if (group.interpolated) {
                    groupOpacity = INTERPOLATED_OPACITY
                    coupling = "interpolated"
                  }
                  return (
                    <g
                      key={`${group.interpolated}-${group.width}`}
                      data-coupling={coupling}
                      opacity={groupOpacity}
                      strokeWidth={strokeWidth({
                        width: group.width,
                        pixelsPerMm,
                      })}
                    >
                      {group.lines}
                    </g>
                  )
                })}
            </g>
          </svg>
        )
      })}
      {hovered && hoveredPair && hoveredSegment && (
        <div
          className="pcb-local-skew-readout"
          style={readoutPlacement(hovered)}
        >
          {describeSkew({ pair: hoveredPair, segment: hoveredSegment })}
        </div>
      )}
    </div>
  )
}

/** The drawn stroke width of an overlay line, in mm: a little wider than the copper, never thinner than {@link MIN_STROKE_PIXELS}. */
function strokeWidth({
  width,
  pixelsPerMm,
}: {
  width: number
  pixelsPerMm: number
}): number {
  return Math.max(width * OVERLAY_WIDTH_FACTOR, MIN_STROKE_PIXELS / pixelsPerMm)
}

/** Turns pairs into lines grouped by layer, interpolated or not, and copper width. */
function groupLines({ pairs }: { pairs: LocalSkewPair[] }): LineGroup[] {
  const groups = new Map<string, LineGroup>()
  pairs.forEach((pair, pairIndex) => {
    const fullScale = fullScaleFor({
      maxLengthSkew: pair.max_length_skew,
      maxSkew: pair.max_skew,
    })
    for (const side of ["positive", "negative"] as const) {
      pair[side].segments.forEach((segment, segmentIndex) => {
        const interpolated = segment.coupling === "interpolated"
        const key = `${segment.layer}|${interpolated}|${segment.width}`
        let group = groups.get(key)
        if (!group) {
          group = {
            layer: segment.layer,
            interpolated,
            width: segment.width,
            lines: [],
          }
          groups.set(key, group)
        }
        group.lines.push(
          <line
            key={`${pair.source_bus_id}-${side}-${segmentIndex}`}
            x1={segment.start.x}
            y1={segment.start.y}
            x2={segment.end.x}
            y2={segment.end.y}
            stroke={skewColor({ skew: segment.skew, fullScale })}
          />,
        )
      })
    }
  })
  return [...groups.values()]
}

/**
 * The visible overlay segment under a board point: among segments whose
 * drawn stroke (plus {@link HOVER_SLACK_PIXELS}) reaches the point, the one
 * on the layer drawn in front, then the closest.
 */
function segmentUnderPointer({
  pairs,
  point,
  pixelsPerMm,
  zIndexes,
  opacityOf,
}: {
  pairs: LocalSkewPair[]
  point: Point
  pixelsPerMm: number
  zIndexes: Map<string, number>
  opacityOf: (layer: LayerRef) => number
}): SegmentRef | null {
  let best: SegmentRef | null = null
  let bestZIndex = Number.NEGATIVE_INFINITY
  let bestDistance = Number.POSITIVE_INFINITY
  pairs.forEach((pair, pairIndex) => {
    for (const side of ["positive", "negative"] as const) {
      pair[side].segments.forEach((segment, segmentIndex) => {
        if (opacityOf(segment.layer) === 0) return
        const distance = distanceToSegment({ segment, point })
        const reach =
          strokeWidth({ width: segment.width, pixelsPerMm }) / 2 +
          HOVER_SLACK_PIXELS / pixelsPerMm
        if (distance > reach) return
        const zIndex = zIndexes.get(segment.layer) ?? 0
        if (zIndex < bestZIndex) return
        if (zIndex === bestZIndex && distance >= bestDistance) return
        best = { pairIndex, side, segmentIndex }
        bestZIndex = zIndex
        bestDistance = distance
      })
    }
  })
  return best
}

/** Distance from a point to a segment, in mm. */
function distanceToSegment({
  segment,
  point,
}: {
  segment: LocalSkewSegment
  point: Point
}): number {
  const dx = segment.end.x - segment.start.x
  const dy = segment.end.y - segment.start.y
  const lengthSquared = dx * dx + dy * dy
  let t = 0
  if (lengthSquared > 0) {
    t =
      ((point.x - segment.start.x) * dx + (point.y - segment.start.y) * dy) /
      lengthSquared
    t = Math.max(0, Math.min(1, t))
  }
  return Math.hypot(
    point.x - (segment.start.x + t * dx),
    point.y - (segment.start.y + t * dy),
  )
}

/**
 * Places the readout above the pointer, clear of the trace tooltip below
 * it, or below the pointer near the viewer's top edge. It opens to the
 * left in the viewer's right half, so it stays inside.
 */
function readoutPlacement(hovered: HoveredSkew): CSSProperties {
  let top = hovered.y - READOUT_OFFSET_PIXELS
  let transform = "translateY(-100%)"
  if (hovered.y < READOUT_FLIP_PIXELS) {
    top = hovered.y + READOUT_OFFSET_PIXELS
    transform = "none"
  }
  const placement: CSSProperties = {
    position: "absolute",
    top,
    transform,
    maxWidth: hovered.viewerWidth - 2 * READOUT_MARGIN_PIXELS,
    zIndex: zIndexMap.localSkewReadout,
    pointerEvents: "none",
    background: "#222",
    color: "#eee",
    border: "1px solid #555",
    borderRadius: 4,
    padding: "4px 6px",
    font: "12px sans-serif",
  }
  if (hovered.x > hovered.viewerWidth / 2) {
    placement.right = Math.max(
      READOUT_MARGIN_PIXELS,
      hovered.viewerWidth - hovered.x + READOUT_OFFSET_PIXELS,
    )
    return placement
  }
  placement.left = Math.max(
    READOUT_MARGIN_PIXELS,
    hovered.x + READOUT_OFFSET_PIXELS,
  )
  return placement
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

/** The readout, e.g. "USB: 1.236 mm longer than its partner (measured) · max 1.236 mm · limit 0.100 mm". */
function describeSkew({
  pair,
  segment,
}: {
  pair: LocalSkewPair
  segment: LocalSkewSegment
}): string {
  let local = "skew unknown (traces not running together)"
  if (segment.skew !== null) {
    let source = "measured"
    if (segment.coupling === "interpolated") source = "interpolated"
    local = `in step with its partner (${source})`
    const size = formatMm(Math.abs(segment.skew))
    if (size !== formatMm(0)) {
      let comparison = "longer than"
      if (segment.skew < 0) comparison = "shorter than"
      local = `${size} ${comparison} its partner (${source})`
    }
  }

  let description = `${pair.name ?? "Pair"}: ${local}`
  if (pair.max_skew !== null) {
    description += ` · max ${formatMm(pair.max_skew)}`
  }
  if (pair.max_length_skew !== undefined) {
    description += ` · limit ${formatMm(pair.max_length_skew)}`
  }
  return description
}

/** Formats a non-negative length in mm at the readout precision. */
function formatMm(mm: number): string {
  return `${mm.toFixed(READOUT_DECIMALS)} mm`
}
