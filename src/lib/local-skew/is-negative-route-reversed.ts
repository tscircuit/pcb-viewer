import type { Point } from "@tscircuit/math-utils"
import type { PcbComponent, PcbPort, PcbTrace } from "circuit-json"
import type { TraceStep } from "./walk-trace"

/** The pcb_component each pcb_port belongs to. */
export type PortComponents = Map<
  PcbPort["pcb_port_id"],
  PcbComponent["pcb_component_id"]
>

/** The components a route starts and ends on, when its end points name their ports. */
type RouteEndComponents = {
  start?: PcbComponent["pcb_component_id"]
  end?: PcbComponent["pcb_component_id"]
}

/**
 * True when the negative route is stored from the other end than the
 * positive one. A shared start or end component (the same IC or connector)
 * decides it; otherwise the route ends that lie closer together are taken
 * as the same end.
 */
export function isNegativeRouteReversed({
  positiveTrace,
  negativeTrace,
  positiveSteps,
  negativeSteps,
  portComponents,
}: {
  positiveTrace: PcbTrace
  negativeTrace: PcbTrace
  positiveSteps: TraceStep[]
  negativeSteps: TraceStep[]
  portComponents: PortComponents
}): boolean {
  const positive = routeEndComponents({ trace: positiveTrace, portComponents })
  const negative = routeEndComponents({ trace: negativeTrace, portComponents })
  if (positive.start !== undefined && positive.start === negative.start) {
    return false
  }
  if (positive.start !== undefined && positive.start === negative.end) {
    return true
  }
  if (positive.end !== undefined && positive.end === negative.end) return false
  if (positive.end !== undefined && positive.end === negative.start) {
    return true
  }

  const positiveStart = positiveSteps[0].start
  const positiveEnd = positiveSteps[positiveSteps.length - 1].end
  const negativeStart = negativeSteps[0].start
  const negativeEnd = negativeSteps[negativeSteps.length - 1].end
  const sameDirection =
    distance({ a: positiveStart, b: negativeStart }) +
    distance({ a: positiveEnd, b: negativeEnd })
  const oppositeDirection =
    distance({ a: positiveStart, b: negativeEnd }) +
    distance({ a: positiveEnd, b: negativeStart })
  return oppositeDirection < sameDirection
}

/** The components named by a route's first and last points. */
function routeEndComponents({
  trace,
  portComponents,
}: {
  trace: PcbTrace
  portComponents: PortComponents
}): RouteEndComponents {
  const ends: RouteEndComponents = {}
  const first = trace.route[0]
  const last = trace.route[trace.route.length - 1]
  if (first?.route_type === "wire" && first.start_pcb_port_id !== undefined) {
    ends.start = portComponents.get(first.start_pcb_port_id)
  }
  if (last?.route_type === "wire" && last.end_pcb_port_id !== undefined) {
    ends.end = portComponents.get(last.end_pcb_port_id)
  }
  return ends
}

/** Straight-line distance between two points, in mm. */
function distance({ a, b }: { a: Point; b: Point }): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}
