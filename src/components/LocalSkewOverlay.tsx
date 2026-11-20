import { type Point, pointToSegmentDistance } from "@tscircuit/math-utils"
import type {
  AnyCircuitElement,
  LayerRef,
  PcbDifferentialPairLocalSkew,
  PcbLocalSkewSegment,
} from "circuit-json"
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
import {
  type LocalSkewColors,
  resolveSkewPalette,
  rgbString,
  skewColor,
} from "../lib/local-skew/skew-color"
import { zIndexMap } from "../lib/util/z-index-map"

/** Strokes are never thinner than this on screen, in pixels. */
const MIN_STROKE_PIXELS = 2
/** Width of the dark border around the strokes, in pixels. */
const CASING_PIXELS = 2
/** How far outside a stroke the pointer still hovers it, in pixels. */
const HOVER_SLACK_PIXELS = 2
/** Gap between the pointer and the readout, in pixels. */
const READOUT_OFFSET_PIXELS = 12
/** Closer than this to the top of the viewer, the readout goes below the pointer, in pixels. */
const READOUT_FLIP_PIXELS = 100
/** Strokes are this much wider than their copper, so no copper edge shows beside them. */
export const SKEW_STROKE_WIDTH_FACTOR = 1.1

/** The pointer in viewer pixels, and the viewer's width. */
type Pointer = Point & { viewerWidth: number }

/** One stored segment and the colour it is painted with. */
type PaintedSegment = {
  key: string
  pair: PcbDifferentialPairLocalSkew
  segment: PcbLocalSkewSegment
  color: string
}

/** Segments of one copper width: their casing path and coloured lines. */
type StrokeGroup = {
  casing: string
  lines: PaintedSegment[]
}

/** Stroke groups by copper layer, then by copper width in mm. */
type SkewStrokes = Map<LayerRef, Map<number, StrokeGroup>>

const OVERLAY_STYLE: CSSProperties = {
  position: "absolute",
  inset: 0,
  pointerEvents: "none",
}

