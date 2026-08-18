import { describe, expect, test } from "bun:test"
import type {
  PcbConnectorNotInAccessibleOrientationWarning,
  PcbManualEditConflictWarning,
} from "circuit-json"
import {
  getPcbWarningHighlightLabel,
  isHighlightablePcbWarning,
} from "../../src/lib/util/get-pcb-warning-highlight"

describe("PCB warning highlights", () => {
  test("recognizes connector orientation warnings and describes the fix", () => {
    const warning: PcbConnectorNotInAccessibleOrientationWarning = {
      type: "pcb_connector_not_in_accessible_orientation_warning",
      warning_type: "pcb_connector_not_in_accessible_orientation_warning",
      pcb_connector_not_in_accessible_orientation_warning_id:
        "pcb_connector_not_in_accessible_orientation_warning_0",
      message: "component is facing y- but should face y+",
      pcb_component_id: "pcb_component_0",
      facing_direction: "y-",
      recommended_facing_direction: "y+",
    }

    expect(isHighlightablePcbWarning(warning)).toBe(true)
    expect(getPcbWarningHighlightLabel(warning)).toBe(
      "Connector faces y-; expected y+",
    )
  })

  test("keeps manual edit conflict warnings highlighted", () => {
    const warning: PcbManualEditConflictWarning = {
      type: "pcb_manual_edit_conflict_warning",
      warning_type: "pcb_manual_edit_conflict_warning",
      pcb_manual_edit_conflict_warning_id: "pcb_manual_edit_conflict_warning_0",
      message: "manual placement differs",
      pcb_component_id: "pcb_component_0",
      source_component_id: "source_component_0",
    }

    expect(isHighlightablePcbWarning(warning)).toBe(true)
    expect(getPcbWarningHighlightLabel(warning)).toBe("Manual Edit Conflict")
  })
})
