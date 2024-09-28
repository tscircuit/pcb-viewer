import { transformPCBElement, transformPCBElements } from "@tscircuit/soup-util"
import type { AnyCircuitElement } from "circuit-json"
import type { EditEvent } from "./edit-events"
import { translate } from "transformation-matrix"
import { applyTraceHintEditEvent } from "./apply-edit-events/apply-edit-trace-hint-event"

export const applyEditEvents = (
  soup: AnyCircuitElement[],
  edit_events: EditEvent[],
): AnyCircuitElement[] => {
  soup = JSON.parse(JSON.stringify(soup))

  for (const edit_event of edit_events) {
    if (edit_event.pcb_edit_event_type === "edit_component_location") {
      const mat = translate(
        edit_event.new_center.x - edit_event.original_center.x,
        edit_event.new_center.y - edit_event.original_center.y,
      )
      // TODO Future work: recurse here in case there's a nested component
      soup = soup.map((e: any) =>
        e.pcb_component_id !== edit_event.pcb_component_id
          ? e
          : transformPCBElement(e, mat),
      )
    } else if (edit_event.pcb_edit_event_type === "edit_trace_hint") {
      soup = applyTraceHintEditEvent(soup, edit_event)
    }
  }

  return soup
}
