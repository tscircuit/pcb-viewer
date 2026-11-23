import type { PcbTrace } from "circuit-json"
import type { DifferentialPairPhaseSkew } from "circuit-json-to-differential-pair-phase-skew"

/** Decimal places shown for lengths in mm, as in the trace length readout. */
const LENGTH_DECIMALS = 3

/**
 * The hover line for a trace of a differential pair while phase skew is
 * shown: the pair's peak phase skew and, when the pair sets a limit, its end
 * to end length skew against it. Undefined for a trace outside every pair.
 */
export function getPhaseSkewLabel({
  differentialPairPhaseSkews,
  pcb_trace_id,
}: {
  differentialPairPhaseSkews: DifferentialPairPhaseSkew[]
  pcb_trace_id: PcbTrace["pcb_trace_id"]
}): string | undefined {
  const differentialPairPhaseSkew = differentialPairPhaseSkews.find(
    (candidate) =>
      candidate.positive_trace.pcb_trace_id === pcb_trace_id ||
      candidate.negative_trace.pcb_trace_id === pcb_trace_id,
  )
  if (differentialPairPhaseSkew === undefined) return undefined
  const { max_abs_phase_skew, end_to_end_length_delta, max_length_skew } =
    differentialPairPhaseSkew
  let label = "phase skew unknown"
  if (max_abs_phase_skew !== undefined) {
    label = `phase skew max ${max_abs_phase_skew.toFixed(LENGTH_DECIMALS)} mm`
  }
  if (max_length_skew === undefined) return label
  const lengthSkew = Math.abs(end_to_end_length_delta).toFixed(LENGTH_DECIMALS)
  return `${label}, length skew ${lengthSkew} / ${max_length_skew} mm`
}
