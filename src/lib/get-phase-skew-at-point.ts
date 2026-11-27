import type {
  AnyCircuitElement,
  PcbDifferentialPairPhaseSkew,
  PcbDifferentialPairPhaseSkewTrace,
} from "circuit-json"
import type { Point } from "./util/expand-stroke"

export type PhaseSkewTraceIndex = Record<
  string,
  PcbDifferentialPairPhaseSkewTrace | undefined
>

const MATCHED_TOLERANCE_MM = 0.0005

export function isCompletePhaseSkewPair({
  positive_trace,
  negative_trace,
}: PcbDifferentialPairPhaseSkew): boolean {
  return (
    typeof positive_trace?.pcb_trace_id === "string" &&
    Array.isArray(positive_trace.segments) &&
    typeof negative_trace?.pcb_trace_id === "string" &&
    Array.isArray(negative_trace.segments)
  )
}

export function createPhaseSkewTraceIndex(
  elements: AnyCircuitElement[],
): PhaseSkewTraceIndex {
  const index: PhaseSkewTraceIndex = Object.create(null)
  for (const element of elements) {
    if (
      element.type !== "pcb_differential_pair_phase_skew" ||
      !isCompletePhaseSkewPair(element)
    )
      continue
    index[element.positive_trace.pcb_trace_id] = element.positive_trace
    index[element.negative_trace.pcb_trace_id] = element.negative_trace
  }
  return index
}

/**
 * Returns this trace's routed length so far minus its partner's, in mm, at the
 * segment point nearest to `point` on `layer`, or null when no segment on that
 * layer is within `maxDistanceMm` of the copper edge (or centerline).
 */
export function getPhaseSkewAtPoint({
  trace,
  point,
  maxDistanceMm,
  layer,
  measureFromCopperEdge = true,
}: {
  trace: PcbDifferentialPairPhaseSkewTrace
  point: Point
  maxDistanceMm: number
  layer: string
  measureFromCopperEdge?: boolean
}): number | null {
  let nearestDistance = Number.POSITIVE_INFINITY
  let nearestDifference: number | null = null
  for (const segment of trace.segments) {
    if (segment.layer !== layer) continue
    const dx = segment.end.x - segment.start.x
    const dy = segment.end.y - segment.start.y
    const lengthSquared = dx * dx + dy * dy
    if (lengthSquared <= Number.EPSILON) continue
    const t = Math.min(
      1,
      Math.max(
        0,
        ((point.x - segment.start.x) * dx + (point.y - segment.start.y) * dy) /
          lengthSquared,
      ),
    )
    const distance =
      Math.hypot(
        point.x - (segment.start.x + t * dx),
        point.y - (segment.start.y + t * dy),
      ) - (measureFromCopperEdge ? segment.width / 2 : 0)
    if (
      !Number.isFinite(distance) ||
      distance > maxDistanceMm ||
      distance >= nearestDistance
    )
      continue
    const differenceMm =
      segment.start_length_difference_mm +
      t *
        (segment.end_length_difference_mm - segment.start_length_difference_mm)
    if (!Number.isFinite(differenceMm)) continue
    nearestDistance = distance
    nearestDifference = differenceMm
  }
  return nearestDifference
}

/** Labels a trace that has run farther than its partner as leading and one that has run less as lagging. */
export function getPhaseSkewText(differenceMm: number): string {
  if (Math.abs(differenceMm) < MATCHED_TOLERANCE_MM) return "In phase"
  const direction = differenceMm > 0 ? "Leading" : "Lagging"
  return `${direction} ${Math.abs(differenceMm).toFixed(3)} mm`
}