/** Render the local skew recorded by core in Circuit JSON. */
export function LocalSkewOverlay({
  transform,
  elements,
  colors,
  useLogScale,
  showCopperPours,
}: {
  transform?: Matrix
  elements: AnyCircuitElement[]
  colors?: LocalSkewColors
  useLogScale?: boolean
  showCopperPours: boolean
}) {
  const selectedLayer = useGlobalStore((s) => s.selected_layer)
  const hiddenLayerOpacity = useGlobalStore((s) => s.hidden_layer_opacity)
  const [pointer, setPointer] = useState<Pointer | null>(null)
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
  const layers = useMemo(
    () => groupStrokes({ elements, colors, useLogScale }),
    [elements, colors, useLogScale],
  )
  const hasStrokes = layers.size > 0
  const hitCanvasCopper = useMemo(
    () => createCanvasCopperHitTest({ elements, showCopperPours }),
    [elements, showCopperPours],
  )

  useEffect(() => {
    setPointer(null)
    const viewer = containerRef.current?.parentElement
    if (!viewer || !hasStrokes) return
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
  }, [hasStrokes])

  if (!hasStrokes) return null

  const matrix = transform ?? identity()
  const pixelsPerMm = Math.hypot(matrix.a, matrix.b)
  let hovered: PaintedSegment | undefined
  if (pointer) {
    hovered = findHoveredSegment({
      pointer,
      layers,
      matrix,
      zIndexes,
      copperLayers,
      hitCanvasCopper,
      selectedLayer,
      hiddenLayerOpacity,
    })
  }
  return (
    <div
      ref={containerRef}
      className="pcb-local-skew-overlay"
      style={OVERLAY_STYLE}
    >
      {[...layers].map(([layer, groups]) => {
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
              {[...groups].map(([width, group]) => {
                const stroke = strokeWidth({ width, pixelsPerMm })
                // At fit zoom the coloured stroke may already be wider than
                // the copper. Cap its dark border in board units.
                const casingWidth = Math.min(
                  2 * width,
                  stroke + (2 * CASING_PIXELS) / pixelsPerMm,
                )
                if (casingWidth <= stroke) return null
                return (
                  <path
                    key={width}
                    d={group.casing}
                    fill="none"
                    stroke="black"
                    strokeWidth={casingWidth}
                  />
                )
              })}
              {[...groups].map(([width, group]) => (
                <g
                  key={width}
                  strokeWidth={strokeWidth({ width, pixelsPerMm })}
                >
                  {group.lines.map(({ key, segment, color }) => (
                    <line
                      key={key}
                      x1={segment.start.x}
                      y1={segment.start.y}
                      x2={segment.end.x}
                      y2={segment.end.y}
                      stroke={color}
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

/**
 * The visible segment under the pointer: on the highest visible layer, the
 * nearest one. None when opaque copper on a layer above covers the pointer.
 */
function findHoveredSegment({
  pointer,
  layers,
  matrix,
  zIndexes,
  copperLayers,
  hitCanvasCopper,
  selectedLayer,
  hiddenLayerOpacity,
}: {
  pointer: Pointer
  layers: SkewStrokes
  matrix: Matrix
  zIndexes: Map<string, number>
  copperLayers: LayerRef[]
  hitCanvasCopper: CanvasCopperHitTest
  selectedLayer: LayerRef
  hiddenLayerOpacity: number
}): PaintedSegment | undefined {
  const pixelsPerMm = Math.hypot(matrix.a, matrix.b)
  const point = applyToPoint(inverse(matrix), pointer)
  let best: PaintedSegment | undefined
  let bestDistance = Number.POSITIVE_INFINITY
  let bestZIndex = Number.NEGATIVE_INFINITY

  for (const [layer, groups] of layers) {
    const zIndex = zIndexes.get(layer) ?? 0
    if (layerOpacity({ layer, selectedLayer, hiddenLayerOpacity }) === 0) {
      continue
    }
    if (zIndex < bestZIndex) continue
    for (const [width, group] of groups) {
      const reach =
        strokeWidth({ width, pixelsPerMm }) / 2 +
        HOVER_SLACK_PIXELS / pixelsPerMm
      for (const line of group.lines) {
        const { start, end } = line.segment
        const distance = pointToSegmentDistance(point, start, end)
        if (distance > reach) continue
        if (zIndex === bestZIndex && distance >= bestDistance) continue
        best = line
        bestDistance = distance
        bestZIndex = zIndex
      }
    }
  }
  if (!best) return undefined

  for (const layer of copperLayers) {
    if ((zIndexes.get(layer) ?? 0) <= bestZIndex) continue
    if (layerOpacity({ layer, selectedLayer, hiddenLayerOpacity }) !== 1) {
      continue
    }
    if (hitCanvasCopper({ layer, transform: matrix, ...pointer })) {
      return undefined
    }
  }
  return best
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

/** A stroke's width in mm: a little wider than its copper, and at least the minimum on screen. */
function strokeWidth({
  width,
  pixelsPerMm,
}: {
  width: number
  pixelsPerMm: number
}): number {
  return Math.max(
    SKEW_STROKE_WIDTH_FACTOR * width,
    MIN_STROKE_PIXELS / pixelsPerMm,
  )
}

/** Every stored segment, coloured with its pair's palette and grouped by layer and copper width. */
function groupStrokes({
  elements,
  colors,
  useLogScale,
}: {
  elements: AnyCircuitElement[]
  colors?: LocalSkewColors
  useLogScale?: boolean
}): SkewStrokes {
  const layers: SkewStrokes = new Map()
  for (const pair of elements) {
    if (pair.type !== "pcb_differential_pair_local_skew") continue
    const palette = resolveSkewPalette({ colors, pair })
    for (const side of ["positive", "negative"] as const) {
      const trace = pair[side]
      trace.segments.forEach((segment, index) => {
        const { layer, width, start, end, local_skew } = segment
        let groups = layers.get(layer)
        if (!groups) {
          groups = new Map()
          layers.set(layer, groups)
        }
        let group = groups.get(width)
        if (!group) {
          group = { casing: "", lines: [] }
          groups.set(width, group)
        }
        group.casing += `M${start.x} ${start.y}L${end.x} ${end.y}`
        group.lines.push({
          key: `${pair.pcb_differential_pair_local_skew_id}-${side}-${index}`,
          pair,
          segment,
          color: rgbString(
            skewColor({
              skew: local_skew,
              positiveScale: trace.positive_skew_scale,
              negativeScale: trace.negative_skew_scale,
              palette,
              useLogScale,
            }),
          ),
        })
      })
    }
  }
  return layers
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
