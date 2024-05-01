import { AnySoupElement } from "@tscircuit/builder"
import { EditEvent } from "./edit-events"

export const applyEditEvents = (
  soup: AnySoupElement[],
  edit_events: EditEvent[]
): AnySoupElement[] => {
  soup = JSON.parse(JSON.stringify(soup))

  for (const edit_event of edit_events) {
    if (edit_event.pcb_edit_event_type === "edit_component_location") {
      const component = soup.find(
        (element) => element.id === edit_event.pcb_component_id
      )
      if (component) {
        component.center = edit_event.new_center
      }
    }
  }

  return soup
}
