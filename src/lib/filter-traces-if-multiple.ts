import type { AnyCircuitElement } from "circuit-json";
import type { HighlightedPrimitive } from "../components/MouseElementTracker";
import { getAssociatedTraceName } from "./get-trace-overlay-text";

export function filterTracesIfMultiple(filterTraces: {
  primitives: HighlightedPrimitive[];
  is_showing_multiple_traces_length: boolean;
  elements: AnyCircuitElement[];
}): HighlightedPrimitive[] {
  const { primitives, is_showing_multiple_traces_length, elements } =
    filterTraces;

  // Filter traces to get only PCB traces
  const traces = primitives.filter(
    (
      p,
    ): p is HighlightedPrimitive & {
      _element: {
        type: "pcb_trace";
        trace_length?: number;
      };
    } => p._element.type === "pcb_trace",
  );

  // Find all source traces
  const sourceTraces = elements.filter((e) => e.type === "source_trace");

  // Get non-trace primitives
  const nonTraces = primitives.filter((p) => p._element.type !== "pcb_trace");

  // Named traces and nets should always have a hover label, even when the
  // viewer is configured to hide ordinary trace-length overlays.
  const tracesWithPersistentOverlay = traces.filter((trace) => {
    const hasMaxLength = sourceTraces.some(
      (sourceTrace) =>
        trace._element.source_trace_id === sourceTrace.source_trace_id &&
        sourceTrace.max_length !== undefined,
    );

    return (
      hasMaxLength ||
      getAssociatedTraceName({
        primitiveElement: trace._element,
        elements,
      }) !== null
    );
  });

  // If not showing multiple trace lengths, keep only overlays that carry
  // important metadata (a configured max length or a source name).
  if (!is_showing_multiple_traces_length) {
    return [...nonTraces, ...tracesWithPersistentOverlay];
  }

  // If multiple traces exist, return only the shortest one
  if (traces.length > 1) {
    const shortestTrace = traces.reduce((shortest, current) => {
      const shortestLength = shortest._element.trace_length;
      const currentLength = current._element.trace_length;
      return currentLength! < shortestLength! ? current : shortest;
    }, traces[0]);

    return [...nonTraces, shortestTrace];
  }

  return primitives;
}
