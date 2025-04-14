import { transformPCBElement, transformPCBElements } from "@tscircuit/soup-util"
import type { AnyCircuitElement, PcbComponent } from "circuit-json"
import type { EditEvent } from "./edit-events"
import { translate } from "transformation-matrix"
import { applyTraceHintEditEvent } from "./apply-edit-events/apply-edit-trace-hint-event"

export const applyEditEvents = (
  circuitJson: AnyCircuitElement[],
  edit_events: EditEvent[],
): AnyCircuitElement[] => {
  let updatedCircuitJson = [...circuitJson]

  for (const edit_event of edit_events) {
    if (edit_event.edit_event_type === "edit_pcb_component_location") {
      // Check if the component already has the position specified in the edit event
      const component = updatedCircuitJson.find(
        (e: AnyCircuitElement) => e.type === "pcb_component" && e.pcb_component_id === edit_event.pcb_component_id
      ) as PcbComponent;
      
      // Only apply the movement if the component isn't already at the target position
      const needsMovement = !component || 
        component.center.x !== edit_event.new_center.x || 
        component.center.y !== edit_event.new_center.y;
      
      if (needsMovement) {
        const mat = translate(
          edit_event.new_center.x - edit_event.original_center.x,
          edit_event.new_center.y - edit_event.original_center.y,
        )
        updatedCircuitJson = updatedCircuitJson.map((e: any) =>
          e.pcb_component_id !== edit_event.pcb_component_id
            ? e
            : transformPCBElement(e, mat),
        )
      }
    } else if (edit_event.edit_event_type === "edit_pcb_trace_hint") {
      updatedCircuitJson = applyTraceHintEditEvent(updatedCircuitJson, edit_event)
    }
  }

  return updatedCircuitJson
}