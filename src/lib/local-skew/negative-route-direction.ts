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
 * Whether a shared start or end component (the same IC or connector) says
 * the negative route is stored from the other end than the positive one.
 * Undefined when no component is shared with exactly one end (none, or all
 * four pads on one part as on a loopback).
 */
export function componentsSayNegativeReversed({
  positiveTrace,
  negativeTrace,
  portComponents,
}: {
  positiveTrace: PcbTrace
  negativeTrace: PcbTrace
  portComponents: PortComponents
}): boolean | undefined {
  const positive = routeEndComponents({ trace: positiveTrace, portComponents })
  const negative = routeEndComponents({ trace: negativeTrace, portComponents })
  for (const shared of [positive.start, positive.end]) {
    if (shared === undefined) continue
    const sameEnd =
      (shared === positive.start && shared === negative.start) ||
      (shared === positive.end && shared === negative.end)
    const otherEnd =
      (shared === positive.start && shared === negative.end) ||
      (shared === positive.end && shared === negative.start)
    if (sameEnd && !otherEnd) return false
    if (otherEnd && !sameEnd) return true
  }
  return undefined
}

/**
 * Whether the route ends say the negative route is stored from the other
 * end: true when its ends lie closer to the positive route's ends that way.
 */
export function endsSayNegativeReversed({
  positiveSteps,
  negativeSteps,
}: {
  positiveSteps: TraceStep[]
  negativeSteps: TraceStep[]
}): boolean {
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
