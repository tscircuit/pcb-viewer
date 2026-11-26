import type {
  AnyCircuitElement,
  LayerRef,
  PcbDifferentialPairPhaseSkewSegment,
  PcbTrace,
} from "circuit-json"

export const UNKNOWN_PHASE_SKEW_COLOR = "#808080"

type Point = { x: number; y: number }
type PhaseSkewTraceIndex = Map<
  string,
  readonly PcbDifferentialPairPhaseSkewSegment[]
>

/** Pair membership is independent of whether the calculator found matched spans. */
export function getLocalPhaseSkewTraceIndex(elements: AnyCircuitElement[]) {
  const sourceTraceIds = new Set<string>()
  const index: PhaseSkewTraceIndex = new Map()
  for (const element of elements) {
    if (element.type === "source_bus" && element.differential_pair) {
      const pair = element.differential_pair
      sourceTraceIds.add(pair.positive_source_trace_id)
      sourceTraceIds.add(pair.negative_source_trace_id)
    }
    if (element.type === "pcb_differential_pair_phase_skew") {
      for (const trace of [element.positive_trace, element.negative_trace]) {
        index.set(trace.pcb_trace_id, trace.segments)
      }
    }
  }

  if (sourceTraceIds.size) {
    for (const element of elements) {
      if (
        element.type === "pcb_trace" &&
        element.source_trace_id &&
        sourceTraceIds.has(element.source_trace_id) &&
        !index.has(element.pcb_trace_id)
      ) {
        index.set(element.pcb_trace_id, [])
      }
    }
  }
  return index
}

function project(point: Point, start: Point, end: Point) {
  const dx = end.x - start.x
  const dy = end.y - start.y
  const lengthSquared = dx * dx + dy * dy
  const t = lengthSquared
    ? Math.max(
        0,
        Math.min(
          1,
          ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared,
        ),
      )
    : 0
  return {
    distance: Math.hypot(
      point.x - start.x - t * dx,
      point.y - start.y - t * dy,
    ),
    t,
  }
}

/** Find the saved skew at the cursor; never infer zero from missing data. */
export function getLocalPhaseSkewAtPoint({
  segments,
  layer,
  point,
}: {
  segments: readonly PcbDifferentialPairPhaseSkewSegment[]
  layer: LayerRef
  point: Point
}) {
  let distance = Number.POSITIVE_INFINITY
  let skew: number | undefined
  for (const segment of segments) {
    if (segment.layer !== layer) continue
    const hit = project(point, segment.start, segment.end)
    if (hit.distance > segment.width * 0.55 || hit.distance >= distance)
      continue
    distance = hit.distance
    skew =
      segment.start_length_difference_mm * (1 - hit.t) +
      segment.end_length_difference_mm * hit.t
  }
  return skew
}

/** Confirm actual copper, not a hover primitive bridging a route layer change. */
export function isPointOnTraceCopper(
  trace: PcbTrace,
  layer: LayerRef,
  point: Point,
) {
  const route = trace.route
  for (const [index, a] of route.entries()) {
    if (a.route_type === "through_pad") {
      if (
        (layer === a.start_layer || layer === a.end_layer) &&
        project(point, a.start, a.end).distance <= a.width / 2
      )
        return true
    }
    const b = route[index + 1]
    if (!b) continue
    if (a.route_type === "via" && b.route_type === "via") continue
    const start = a.route_type === "through_pad" ? a.end : a
    const end = b.route_type === "through_pad" ? b.start : b
    const startsOnLayer =
      a.route_type === "wire"
        ? a.layer === layer
        : a.route_type === "through_pad"
          ? a.end_layer === layer
          : a.from_layer === layer || a.to_layer === layer
    const endsOnLayer =
      b.route_type === "wire"
        ? b.layer === layer
        : b.route_type === "through_pad"
          ? b.start_layer === layer
          : b.from_layer === layer || b.to_layer === layer
    if (!startsOnLayer || !endsOnLayer) continue
    const width =
      a.route_type !== "via" ? a.width : b.route_type !== "via" ? b.width : 0
    if (project(point, start, end).distance <= width / 2) return true
  }
  return false
}
