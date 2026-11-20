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
  /** Length of any via directly before `start`, in mm. */
  startViaLength: number
  /** Length of any via directly after `end`, in mm. */
  endViaLength: number
}

/** A trace's steps in walk order, and its total length including vias, in mm. */
export type TraceWalk = {
  steps: TraceStep[]
  length: number
}

/** A point the route passes through, and the copper arriving at it. */
type RouteCorner = {
  point: Point
  layer: LayerRef
  width: number
  isVia: boolean
}

/**
 * Length each via adds, in mm: the constant core's `getTraceLength` uses
 * for `pcb_trace.trace_length` (a 1.6 mm board), so skew agrees with it.
 */
const VIA_LENGTH = 1.6

/**
 * Splits a trace route into straight pieces in stored route order.
 *
 * Copper arriving at a wire point is on that wire's layer and width, the
 * same rule the viewer draws with. Copper arriving at a via is on the
 * via's `from_layer`, so the run between two vias is on the layer they
 * connect. Each via adds {@link VIA_LENGTH}, as in `pcb_trace.trace_length`.
 *
 * Consecutive pieces that continue in a straight line on the same copper
 * are joined, so how finely a route is split into points doesn't matter.
 */
export function walkTrace(trace: PcbTrace): TraceWalk {
  const steps: TraceStep[] = []
  let distance = 0
  let from: RouteCorner | undefined
  let pendingViaLength = 0
  for (const to of routeCorners(trace)) {
    if (from) {
      const length = Math.hypot(
        to.point.x - from.point.x,
        to.point.y - from.point.y,
      )
      if (length > 0) {
        addStep({
          steps,
          from,
          to,
          startDistance: distance,
          length,
          startViaLength: pendingViaLength,
        })
        pendingViaLength = 0
      }
      distance += length
    }
    if (to.isVia) {
      distance += VIA_LENGTH
      pendingViaLength += VIA_LENGTH
      const previous = steps[steps.length - 1]
      if (previous) previous.endViaLength += VIA_LENGTH
    }
    from = to
  }
  return { steps, length: distance }
}

/** Appends the step from one corner to the next, joining it to the previous step when it carries straight on. */
function addStep({
  steps,
  from,
  to,
  startDistance,
  length,
  startViaLength,
}: {
  steps: TraceStep[]
  from: RouteCorner
  to: RouteCorner
  startDistance: number
  length: number
  /** A via between the previous step and this one adds length, so they can't be joined. */
  startViaLength: number
}): void {
  const step: TraceStep = {
    start: from.point,
    end: to.point,
    layer: to.layer,
    width: to.width,
    startDistance,
    length,
    startViaLength,
    endViaLength: 0,
  }
  const previous = steps[steps.length - 1]
  if (
    previous &&
    startViaLength === 0 &&
    continuesStraight({ previous, next: step })
  ) {
    previous.end = step.end
    previous.length += step.length
    return
  }
  steps.push(step)
}

/** Cosine above which two steps count as one straight line (about 0.003°). */
const STRAIGHT_COSINE = 1 - 1e-9

/** True when `next` carries on from `previous` in a straight line on the same layer and width. */
function continuesStraight({
  previous,
  next,
}: {
  previous: TraceStep
  next: TraceStep
}): boolean {
  if (previous.layer !== next.layer || previous.width !== next.width) {
    return false
  }
  const cosine =
    ((previous.end.x - previous.start.x) * (next.end.x - next.start.x) +
      (previous.end.y - previous.start.y) * (next.end.y - next.start.y)) /
    (previous.length * next.length)
  return cosine >= STRAIGHT_COSINE
}

/** The same copper walked from the other end. Each step keeps its layer and width. */
export function reverseWalk(walk: TraceWalk): TraceWalk {
  return {
    length: walk.length,
    steps: walk.steps
      .map((step) => ({
        ...step,
        start: step.end,
        end: step.start,
        startDistance: walk.length - step.startDistance - step.length,
        startViaLength: step.endViaLength,
        endViaLength: step.startViaLength,
      }))
      .reverse(),
  }
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
        isVia: false,
      })
      continue
    }
    if (routePoint.route_type === "via") {
      corners.push({
        point: { x: routePoint.x, y: routePoint.y },
        layer: routePoint.from_layer,
        width,
        isVia: true,
      })
      continue
    }
    // A through-pad point is a straight run across the pad.
    width = routePoint.width
    corners.push({
      point: routePoint.start,
      layer: routePoint.start_layer,
      width,
      isVia: false,
    })
    corners.push({
      point: routePoint.end,
      layer: routePoint.start_layer,
      width,
      isVia: false,
    })
  }
  return corners
}
