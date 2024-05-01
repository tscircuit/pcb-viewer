export type EditComponentLocationEvent = {
  edit_event_id: string
  pcb_edit_event_type: "edit_component_location"
  pcb_component_id: string
  original_center: { x: number; y: number }
  new_center: { x: number; y: number }
}

export type EditEvent = EditComponentLocationEvent
