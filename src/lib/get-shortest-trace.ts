import { HighlightedPrimitive } from "../components/MouseElementTracker"

export function getShortestTrace(
  primitives: HighlightedPrimitive[],
): HighlightedPrimitive[] {
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
