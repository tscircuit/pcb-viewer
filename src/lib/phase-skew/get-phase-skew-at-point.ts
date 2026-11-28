import {
  type Point,
  distance,
  pointToSegmentClosestPoint,
} from "@tscircuit/math-utils"
import type { PcbDifferentialPairPhaseSkewTrace } from "circuit-json"

/**
 * Returns this trace's routed length so far minus its partner's, in mm,
 * interpolated at the point on `layer` nearest to `point`.
 */
export function getPhaseSkewAtPoint({
  trace,
  point,
  layer,
}: {
  trace: PcbDifferentialPairPhaseSkewTrace
  point: Point
  layer: string
}): number | null {
  let nearestDistance = Infinity
  let nearestDifference: number | null = null
  for (const segment of trace.segments) {
    if (segment.layer !== layer) continue
    const { start, end } = segment
    const length = distance(start, end)
    const closest =
      length === 0 ? start : pointToSegmentClosestPoint(point, start, end)
    const closestDistance = distance(point, closest)
    if (closestDistance >= nearestDistance) continue
    nearestDistance = closestDistance
    nearestDifference = segment.start_length_difference_mm
    if (length > 0) {
      nearestDifference +=
        (distance(start, closest) / length) *
        (segment.end_length_difference_mm - segment.start_length_difference_mm)
    }
  }
  return nearestDifference
}
