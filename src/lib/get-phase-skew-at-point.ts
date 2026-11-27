import type {
  AnyCircuitElement,
  PcbDifferentialPairPhaseSkewTrace,
} from "circuit-json"
import type { Point } from "./util/expand-stroke"

export type PhaseSkewTraceIndex = Record<
  string,
  PcbDifferentialPairPhaseSkewTrace | undefined
>

export function createPhaseSkewTraceIndex(
  elements: AnyCircuitElement[],
): PhaseSkewTraceIndex {
  const index: PhaseSkewTraceIndex = {}
  for (const element of elements) {
    if (element.type !== "pcb_differential_pair_phase_skew") continue
    index[element.positive_trace.pcb_trace_id] = element.positive_trace
    index[element.negative_trace.pcb_trace_id] = element.negative_trace
  }
  return index
}

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

/** Labels a trace that has run farther than its partner as leading and one that has run less as lagging. */
export function getPhaseSkewText(differenceMm: number): string {
  if (Math.abs(differenceMm) < 0.0005) return "In phase"
  const direction = differenceMm > 0 ? "Leading" : "Lagging"
  return `${direction} ${Math.abs(differenceMm).toFixed(3)} mm`
}
