import { pointToSegmentDistance } from "@tscircuit/math-utils"
import type { Line } from "./types"

export function getTraceHoverRadiusMm({
  traceWidthMm,
  pixelsPerMm,
}: {
  traceWidthMm: number
  pixelsPerMm: number
}): number {
  return pixelsPerMm > 0 ? Math.max(traceWidthMm * 25, 2) / pixelsPerMm : 0
}

export function getTraceSegmentDistanceMm({
  point,
  line,
}: {
  point: { x: number; y: number }
  line: Line
}): number {
  return pointToSegmentDistance(
    point,
    { x: line.x1, y: line.y1 },
    { x: line.x2, y: line.y2 },
  )
}
