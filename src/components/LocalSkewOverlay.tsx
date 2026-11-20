import { type Point, pointToSegmentDistance } from "@tscircuit/math-utils"
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
import { getCanvasLayerZIndexes } from "../lib/Drawer"
import {
  getCopperLayerRefsFromElements,
  isCopperLayer,
} from "../lib/copper-layers"
import { getCopperPoursUnderPoint } from "../lib/draw-copper-pour"
import type { LocalSkewPair } from "../lib/local-skew/compute-local-skew"
import { describeSkew } from "../lib/local-skew/describe-skew"
import { skewColor } from "../lib/local-skew/skew-color"
import {
  type PrimitiveSpatialIndex,
  getPrimitivesNearPoint,
} from "../lib/primitive-spatial-index"
import { zIndexMap } from "../lib/util/z-index-map"
import { isXRayCopper } from "../lib/x-ray-net"
import { getPrimitivesUnderPoint } from "./MouseElementTracker"

/** Draw the overlay 10% wider than the copper so it covers the trace. */
const OVERLAY_WIDTH_FACTOR = 1.1

/** Keep overlay lines visible, in screen pixels, when zoomed far out. */
const MIN_STROKE_PIXELS = 2

/** Dark border on each side of a skew line, in screen pixels. */
const CASING_PIXELS = 2

/** Extra reach, in screen pixels, beyond a line's drawn half-width that still hovers it. */
const HOVER_SLACK_PIXELS = 2

/** Gap between the pointer and the readout, in screen pixels. The trace tooltip sits below-right, so the readout goes above. */
const READOUT_OFFSET_PIXELS = 12

/**
 * Closer than this to the viewer's top, in pixels, a readout above the
 * pointer would run under the toolbar (about 45 px) or off the viewer, so
 * it goes below the pointer instead.
 */
const READOUT_FLIP_PIXELS = 100

/** An overlay segment, by pair, side and index. */
type SegmentRef = {
  pairIndex: number
  side: "positive" | "negative"
  segmentIndex: number
}

/** The pointer position in the viewer, in pixels. */
type Pointer = {
  x: number
  y: number
  viewerWidth: number
}

