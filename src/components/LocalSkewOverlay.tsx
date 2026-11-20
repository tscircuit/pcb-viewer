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
import { createCanvasCopperHitTest } from "../lib/local-skew/canvas-copper-hit"
import { describeSkew } from "../lib/local-skew/describe-skew"
import { type LocalSkewColors, skewColor } from "../lib/local-skew/skew-color"
import { zIndexMap } from "../lib/util/z-index-map"

const MIN_STROKE_PIXELS = 2
const CASING_PIXELS = 2
const HOVER_SLACK_PIXELS = 2
const READOUT_OFFSET_PIXELS = 12
const READOUT_FLIP_PIXELS = 100

type Pointer = Point & { viewerWidth: number }

type PaintedSegment = {
  key: string
  pair: PcbDifferentialPairLocalSkew
  segment: PcbLocalSkewSegment
  color: string
}

type StrokeGroup = {
  casing: string
  lines: PaintedSegment[]
}

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
    () => groupStrokes(elements, colors, useLogScale),
    [elements, colors, useLogScale],
  )
  const hasStrokes = layers.size > 0

  const hitCanvasCopper = useMemo(
    () =>
      hasStrokes
        ? createCanvasCopperHitTest(elements, showCopperPours)
        : undefined,
    [elements, hasStrokes, showCopperPours],
  )

  useEffect(() => {
    setPointer(null)
    const viewer = containerRef.current?.parentElement
    if (!viewer || !hasStrokes) return
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
  }, [hasStrokes])

  if (!hasStrokes) return null

  const matrix = transform ?? identity()
  const pixelsPerMm = Math.hypot(matrix.a, matrix.b)
  const opacityOf = (layer: LayerRef) =>
    layer === selectedLayer ? 1 : hiddenLayerOpacity
  function getHoveredLine(pointer: Pointer) {
    const point = applyToPoint(inverse(matrix), pointer)
    let best: PaintedSegment | undefined
    let bestDistance = Infinity
    let bestZIndex = -Infinity

    for (const [layer, groups] of layers) {
      const zIndex = zIndexes.get(layer) ?? 0
      if (opacityOf(layer) === 0 || zIndex < bestZIndex) continue
      for (const [width, group] of groups) {
        const reach =
          strokeWidth(width, pixelsPerMm) / 2 + HOVER_SLACK_PIXELS / pixelsPerMm
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

    if (
      best &&
      hitCanvasCopper &&
      copperLayers.some(
        (layer) =>
          (zIndexes.get(layer) ?? 0) > bestZIndex &&
          opacityOf(layer) === 1 &&
          hitCanvasCopper(layer, matrix, pointer.x, pointer.y),
      )
    )
      return undefined
    return best
  }

  const hovered = pointer ? getHoveredLine(pointer) : undefined
  const bus =
    hovered &&
    elements.find(
      (element) =>
        element.type === "source_bus" &&
        element.source_bus_id === hovered.pair.source_bus_id,
    )
  return (
    <div
      ref={containerRef}
      className="pcb-local-skew-overlay"
      style={OVERLAY_STYLE}
    >
      {[...layers].map(([layer, groups]) => {
        const opacity = opacityOf(layer)
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
                const stroke = strokeWidth(width, pixelsPerMm)
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
                <g key={width} strokeWidth={strokeWidth(width, pixelsPerMm)}>
                  {group.lines.map(({ key, segment, color }) => (
                    <line
                      key={key}
                      data-coupling={segment.coupling}
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
            name: bus?.type === "source_bus" ? bus.name : undefined,
          })}
        </div>
      )}
    </div>
  )
}

function strokeWidth(width: number, pixelsPerMm: number) {
  return Math.max(1.1 * width, MIN_STROKE_PIXELS / pixelsPerMm)
}

function groupStrokes(
  elements: AnyCircuitElement[],
  colors?: LocalSkewColors,
  useLogScale?: boolean,
) {
  const layers = new Map<LayerRef, Map<number, StrokeGroup>>()
  for (const pair of elements) {
    if (pair.type !== "pcb_differential_pair_local_skew") continue
    for (const side of ["positive", "negative"] as const) {
      const trace = pair[side]
      trace.segments.forEach((segment, index) => {
        const { layer, width, start, end, local_skew } = segment
        let groups = layers.get(layer)
        if (!groups) layers.set(layer, (groups = new Map()))
        let group = groups.get(width)
        if (!group) groups.set(width, (group = { casing: "", lines: [] }))
        group.casing += `M${start.x} ${start.y}L${end.x} ${end.y}`
        group.lines.push({
          key: `${pair.pcb_differential_pair_local_skew_id}-${side}-${index}`,
          pair,
          segment,
          color: skewColor({
            skew: local_skew,
            positiveScale: trace.positive_skew_scale,
            negativeScale: trace.negative_skew_scale,
            colors,
            useLogScale,
          }),
        })
      })
    }
  }
  return layers
}

function readoutPlacement(pointer: Pointer): CSSProperties {
  const below = pointer.y < READOUT_FLIP_PIXELS
  const alignment =
    pointer.x > pointer.viewerWidth / 2
      ? { right: pointer.viewerWidth - pointer.x + READOUT_OFFSET_PIXELS }
      : { left: pointer.x + READOUT_OFFSET_PIXELS }

  return {
    position: "absolute",
    top: pointer.y + (below ? READOUT_OFFSET_PIXELS : -READOUT_OFFSET_PIXELS),
    transform: below ? undefined : "translateY(-100%)",
    zIndex: zIndexMap.localSkewReadout,
    pointerEvents: "none",
    background: "#222",
    color: "#eee",
    border: "1px solid #555",
    borderRadius: 4,
    padding: "4px 6px",
    font: "12px sans-serif",
    ...alignment,
  }
}
