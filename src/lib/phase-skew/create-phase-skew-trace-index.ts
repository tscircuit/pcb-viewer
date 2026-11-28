import type {
  AnyCircuitElement,
  PcbDifferentialPairPhaseSkewTrace,
} from "circuit-json"

export type PhaseSkewTraceIndex = Record<
  string,
  PcbDifferentialPairPhaseSkewTrace | undefined
>

export function createPhaseSkewTraceIndex(
  elements: AnyCircuitElement[],
): PhaseSkewTraceIndex {
  const index: PhaseSkewTraceIndex = {}
  for (const element of elements) {
    if (element.type !== "pcb_differential_pair_phase_skew") continue
    index[element.positive_trace.pcb_trace_id] = element.positive_trace
    index[element.negative_trace.pcb_trace_id] = element.negative_trace
  }
  return index
}
