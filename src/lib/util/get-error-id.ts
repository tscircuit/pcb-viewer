export const getErrorId = (error: any, index: number): string => {
  const explicitIdKeys = [
    "pcb_trace_error_id",
    "pcb_via_clearance_error_id",
    "pcb_component_outside_board_error_id",
    "source_failed_to_create_component_error_id",
    "pcb_error_id",
  ]

  for (const key of explicitIdKeys) {
    if (typeof error?.[key] === "string" && error[key].length > 0) {
      return error[key]
    }
  }

  for (const [key, value] of Object.entries(error ?? {})) {
    if (
      key.endsWith("_error_id") &&
      typeof value === "string" &&
      value.length > 0
    ) {
      return value
    }
  }

  return `error_${index}_${error?.error_type}_${error?.message?.slice(0, 20)}`
}
