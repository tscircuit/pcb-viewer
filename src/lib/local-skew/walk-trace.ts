import type { Point } from "@tscircuit/math-utils"
import type { LayerRef, PcbTrace } from "circuit-json"

/** One straight copper piece of a trace, and how far along the trace it starts. */
export type TraceStep = {
  start: Point
  end: Point
  layer: LayerRef
  width: number
  /** Distance along the walk from its first point to `start`, in mm. */
  startDistance: number
  length: number
}

/** A point the route passes through, and the copper arriving at it. */
type RouteCorner = {
  point: Point
  layer: LayerRef
  width: number
}

/**
 * Splits a trace route into straight pieces in stored route order.
 *
 * Copper arriving at a wire point is on that wire's layer and width, the
 * same rule the viewer draws with. Copper arriving at a via is on the
 * via's `from_layer`, so the run between two vias is on the layer they
 * connect. Via barrels add no length, matching `pcb_trace.trace_length`.
 */
export function walkTrace(trace: PcbTrace): TraceStep[] {
  const corners = routeCorners(trace)
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
    steps.push({
      start: from.point,
      end: to.point,
      layer: to.layer,
      width: to.width,
      startDistance: distance,
      length,
    })
    distance += length
  }
  return steps
}

/** The same copper walked from the other end. Each step keeps its layer and width. */
export function reverseWalk(steps: TraceStep[]): TraceStep[] {
  const last = steps[steps.length - 1]
  const totalLength = last.startDistance + last.length
  return steps
    .map((step) => ({
      ...step,
      start: step.end,
      end: step.start,
      startDistance: totalLength - step.startDistance - step.length,
    }))
    .reverse()
}

/** The route's points in order, each with the copper arriving at it. */
function routeCorners(trace: PcbTrace): RouteCorner[] {
  const corners: RouteCorner[] = []
  let width = 0
  for (const routePoint of trace.route) {
    if (routePoint.route_type === "wire") {
      width = routePoint.width
      corners.push({
        point: { x: routePoint.x, y: routePoint.y },
        layer: routePoint.layer,
        width,
      })
      continue
    }
    if (routePoint.route_type === "via") {
      corners.push({
        point: { x: routePoint.x, y: routePoint.y },
        layer: routePoint.from_layer,
        width,
      })
      continue
    }
    // A through-pad point is a straight run across the pad.
    width = routePoint.width
    corners.push({
      point: routePoint.start,
      layer: routePoint.start_layer,
      width,
    })
    corners.push({
      point: routePoint.end,
      layer: routePoint.start_layer,
      width,
    })
  }
  return corners
}
