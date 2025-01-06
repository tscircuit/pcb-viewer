import { HighlightedPrimitive } from "../components/MouseElementTracker"
import { useGlobalStore } from "global-store"

export function filterTracesIfMultiple(
  primitives: HighlightedPrimitive[],
): HighlightedPrimitive[] {
  const is_showing_multiple_traces_length = useGlobalStore(
    (s) => s.is_showing_multiple_traces_length,
  )

  // Filter traces
  const traces = primitives.filter((p) => p._element.type === "pcb_trace")

  if (traces.length > 1) {
    // If setting is disabled, remove all traces
    if (!is_showing_multiple_traces_length) {
      return primitives.filter((p) => p._element.type !== "pcb_trace")
    }

    // Return all traces
    return traces
  }
  // if one trace return it
  return traces
}
