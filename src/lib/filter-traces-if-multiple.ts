import { HighlightedPrimitive } from "../components/MouseElementTracker"

export function filterTracesIfMultiple(filterTraces: {
  primitives: HighlightedPrimitive[]
  is_showing_multiple_traces_length: boolean
}): HighlightedPrimitive[] {
  const { primitives, is_showing_multiple_traces_length } = filterTraces
  // Filter traces to get only the shortest one
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

  if (traces.length > 1) {
    // TODO implement dropdown called "View" to the PCB Viewer menu
    //  to choose if we want to display multiple traces when we hover on them

    // Ignore all traces if we hover on multiple traces
    if (!is_showing_multiple_traces_length)
      return primitives.filter((p) => p._element.type !== "pcb_trace")

    const shortestTrace = traces.reduce((shortest, current) => {
      const shortestLength = shortest._element.trace_length
      const currentLength = current._element.trace_length
      return currentLength! < shortestLength! ? current : shortest
    }, traces[0])

    return primitives
      .filter((p) => p._element.type !== "pcb_trace")
      .concat([shortestTrace])
  }

  return primitives
}
