import type { PcbDifferentialPairPhaseSkewTrace } from "circuit-json"
import type { Point } from "../util/expand-stroke"

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
    const dx = segment.end.x - segment.start.x
    const dy = segment.end.y - segment.start.y
    const t = Math.min(
      1,
      Math.max(
        0,
        ((point.x - segment.start.x) * dx + (point.y - segment.start.y) * dy) /
          (dx * dx + dy * dy),
      ),
    )
    const distance = Math.hypot(
      point.x - (segment.start.x + t * dx),
      point.y - (segment.start.y + t * dy),
    )
    if (distance >= nearestDistance) continue
    nearestDistance = distance
    nearestDifference =
      segment.start_length_difference_mm +
      t *
        (segment.end_length_difference_mm - segment.start_length_difference_mm)
  }
  return nearestDifference
}
