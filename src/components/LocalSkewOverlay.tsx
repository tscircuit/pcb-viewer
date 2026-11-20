import { type Point, pointToSegmentDistance } from "@tscircuit/math-utils"
import type { AnyCircuitElement, LayerRef } from "circuit-json"
import { type CSSProperties, useEffect, useMemo, useRef, useState } from "react"
import {
  type Matrix,
  applyToPoint,
  identity,
  inverse,
  toSVG,
} from "transformation-matrix"
import { useGlobalStore } from "../global-store"
import { getCanvasLayerZIndexes } from "../lib/Drawer"
import { getCopperLayerRefsFromElements } from "../lib/copper-layers"
import {
  type CanvasCopperHitTest,
  createCanvasCopperHitTest,
} from "../lib/local-skew/canvas-copper-hit"
import { describeSkew } from "../lib/local-skew/describe-skew"
import { rgbString } from "../lib/local-skew/skew-color"
import {
  type PaintedSegment,
  type SkewLayers,
  getSkewStrokeWidths,
} from "../lib/local-skew/strokes"
import { zIndexMap } from "../lib/util/z-index-map"

/** How far outside a stroke the pointer still hovers it, in pixels. */
const HOVER_SLACK_PIXELS = 2
/** Gap between the pointer and the readout, in pixels. */
const READOUT_OFFSET_PIXELS = 12
/** Closer than this to the top of the viewer, the readout goes below the pointer, in pixels. */
const READOUT_FLIP_PIXELS = 100

/** The pointer in viewer pixels, and the viewer's width. */
type Pointer = Point & { viewerWidth: number }

/** The nearest hovered segment on each layer that has one. */
type HoverCandidates = Map<LayerRef, PaintedSegment>

/** Asks the renderer which of `candidates` is visible under `pointer`; `onPick` gets undefined when none is. */
export type PickSkewLayer = (request: {
  pointer: Point
  candidates: LayerRef[]
  onPick: (layer?: LayerRef) => void
}) => void

/** The renderer's last answer: the candidate layers it was asked about and the one it picked. */
type PickedLayer = {
  candidateLayers: LayerRef[]
  layer?: LayerRef
}

const OVERLAY_STYLE: CSSProperties = {
  position: "absolute",
  inset: 0,
  pointerEvents: "none",
}

/**
 * Hover readout for local skew, plus the strokes themselves on Canvas.
 * WebGPU draws the strokes in its own layers and passes `pickLayer`, which
 * reports the layer visible under the pointer.
 */
