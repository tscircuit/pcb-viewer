import type { HighlightedPrimitive } from "../components/MouseElementTracker"
import {
  type TraceOverlayElementIndex,
  getAssociatedTraceName,
} from "./get-trace-overlay-text"

const getComparableTraceLength = (traceLength?: number): number =>
  typeof traceLength === "number" && Number.isFinite(traceLength)
    ? traceLength
    : Number.POSITIVE_INFINITY

const deduplicateTraces = <
  T extends HighlightedPrimitive & {
    _element: {
      type: "pcb_trace"
      pcb_trace_id?: string
      trace_length?: number
    }
  },
>(
  traces: T[],
): T[] => {
  const seenElements = new Set<unknown>()
  const seenIds = new Set<string>()
  const unique: T[] = []

  for (const trace of traces) {
    const traceId = trace._element.pcb_trace_id
    if (traceId) {
      if (seenIds.has(traceId)) continue
      seenIds.add(traceId)
    } else {
      if (seenElements.has(trace._element)) continue
      seenElements.add(trace._element)
    }
    unique.push(trace)
  }

  return unique
}

const pickShortestTrace = <
  T extends HighlightedPrimitive & {
    _element: {
      type: "pcb_trace"
      trace_length?: number
    }
  },
>(
  traces: T[],
): T =>
  traces.reduce((shortest, current) => {
    const shortestLength = getComparableTraceLength(
      shortest._element.trace_length,
    )
    const currentLength = getComparableTraceLength(
      current._element.trace_length,
    )
    return currentLength < shortestLength ? current : shortest
  }, traces[0]!)

export function filterTracesIfMultiple(filterTraces: {
  primitives: HighlightedPrimitive[]
  is_showing_multiple_traces_length: boolean
  traceOverlayElementIndex: TraceOverlayElementIndex
}): HighlightedPrimitive[] {
  const {
    primitives,
    is_showing_multiple_traces_length,
    traceOverlayElementIndex,
  } = filterTraces

  // Filter traces to get only PCB traces and deduplicate segments of the same trace
  const traces = deduplicateTraces(
    primitives.filter(
      (
        p,
      ): p is HighlightedPrimitive & {
        _element: {
          type: "pcb_trace"
          pcb_trace_id?: string
          source_trace_id?: string
          trace_length?: number
        }
      } => p._element.type === "pcb_trace",
    ),
  )

  // Get non-trace primitives
  const nonTraces = primitives.filter((p) => p._element.type !== "pcb_trace")

  // Named traces and nets should always have a hover label, even when the
  // viewer is configured to hide ordinary trace-length overlays.
  const tracesWithPersistentOverlay = traces.filter((trace) => {
    const sourceTrace = trace._element.source_trace_id
      ? traceOverlayElementIndex.sourceTraceById.get(
          trace._element.source_trace_id,
        )
      : undefined
    const hasMaxLength = sourceTrace?.max_length !== undefined
    const hasDisplayName = Boolean(sourceTrace?.display_name?.trim())

    return (
      hasMaxLength ||
      hasDisplayName ||
      getAssociatedTraceName({
        primitiveElement: trace._element as any,
        traceOverlayElementIndex,
      }) !== null
    )
  })

  // If not showing multiple trace lengths, keep only overlays that carry
  // important metadata (a configured max length or a source name).
  if (!is_showing_multiple_traces_length) {
    if (tracesWithPersistentOverlay.length > 1) {
      return [...nonTraces, pickShortestTrace(tracesWithPersistentOverlay)]
    }
    return [...nonTraces, ...tracesWithPersistentOverlay]
  }

  // If multiple traces exist, return only the shortest one
  if (traces.length > 1) {
    return [...nonTraces, pickShortestTrace(traces)]
  }

  return [...nonTraces, ...traces]
}
