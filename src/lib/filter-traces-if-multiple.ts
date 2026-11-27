import type { PcbTrace } from "circuit-json"
import type { HighlightedPrimitive } from "../components/MouseElementTracker"
import type { PhaseSkewTraceIndex } from "./get-phase-skew-at-point"
import {
  type TraceOverlayElementIndex,
  getAssociatedTraceName,
} from "./get-trace-overlay-text"
import { getTraceSegmentDistanceMm } from "./trace-hover"

type HighlightedTrace = HighlightedPrimitive & { _element: PcbTrace }
type Point = { x: number; y: number }

function getNearestTrace({
  traces,
  point,
}: {
  traces: HighlightedTrace[]
  point: Point
}): HighlightedTrace | undefined {
  let nearestTrace: HighlightedTrace | undefined
  let nearestDistanceMm = Infinity
  for (const trace of traces) {
    // Non-line traces have already passed a hit test against their copper.
    const distanceMm = trace.traceSegment
      ? getTraceSegmentDistanceMm({ point, line: trace.traceSegment })
      : 0
    if (distanceMm < nearestDistanceMm) {
      nearestTrace = trace
      nearestDistanceMm = distanceMm
    }
  }
  return nearestTrace
}

export function filterTracesIfMultiple(filterTraces: {
  primitives: HighlightedPrimitive[]
  is_showing_multiple_traces_length: boolean
  traceOverlayElementIndex: TraceOverlayElementIndex
  phaseSkewTraceIndex?: PhaseSkewTraceIndex
  point?: Point
}): HighlightedPrimitive[] {
  const {
    primitives,
    is_showing_multiple_traces_length,
    traceOverlayElementIndex,
    phaseSkewTraceIndex,
    point,
  } = filterTraces

  const traces = primitives.filter(
    (p): p is HighlightedTrace => p._element.type === "pcb_trace",
  )
  const nonTraces = primitives.filter((p) => p._element.type !== "pcb_trace")

  const nearestTrace =
    point &&
    traces.some((trace) => phaseSkewTraceIndex?.[trace._element.pcb_trace_id])
      ? getNearestTrace({ traces, point })
      : undefined

  if (!is_showing_multiple_traces_length) {
    const tooltipTraces = nearestTrace ? [nearestTrace] : traces
    return [
      ...nonTraces,
      ...tooltipTraces.filter(({ _element }) => {
        if (phaseSkewTraceIndex?.[_element.pcb_trace_id]) return true
        const sourceTrace = _element.source_trace_id
          ? traceOverlayElementIndex.sourceTraceById.get(
              _element.source_trace_id,
            )
          : undefined
        return (
          sourceTrace?.max_length !== undefined ||
          getAssociatedTraceName({
            primitiveElement: _element,
            traceOverlayElementIndex,
          }) !== null
        )
      }),
    ]
  }

  if (nearestTrace) return [...nonTraces, nearestTrace]

  // If multiple traces exist, return only the shortest one
  if (traces.length > 1) {
    const shortestTrace = traces.reduce((shortest, current) => {
      const shortestLength = shortest._element.trace_length
      const currentLength = current._element.trace_length
      return currentLength! < shortestLength! ? current : shortest
    }, traces[0])

    return [...nonTraces, shortestTrace]
  }

  return primitives
}