export function LocalSkewOverlay({
  transform,
  elements,
  layers,
  pickLayer,
  showCopperPours,
}: {
  transform?: Matrix
  elements: AnyCircuitElement[]
  layers: SkewLayers
  pickLayer?: PickSkewLayer
  showCopperPours?: boolean
}) {
  const selectedLayer = useGlobalStore((s) => s.selected_layer)
  const hiddenLayerOpacity = useGlobalStore((s) => s.hidden_layer_opacity)
  const [pointer, setPointer] = useState<Pointer | null>(null)
  const [picked, setPicked] = useState<PickedLayer>()
  const containerRef = useRef<HTMLDivElement>(null)
  const copperLayers = useMemo(
    () => getCopperLayerRefsFromElements(elements),
    [elements],
  )
  const zIndexes = useMemo(
    () =>
      getCanvasLayerZIndexes({
        innerLayers: copperLayers.filter((layer) => layer.startsWith("inner")),
        foregroundLayer: selectedLayer,
      }),
    [copperLayers, selectedLayer],
  )
  // Only Canvas tests copper itself; WebGPU answers through `pickLayer`.
  const hitCanvasCopper = useMemo(() => {
    if (pickLayer) return undefined
    return createCanvasCopperHitTest({
      elements,
      showCopperPours: showCopperPours === true,
    })
  }, [elements, pickLayer, showCopperPours])

  useEffect(() => {
    const viewer = containerRef.current?.parentElement
    if (!viewer) return
    const listeners = new AbortController()
    viewer.addEventListener(
      "mousemove",
      (event) => setPointer(pointerInViewer({ event, viewer })),
      { signal: listeners.signal },
    )
    viewer.addEventListener("mouseleave", () => setPointer(null), {
      signal: listeners.signal,
    })
    return () => listeners.abort()
  }, [])

  const matrix = useMemo(() => transform ?? identity(), [transform])
  const pixelsPerMm = Math.hypot(matrix.a, matrix.b)
  const candidates = useMemo(
    () =>
      findHoverCandidates({
        pointer,
        matrix,
        layers,
        selectedLayer,
        hiddenLayerOpacity,
      }),
    [pointer, matrix, layers, selectedLayer, hiddenLayerOpacity],
  )

  useEffect(() => {
    if (!pickLayer || !pointer || candidates.size === 0) return
    let active = true
    const candidateLayers = [...candidates.keys()]
    pickLayer({
      pointer,
      candidates: candidateLayers,
      onPick: (layer) => {
        if (active) setPicked({ candidateLayers, layer })
      },
    })
    return () => {
      active = false
    }
  }, [pickLayer, pointer, candidates])

  let hovered: PaintedSegment | undefined
  if (pointer && pickLayer) {
    hovered = pickedSegment({ picked, candidates })
  }
  if (pointer && hitCanvasCopper) {
    hovered = frontCanvasSegment({
      pointer,
      matrix,
      candidates,
      zIndexes,
      copperLayers,
      hitCanvasCopper,
      selectedLayer,
      hiddenLayerOpacity,
    })
  }
  let svgLayers: [LayerRef, Map<number, PaintedSegment[]>][] = []
  if (!pickLayer) svgLayers = [...layers]

  return (
    <div
      ref={containerRef}
      className="pcb-local-skew-overlay"
      style={OVERLAY_STYLE}
    >
      {svgLayers.map(([layer, groups]) => {
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
              ...OVERLAY_STYLE,
              width: "100%",
              height: "100%",
              zIndex: zIndexes.get(layer),
            }}
          >
            <g transform={toSVG(matrix)} strokeLinecap="round">
              {[...groups].map(([width, lines]) => {
                const { stroke, casing } = getSkewStrokeWidths({
                  width,
                  pixelsPerMm,
                })
                if (casing <= stroke) return null
                return (
                  <path
                    key={width}
                    d={casingPath(lines)}
                    fill="none"
                    stroke="black"
                    strokeWidth={casing}
                  />
                )
              })}
              {[...groups].map(([width, lines]) => (
                <g
                  key={width}
                  strokeWidth={
                    getSkewStrokeWidths({ width, pixelsPerMm }).stroke
                  }
                >
                  {lines.map(({ key, segment, rgb }) => (
                    <line
                      key={key}
                      x1={segment.start.x}
                      y1={segment.start.y}
                      x2={segment.end.x}
                      y2={segment.end.y}
                      stroke={rgbString(rgb)}
                    />
                  ))}
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
            pair: hovered.pair,
            segment: hovered.segment,
            name: findBusName({
              elements,
              sourceBusId: hovered.pair.source_bus_id,
            }),
          })}
        </div>
      )}
    </div>
  )
}

/** The pointer position relative to the viewer. */
function pointerInViewer({
  event,
  viewer,
}: {
  event: MouseEvent
  viewer: HTMLElement
}): Pointer {
  const bounds = viewer.getBoundingClientRect()
  return {
    x: event.clientX - bounds.left,
    y: event.clientY - bounds.top,
    viewerWidth: bounds.width,
  }
}

/** Full opacity on the selected layer, the hidden-layer opacity elsewhere. */
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

