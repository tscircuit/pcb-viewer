import { applyEditEvents } from "@tscircuit/core"
import type { ManualEditEvent } from "@tscircuit/props"
import type { AnyCircuitElement } from "circuit-json"

/**
 * Wraps applyEditEvents and ensures silkscreen elements move with their parent components.
 * This fixes the issue where silkscreen lines don't move when applying manual edit events.
 */
export function applyEditEventsWithSilkscreenFix({
  circuitJson,
  editEvents,
}: {
  circuitJson: AnyCircuitElement[]
  editEvents: ManualEditEvent[]
}): AnyCircuitElement[] {
  // First apply the standard edit events
  let result = applyEditEvents({
    circuitJson: circuitJson as any,
    editEvents,
  })

  // For each component location edit event, calculate the translation
  // and apply it to silkscreen elements that weren't transformed
  for (const editEvent of editEvents) {
    if (
      editEvent.edit_event_type === "edit_pcb_component_location" &&
      editEvent.original_center &&
      editEvent.new_center
    ) {
      const dx = editEvent.new_center.x - editEvent.original_center.x
      const dy = editEvent.new_center.y - editEvent.original_center.y

      // Only proceed if there's actual movement
      if (dx === 0 && dy === 0) continue

      result = result.map((element: any) => {
        // Check if this element belongs to the moved component
        if (element.pcb_component_id !== editEvent.pcb_component_id) {
          return element
        }

        // Transform silkscreen line elements
        if (element.type === "pcb_silkscreen_line") {
          return {
            ...element,
            x1: element.x1 + dx,
            y1: element.y1 + dy,
            x2: element.x2 + dx,
            y2: element.y2 + dy,
          }
        }

        // Transform silkscreen path elements
        if (element.type === "pcb_silkscreen_path") {
          return {
            ...element,
            route: element.route?.map((point: { x: number; y: number }) => ({
              x: point.x + dx,
              y: point.y + dy,
            })),
          }
        }

        // Transform silkscreen circle elements
        if (element.type === "pcb_silkscreen_circle") {
          return {
            ...element,
            center: {
              x: element.center.x + dx,
              y: element.center.y + dy,
            },
          }
        }

        // Transform silkscreen rect elements
        if (element.type === "pcb_silkscreen_rect") {
          return {
            ...element,
            center: {
              x: element.center.x + dx,
              y: element.center.y + dy,
            },
          }
        }

        // Transform silkscreen oval elements
        if (element.type === "pcb_silkscreen_oval") {
          return {
            ...element,
            center: {
              x: element.center.x + dx,
              y: element.center.y + dy,
            },
          }
        }

        // Transform silkscreen pill elements
        if (element.type === "pcb_silkscreen_pill") {
          return {
            ...element,
            center: {
              x: element.center.x + dx,
              y: element.center.y + dy,
            },
          }
        }

        // Transform silkscreen text elements
        if (element.type === "pcb_silkscreen_text") {
          return {
            ...element,
            anchor_position: element.anchor_position
              ? {
                  x: element.anchor_position.x + dx,
                  y: element.anchor_position.y + dy,
                }
              : element.anchor_position,
          }
        }

        return element
      })
    }
  }

  return result
}
