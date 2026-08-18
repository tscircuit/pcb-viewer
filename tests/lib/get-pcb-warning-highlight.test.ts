import { describe, expect, test } from "bun:test"
import type {
  PcbConnectorNotInAccessibleOrientationWarning,
  PcbManualEditConflictWarning,
} from "circuit-json"
import {
  getPcbWarningHighlightLabel,
  isHighlightablePcbWarning,
} from "../../src/lib/util/get-pcb-warning-highlight"
import { createConnectorOrientationWarningCircuit } from "../../src/examples/2026/connector-orientation-warnings.fixture"

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

  test("the viewer fixture generates warnings from real connector placement", async () => {
    const circuit = createConnectorOrientationWarningCircuit()

    await circuit.renderUntilSettled()

    const circuitJson = circuit.getCircuitJson()
    const warnings = circuitJson.filter(
      (element): element is PcbConnectorNotInAccessibleOrientationWarning =>
        element.type === "pcb_connector_not_in_accessible_orientation_warning",
    )

    const warningsByComponentName = Object.fromEntries(
      warnings.map((warning) => {
        const sourceComponent = circuitJson.find(
          (element) =>
            element.type === "source_component" &&
            element.source_component_id === warning.source_component_id &&
            "name" in element,
        )

        return [
          sourceComponent && "name" in sourceComponent
            ? sourceComponent.name
            : "unknown",
          warning,
        ]
      }),
    )

    expect(warnings).toHaveLength(2)
    expect(warningsByComponentName.J_CAM).toMatchObject({
      facing_direction: "y-",
      recommended_facing_direction: "y+",
    })
    expect(warningsByComponentName.J_SD).toMatchObject({
      facing_direction: "y+",
      recommended_facing_direction: "y-",
    })

    for (const warning of warnings) {
      const pcbComponent = circuitJson.find(
        (element) =>
          element.type === "pcb_component" &&
          element.pcb_component_id === warning.pcb_component_id,
      )
      expect(pcbComponent).toMatchObject({
        cable_insertion_center: expect.any(Object),
      })
    }
  })
})