/** On each visible layer, the nearest segment within reach of the pointer. */
function findHoverCandidates({
  pointer,
  matrix,
  layers,
  selectedLayer,
  hiddenLayerOpacity,
}: {
  pointer: Pointer | null
  matrix: Matrix
  layers: SkewLayers
  selectedLayer: LayerRef
  hiddenLayerOpacity: number
}): HoverCandidates {
  const candidates: HoverCandidates = new Map()
  const pixelsPerMm = Math.hypot(matrix.a, matrix.b)
  if (!pointer || pixelsPerMm === 0) return candidates
  const point = applyToPoint(inverse(matrix), pointer)
  for (const [layer, groups] of layers) {
    if (layerOpacity({ layer, selectedLayer, hiddenLayerOpacity }) === 0) {
      continue
    }
    let bestDistance = Number.POSITIVE_INFINITY
    for (const [width, lines] of groups) {
      const reach =
        getSkewStrokeWidths({ width, pixelsPerMm }).stroke / 2 +
        HOVER_SLACK_PIXELS / pixelsPerMm
      for (const line of lines) {
        const { start, end } = line.segment
        const distance = pointToSegmentDistance(point, start, end)
        if (distance > reach || distance >= bestDistance) continue
        bestDistance = distance
        candidates.set(layer, line)
      }
    }
  }
  return candidates
}

/**
 * The candidate on the layer the renderer last picked. While a new pick for
 * the same candidate layers is in flight, the last answer still holds, so
 * the readout does not blink as the pointer moves along a segment or the
 * render options change under it.
 */
function pickedSegment({
  picked,
  candidates,
}: {
  picked: PickedLayer | undefined
  candidates: HoverCandidates
}): PaintedSegment | undefined {
  if (!picked?.layer) return undefined
  if (picked.candidateLayers.length !== candidates.size) return undefined
  for (const layer of picked.candidateLayers) {
    if (!candidates.has(layer)) return undefined
  }
  return candidates.get(picked.layer)
}

/**
 * On Canvas, the candidate on the front-most layer. None when opaque copper
 * on a layer above covers the pointer.
 */
function frontCanvasSegment({
  pointer,
  matrix,
  candidates,
  zIndexes,
  copperLayers,
  hitCanvasCopper,
  selectedLayer,
  hiddenLayerOpacity,
}: {
  pointer: Pointer
  matrix: Matrix
  candidates: HoverCandidates
  zIndexes: Map<string, number>
  copperLayers: LayerRef[]
  hitCanvasCopper: CanvasCopperHitTest
  selectedLayer: LayerRef
  hiddenLayerOpacity: number
}): PaintedSegment | undefined {
  let front: PaintedSegment | undefined
  let frontZIndex = Number.NEGATIVE_INFINITY
  for (const [layer, line] of candidates) {
    const zIndex = zIndexes.get(layer) ?? 0
    if (zIndex <= frontZIndex) continue
    frontZIndex = zIndex
    front = line
  }
  if (!front) return undefined

  for (const layer of copperLayers) {
    if ((zIndexes.get(layer) ?? 0) <= frontZIndex) continue
    if (layerOpacity({ layer, selectedLayer, hiddenLayerOpacity }) !== 1) {
      continue
    }
    if (hitCanvasCopper({ layer, transform: matrix, ...pointer })) {
      return undefined
    }
  }
  return front
}

/** One SVG path through every segment of a width group, for its casing. */
function casingPath(lines: PaintedSegment[]): string {
  return lines
    .map(
      ({ segment: { start, end } }) =>
        `M${start.x} ${start.y}L${end.x} ${end.y}`,
    )
    .join("")
}

/** The name of a source bus, if it has one. */
function findBusName({
  elements,
  sourceBusId,
}: {
  elements: AnyCircuitElement[]
  sourceBusId: string
}): string | undefined {
  for (const element of elements) {
    if (element.type !== "source_bus") continue
    if (element.source_bus_id === sourceBusId) return element.name
  }
  return undefined
}

/** Places the readout beside the pointer, below it near the top and to its left on the right half. */
function readoutPlacement(pointer: Pointer): CSSProperties {
  const placement: CSSProperties = {
    position: "absolute",
    top: pointer.y - READOUT_OFFSET_PIXELS,
    transform: "translateY(-100%)",
    left: pointer.x + READOUT_OFFSET_PIXELS,
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
    placement.transform = undefined
  }
  if (pointer.x > pointer.viewerWidth / 2) {
    placement.left = undefined
    placement.right = pointer.viewerWidth - pointer.x + READOUT_OFFSET_PIXELS
  }
  return placement
}
