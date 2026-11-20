import type { AnyCircuitElement, PcbTraceError } from "circuit-json"
import type { BitmapShort } from "./load-check-shorts-module"

const MAX_LABELS_PER_SIDE = 3

const formatOwnerLabels = (labels: string[]): string => {
  if (labels.length === 0) return "(unknown)"
  const shown = labels.slice(0, MAX_LABELS_PER_SIDE).join(", ")
  const hiddenCount = labels.length - MAX_LABELS_PER_SIDE
  return hiddenCount > 0 ? `${shown} +${hiddenCount} more` : shown
}

/**
 * Circuit JSON has no short error, so shorts are shown as trace errors: that
 * gives them a marker on the board and an entry in the toolbar error list.
 * These elements only exist inside the viewer.
 */
export const convertShortsToErrorElements = (
  shorts: BitmapShort[],
): AnyCircuitElement[] =>
  shorts.map((short, index) => {
    const error: Omit<PcbTraceError, "error_type"> & {
      error_type: "pcb_short_error"
    } = {
      type: "pcb_trace_error",
      error_type: "pcb_short_error",
      pcb_trace_error_id: `pcb_short_error_${index}`,
      message: `Short on ${short.layer} layer: ${formatOwnerLabels(
        short.firstOwnerLabels,
      )} is touching ${formatOwnerLabels(short.secondOwnerLabels)}`,
      center: short.center,
      pcb_trace_id: "",
      source_trace_id: "",
      pcb_component_ids: [],
      pcb_port_ids: [],
    }
    return error as unknown as AnyCircuitElement
  })
