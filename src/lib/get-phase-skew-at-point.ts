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
 * Returns the stored phase skew of the sample point nearest to `point` on
 * `layer`, or null when no sample on that layer is within `maxDistanceMm` of
 * the copper edge (or centerline). Core stores samples at most 0.1 mm apart,
 * so the nearest sample is read directly instead of interpolating.
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
  let nearestDistance = maxDistanceMm
  let nearestDifference: number | null = null
  for (const segment of trace.segments) {
    if (segment.layer !== layer) continue
    const copperOffset = measureFromCopperEdge ? segment.width / 2 : 0
    for (const [sample, differenceMm] of [
      [segment.start, segment.start_length_difference_mm],
      [segment.end, segment.end_length_difference_mm],
    ] as const) {
      const distance =
        Math.hypot(point.x - sample.x, point.y - sample.y) - copperOffset
      if (!(distance <= nearestDistance)) continue
      nearestDistance = distance
      nearestDifference = differenceMm
    }
  }
  return nearestDifference
}

/** Labels a trace that has run farther than its partner as leading and one that has run less as lagging. */
export function getPhaseSkewText(differenceMm: number): string {
  if (Math.abs(differenceMm) < MATCHED_TOLERANCE_MM) return "In phase"
  const direction = differenceMm > 0 ? "Leading" : "Lagging"
  return `${direction} ${Math.abs(differenceMm).toFixed(3)} mm`
}