/** Overlay lines grouped for drawing: by layer, then by stroke width. */
type LineGroup = {
  layer: LayerRef
  width: number
  casing: string
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
  pairs,
  primitiveSpatialIndex,
  isXRayActive,
}: {
  transform?: Matrix
  elements: AnyCircuitElement[]
  pairs: LocalSkewPair[]
  primitiveSpatialIndex: PrimitiveSpatialIndex
  isXRayActive: boolean
}): ReactElement | null => {
  const selectedLayer = useGlobalStore((s) => s.selected_layer)
  const hiddenLayerOpacity = useGlobalStore((s) => s.hidden_layer_opacity)
  const isShowingCopperPours = useGlobalStore((s) => s.is_showing_copper_pours)
  const copperPourOpacity = useGlobalStore((s) => s.copper_pour_opacity)
  const [pointer, setPointer] = useState<Pointer | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
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
  // Built without the zoom, so zooming only changes group attributes.
  const groups = useMemo(() => groupLines({ pairs }), [pairs])
  const isShown = pairs.length > 0 && !isXRayActive

  // The pointer is read from the viewer's own events, so the overlay never
  // captures it. The segment under it is found at render, so the readout
  // follows zooming, panning and layer changes without the mouse moving.
  useEffect(() => {
    setPointer(null)
    const viewer = containerRef.current?.parentElement
    if (!viewer || !isShown) return
    const onMove = (event: MouseEvent) => {
      const bounds = viewer.getBoundingClientRect()
      setPointer({
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
        viewerWidth: bounds.width,
      })
    }
    const onLeave = () => setPointer(null)
    viewer.addEventListener("mousemove", onMove)
    viewer.addEventListener("mouseleave", onLeave)
    return () => {
      viewer.removeEventListener("mousemove", onMove)
      viewer.removeEventListener("mouseleave", onLeave)
    }
  }, [isShown])

  if (!isShown) return null

  const matrix = transform ?? identity()
  const pixelsPerMm = Math.hypot(matrix.a, matrix.b)
  const opacityOf = (layer: LayerRef) =>
    layerOpacity({ layer, selectedLayer, hiddenLayerOpacity })
  let hovered: SegmentRef | null = null
  if (pointer) {
    const point = applyToPoint(inverse(matrix), pointer)
    const candidate = segmentUnderPointer({
      pairs,
      point,
      pixelsPerMm,
      zIndexes,
      opacityOf,
    })
    if (
      candidate &&
      !isCoveredByHigherCopper({
        point,
        layer:
          pairs[candidate.pairIndex][candidate.side].segments[
            candidate.segmentIndex
          ].layer,
        elements,
        primitiveSpatialIndex,
        selectedLayer,
        transform: matrix,
        pixelsPerMm,
        zIndexes,
        opacityOf,
        isShowingCopperPours,
        copperPourOpacity,
      })
    ) {
      hovered = candidate
    }
  }
  const layers = [...new Set(groups.map((group) => group.layer))]

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
        const layerGroups = groups.filter((group) => group.layer === layer)
        const opacity = opacityOf(layer)
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
              zIndex: zIndexes.get(layer) ?? 0,
            }}
          >
            <g transform={toSVG(matrix)} strokeLinecap="round">
              {layerGroups.map((group) => (
                <path
                  key={group.width}
                  d={group.casing}
                  fill="none"
                  stroke="black"
                  strokeWidth={
                    strokeWidth({ width: group.width, pixelsPerMm }) +
                    (2 * CASING_PIXELS) / pixelsPerMm
                  }
                />
              ))}
              {layerGroups.map((group) => (
                <g
                  key={group.width}
                  strokeWidth={strokeWidth({
                    width: group.width,
                    pixelsPerMm,
                  })}
                >
                  {group.lines}
                </g>
              ))}
            </g>
          </svg>
        )
      })}
      {pointer && hovered && (
        <div
          className="pcb-local-skew-readout"
          style={readoutPlacement(pointer)}
        >
          {describeSkew({
            pair: pairs[hovered.pairIndex],
            segment:
              pairs[hovered.pairIndex][hovered.side].segments[
                hovered.segmentIndex
              ],
          })}
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

/** Turns pairs into lines grouped by layer and copper width. */
function groupLines({ pairs }: { pairs: LocalSkewPair[] }): LineGroup[] {
  const groups = new Map<string, LineGroup>()
  for (const pair of pairs) {
    for (const side of ["positive", "negative"] as const) {
      const fullScale = pair[side].scale
      pair[side].segments.forEach((segment, segmentIndex) => {
        const key = `${segment.layer}|${segment.width}`
        let group = groups.get(key)
        if (!group) {
          group = {
            layer: segment.layer,
            width: segment.width,
            casing: "",
            lines: [],
          }
          groups.set(key, group)
        }
        group.casing += `M${segment.start.x} ${segment.start.y}L${segment.end.x} ${segment.end.y}`
        group.lines.push(
          <line
            key={`${pair.source_bus_id}-${side}-${segmentIndex}`}
            data-coupling={segment.coupling}
            x1={segment.start.x}
            y1={segment.start.y}
            x2={segment.end.x}
            y2={segment.end.y}
            stroke={skewColor({
              skew: segment.skew,
              fullScale,
            })}
          />,
        )
      })
    }
  }
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
        const distance = pointToSegmentDistance(
          point,
          segment.start,
          segment.end,
        )
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

/**
 * Whether an opaque copper primitive or pour on a higher-z layer covers
 * `point`, obscuring an overlay drawn on `layer`.
 */
function isCoveredByHigherCopper({
  point,
  layer,
  elements,
  primitiveSpatialIndex,
  selectedLayer,
  transform,
  pixelsPerMm,
  zIndexes,
  opacityOf,
  isShowingCopperPours,
  copperPourOpacity,
}: {
  point: Point
  layer: LayerRef
  elements: AnyCircuitElement[]
  primitiveSpatialIndex: PrimitiveSpatialIndex
  selectedLayer: LayerRef
  transform: Matrix
  pixelsPerMm: number
  zIndexes: Map<string, number>
  opacityOf: (layer: LayerRef) => number
  isShowingCopperPours: boolean
  copperPourOpacity: number
}): boolean {
  const overlayZIndex = zIndexes.get(layer) ?? 0
  const hits = getPrimitivesUnderPoint({
    includeHiddenTraces: true,
    useActualTraceWidth: true,
    primitives: getPrimitivesNearPoint({
      point,
      realToScreenScale: pixelsPerMm,
      spatialIndex: primitiveSpatialIndex,
    }),
    rwPoint: point,
    selectedLayer,
    transform,
  })
  const hasCoveringPrimitive = hits.some(
    (primitive) =>
      isXRayCopper(primitive._element) &&
      isCopperLayer(primitive.layer) &&
      opacityOf(primitive.layer) >= 1 &&
      (zIndexes.get(primitive.layer) ?? 0) > overlayZIndex,
  )
  if (hasCoveringPrimitive) return true
  if (!isShowingCopperPours || copperPourOpacity < 1) return false
  const coveringPourLayers = new Set<LayerRef>()
  for (const element of elements) {
    if (element.type !== "pcb_copper_pour") continue
    if (opacityOf(element.layer) < 1) continue
    if ((zIndexes.get(element.layer) ?? 0) <= overlayZIndex) continue
    coveringPourLayers.add(element.layer)
  }
  for (const pourLayer of coveringPourLayers) {
    if (getCopperPoursUnderPoint(elements, point, pourLayer).length > 0) {
      return true
    }
  }
  return false
}

/**
 * Places the readout above the pointer, clear of the trace tooltip below
 * it, or below the pointer near the viewer's top. It opens to the left in
 * the viewer's right half, so it stays inside.
 */
function readoutPlacement(pointer: Pointer): CSSProperties {
  const placement: CSSProperties = {
    position: "absolute",
    top: pointer.y - READOUT_OFFSET_PIXELS,
    transform: "translateY(-100%)",
    zIndex: zIndexMap.localSkewReadout,
    pointerEvents: "none",
    background: "#222",
    color: "#eee",
    border: "1px solid #555",
    borderRadius: 4,
    padding: "4px 6px",
    font: "12px sans-serif",
  }
  if (pointer.y < READOUT_FLIP_PIXELS) {
    placement.top = pointer.y + READOUT_OFFSET_PIXELS
    placement.transform = "none"
  }
  if (pointer.x > pointer.viewerWidth / 2) {
    placement.right = pointer.viewerWidth - pointer.x + READOUT_OFFSET_PIXELS
    return placement
  }
  placement.left = pointer.x + READOUT_OFFSET_PIXELS
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
