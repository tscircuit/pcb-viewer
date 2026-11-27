import type { AnyCircuitElement, PcbTrace } from "circuit-json"

export function removePhaseSkewWithMissingTraces(
  elements: AnyCircuitElement[],
) {
  if (
    !elements.some(
      (element) => element.type === "pcb_differential_pair_phase_skew",
    )
  ) {
    return elements
  }

  const traceIds = new Set<PcbTrace["pcb_trace_id"]>()
  for (const element of elements) {
    if (element.type === "pcb_trace") traceIds.add(element.pcb_trace_id)
  }

  return elements.filter(
    (element) =>
      element.type !== "pcb_differential_pair_phase_skew" ||
      (traceIds.has(element.positive_trace.pcb_trace_id) &&
        traceIds.has(element.negative_trace.pcb_trace_id)),
  )
}
