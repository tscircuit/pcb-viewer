import { AnyCircuitElement } from "circuit-json"
import { HighlightedPrimitive } from "../components/MouseElementTracker"

export function filterTracesIfMultiple(filterTraces: {
  primitives: HighlightedPrimitive[]
  is_showing_multiple_traces_length: boolean
  elements: AnyCircuitElement[]
}): HighlightedPrimitive[] {
  const { primitives, is_showing_multiple_traces_length, elements } =
    filterTraces

  // Filter traces to get only PCB traces
  const traces = primitives.filter(
    (
      p,
    ): p is HighlightedPrimitive & {
      _element: {
        type: "pcb_trace"
        trace_length?: number
      }
    } => p._element.type === "pcb_trace",
  )

  // Find all source traces
  const sourceTraces = elements.filter((e) => e.type === "source_trace")

  // Get non-trace primitives
  const nonTraces = primitives.filter((p) => p._element.type !== "pcb_trace")

  // Find traces that have corresponding source traces with max_length
  const tracesWithMaxLength = traces.filter((trace) =>
    sourceTraces.some(
      (sourceTrace) =>
        trace._element.type === "pcb_trace" &&
        trace._element.source_trace_id === sourceTrace.source_trace_id &&
        sourceTrace.max_length !== undefined,
    ),
  )

  // If not showing multiple traces length, return non-traces and traces with ma
  length
  if (!is_showing_multiple_traces_length) {
    return [...nonTraces, ...tracesWithMaxLength]
  }

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
