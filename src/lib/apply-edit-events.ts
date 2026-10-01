import { su, transformPCBElement } from "@tscircuit/circuit-json-util"
import type { ManualEditEvent } from "@tscircuit/props"
import type { CircuitJson, PcbTraceHint } from "circuit-json"
import { translate } from "transformation-matrix"

export function applyEditEvents({
  circuitJson,
  editEvents,
}: {
  circuitJson: CircuitJson
  editEvents: ManualEditEvent[]
}): CircuitJson {
  let editedCircuitJson = structuredClone(circuitJson)

  for (const editEvent of editEvents) {
    if (editEvent.edit_event_type === "edit_pcb_component_location") {
      const pcbComponent = su(editedCircuitJson).pcb_component.get(
        editEvent.pcb_component_id,
      )
      const isAlreadyAtEditedCenter =
        pcbComponent?.center.x === editEvent.new_center.x &&
        pcbComponent.center.y === editEvent.new_center.y
      if (isAlreadyAtEditedCenter) continue

      const pcbToEditedPcbTransform = translate(
        editEvent.new_center.x - editEvent.original_center.x,
        editEvent.new_center.y - editEvent.original_center.y,
      )
      editedCircuitJson = editedCircuitJson.map((element) =>
        "pcb_component_id" in element &&
        element.pcb_component_id === editEvent.pcb_component_id
          ? transformPCBElement(element, pcbToEditedPcbTransform)
          : element,
      )
      continue
    }

    if (editEvent.edit_event_type === "edit_schematic_component_location") {
      editedCircuitJson = editedCircuitJson.map((element) =>
        element.type === "schematic_component" &&
        element.schematic_component_id === editEvent.schematic_component_id
          ? { ...element, center: editEvent.new_center }
          : element,
      )
      continue
    }

    if (editEvent.edit_event_type !== "edit_pcb_trace_hint") continue
    if (!editEvent.pcb_trace_hint_id) continue

    const pcbTraceHint = su(editedCircuitJson).pcb_trace_hint.get(
      editEvent.pcb_trace_hint_id,
    )
    if (pcbTraceHint) {
      editedCircuitJson = editedCircuitJson.map((element) =>
        element.type === "pcb_trace_hint" &&
        element.pcb_trace_hint_id === editEvent.pcb_trace_hint_id
          ? { ...element, route: editEvent.route }
          : element,
      )
      continue
    }

    const pcbPort = su(editedCircuitJson).pcb_port.get(editEvent.pcb_port_id)
    if (!pcbPort?.pcb_component_id) continue

    const newPcbTraceHint: PcbTraceHint = {
      type: "pcb_trace_hint",
      pcb_trace_hint_id: editEvent.pcb_trace_hint_id,
      route: editEvent.route,
      pcb_port_id: editEvent.pcb_port_id,
      pcb_component_id: pcbPort.pcb_component_id,
    }
    editedCircuitJson = editedCircuitJson
      .filter(
        (element) =>
          element.type !== "pcb_trace_hint" ||
          element.pcb_port_id !== editEvent.pcb_port_id,
      )
      .concat(newPcbTraceHint)
  }

  return editedCircuitJson
}
