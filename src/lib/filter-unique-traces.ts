import { HighlightedPrimitive } from "../components/MouseElementTracker"

export function getHoveredTraces(
  primitives: HighlightedPrimitive[],
): HighlightedPrimitive[] {
  // If only traces are present, return unique traces
  if (primitives.some((p) => p._element.type === "pcb_trace")) {
    return primitives
      .filter((p) => p._element.type === "pcb_trace")
      .filter(
        (trace, index, self) =>
          index ===
          self.findIndex(
            (t) =>
              (t._element as any).pcb_trace_id ===
              (trace._element as any).pcb_trace_id,
          ),
      )
  }

  // Return all other elements as is
  return primitives
}
