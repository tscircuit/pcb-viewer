import type { Point } from "@tscircuit/math-utils"
import type { LayerRef, PcbTrace, PcbTraceRoutePoint } from "circuit-json"

/** One straight copper piece of a trace, and how far along the trace it starts. */
export type TraceStep = {
  start: Point
  end: Point
  layer: LayerRef
  width: number
  /** Distance along the trace from its first route point to `start`, in mm. */
  startDistance: number
  length: number
}

/** A point the trace passes through, with the copper leaving it. Vias have no copper of their own. */
type TraceCorner = {
  point: Point
  copper: { layer: LayerRef; width: number } | null
}

/**
 * Splits a trace route into straight pieces in route order. Via points
 * change layer but add no length, matching `pcb_trace.trace_length`.
 */
export function walkTrace({
  trace,
  reverse,
}: {
  trace: PcbTrace
  /** Walk from the last route point to the first. */
  reverse: boolean
}): TraceStep[] {
  const corners = trace.route.flatMap((routePoint) => cornersOf(routePoint))
  if (reverse) corners.reverse()

  const steps: TraceStep[] = []
  let distance = 0
  for (let i = 0; i + 1 < corners.length; i++) {
    const from = corners[i]
    const to = corners[i + 1]
    const length = Math.hypot(
      to.point.x - from.point.x,
      to.point.y - from.point.y,
    )
    if (length === 0) continue

    // A step leaving a via takes the copper it reaches.
    const copper = from.copper ?? to.copper
    if (!copper) continue

    steps.push({
      start: from.point,
      end: to.point,
      layer: copper.layer,
      width: copper.width,
      startDistance: distance,
      length,
    })
    distance += length
  }
  return steps
}

/** The points a route point contributes. A through-pad point is a straight run across the pad. */
function cornersOf(routePoint: PcbTraceRoutePoint): TraceCorner[] {
  if (routePoint.route_type === "via") {
    return [{ point: { x: routePoint.x, y: routePoint.y }, copper: null }]
  }
  if (routePoint.route_type === "wire") {
    return [
      {
        point: { x: routePoint.x, y: routePoint.y },
        copper: { layer: routePoint.layer, width: routePoint.width },
      },
    ]
  }
  return [
    {
      point: routePoint.start,
      copper: { layer: routePoint.start_layer, width: routePoint.width },
    },
    {
      point: routePoint.end,
      copper: { layer: routePoint.end_layer, width: routePoint.width },
    },
  ]
}
