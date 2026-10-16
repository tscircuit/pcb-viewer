import { pointToSegmentDistance } from "@tscircuit/math-utils"
import type { LayerRef, PcbTrace } from "circuit-json"
import type { Matrix } from "transformation-matrix"
import { getPrimitivesUnderPoint } from "../components/MouseElementTracker"
import type { Primitive } from "./types"

/**
 * Picks a trace at a board-space point in mm (+X right, +Y up). The transform
 * maps board points to screen pixels. Prefer the selected copper layer, then
 * the nearest segment, retaining the original trace and its complete route.
 */
export const getPcbTraceAtPoint = ({
  primitives,
  point,
  transform,
  selectedLayer,
  includeHiddenTraces = false,
}: {
  primitives: Primitive[]
  point: { x: number; y: number }
  transform: Matrix
  selectedLayer: LayerRef
  includeHiddenTraces?: boolean
}): PcbTrace | undefined => {
  const hits = getPrimitivesUnderPoint(
    primitives,
    point,
    transform,
    selectedLayer,
    includeHiddenTraces,
  ).filter(
    (primitive) =>
      primitive._element?.type === "pcb_trace" && primitive.layer !== "drill",
  )
  const distanceToSegment = (primitive: Primitive) =>
    primitive.pcb_drawing_type === "line"
      ? pointToSegmentDistance(
          point,
          { x: primitive.x1, y: primitive.y1 },
          { x: primitive.x2, y: primitive.y2 },
        )
      : 0
  hits.sort(
    (a, b) =>
      Number(b.layer === selectedLayer) - Number(a.layer === selectedLayer) ||
      distanceToSegment(a) - distanceToSegment(b),
  )
  const trace = hits[0]?._element
  return trace?.type === "pcb_trace" ? trace : undefined
}
