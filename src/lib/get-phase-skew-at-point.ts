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

/** Returns the stored phase skew of the sample nearest to `point` on `layer`. */
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
    for (const [sample, differenceMm] of [
      [segment.start, segment.start_length_difference_mm],
      [segment.end, segment.end_length_difference_mm],
    ] as const) {
      const distance = Math.hypot(point.x - sample.x, point.y - sample.y)
      if (distance >= nearestDistance) continue
      nearestDistance = distance
      nearestDifference = differenceMm
    }
  }
  return nearestDifference
}

/** Labels a trace that has run farther than its partner as leading and one that has run less as lagging. */
export function getPhaseSkewText(differenceMm: number): string {
  if (Math.abs(differenceMm) < 0.005) return "In phase"
  const direction = differenceMm > 0 ? "Leading" : "Lagging"
  return `${direction} ${Math.abs(differenceMm).toFixed(2)} mm`
}
