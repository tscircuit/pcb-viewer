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
  // Index original silkscreen positions before applying edit events
  const originalPositions = new Map<string, any>()
  for (const element of circuitJson as any[]) {
    if (!element.pcb_component_id) continue
    if (element.type === "pcb_silkscreen_line") {
      originalPositions.set(element.pcb_silkscreen_line_id, {
        x1: element.x1,
        y1: element.y1,
        x2: element.x2,
        y2: element.y2,
      })
    } else if (element.type === "pcb_silkscreen_path") {
      originalPositions.set(element.pcb_silkscreen_path_id, {
        route: element.route?.map((p: any) => ({ x: p.x, y: p.y })),
      })
    } else if (element.type === "pcb_silkscreen_circle") {
      originalPositions.set(element.pcb_silkscreen_circle_id, {
        cx: element.center.x,
        cy: element.center.y,
      })
    } else if (element.type === "pcb_silkscreen_text") {
      originalPositions.set(element.pcb_silkscreen_text_id, {
        ax: element.anchor_position?.x,
        ay: element.anchor_position?.y,
      })
    } else if (element.type === "pcb_silkscreen_rect") {
      originalPositions.set(element.pcb_silkscreen_rect_id, {
        cx: element.center.x,
        cy: element.center.y,
      })
    } else if (element.type === "pcb_silkscreen_oval") {
      originalPositions.set(element.pcb_silkscreen_oval_id, {
        cx: element.center.x,
        cy: element.center.y,
      })
    } else if (element.type === "pcb_silkscreen_pill") {
      originalPositions.set(element.pcb_silkscreen_pill_id, {
        cx: element.center.x,
        cy: element.center.y,
      })
    }
  }

  // Apply the standard edit events
  let result = applyEditEvents({
    circuitJson: circuitJson as any,
    editEvents,
  })

  // For each component location edit, apply translation only to silkscreen
  // elements that were NOT already moved by applyEditEvents
  for (const editEvent of editEvents) {
    if (
      editEvent.edit_event_type === "edit_pcb_component_location" &&
      editEvent.original_center &&
      editEvent.new_center
    ) {
      const dx = editEvent.new_center.x - editEvent.original_center.x
      const dy = editEvent.new_center.y - editEvent.original_center.y

      if (dx === 0 && dy === 0) continue

      result = result.map((element: any) => {
        if (element.pcb_component_id !== editEvent.pcb_component_id) {
          return element
        }

        if (element.type === "pcb_silkscreen_line") {
          const original = originalPositions.get(element.pcb_silkscreen_line_id)
          if (!original) return element
          // Check if applyEditEvents already moved the element
          if (element.x1 !== original.x1 || element.y1 !== original.y1) {
            return element
          }
          return {
            ...element,
            x1: element.x1 + dx,
            y1: element.y1 + dy,
            x2: element.x2 + dx,
            y2: element.y2 + dy,
          }
        }

        if (element.type === "pcb_silkscreen_path") {
          const original = originalPositions.get(element.pcb_silkscreen_path_id)
          if (!original || !element.route?.length) return element
          // Check if applyEditEvents already moved the element
          if (element.route[0].x !== original.route?.[0]?.x) {
            return element
          }
          return {
            ...element,
            route: element.route.map((point: { x: number; y: number }) => ({
              x: point.x + dx,
              y: point.y + dy,
            })),
          }
        }

        if (element.type === "pcb_silkscreen_circle") {
          const original = originalPositions.get(
            element.pcb_silkscreen_circle_id,
          )
          if (!original) return element
          // Check if applyEditEvents already moved the element
          if (element.center.x !== original.cx) {
            return element
          }
          return {
            ...element,
            center: {
              x: element.center.x + dx,
              y: element.center.y + dy,
            },
          }
        }

        if (element.type === "pcb_silkscreen_rect") {
          const original = originalPositions.get(element.pcb_silkscreen_rect_id)
          if (!original) return element
          // Check if applyEditEvents already moved the element
          if (element.center.x !== original.cx) {
            return element
          }
          return {
            ...element,
            center: {
              x: element.center.x + dx,
              y: element.center.y + dy,
            },
          }
        }

        if (element.type === "pcb_silkscreen_oval") {
          const original = originalPositions.get(element.pcb_silkscreen_oval_id)
          if (!original) return element
          // Check if applyEditEvents already moved the element
          if (element.center.x !== original.cx) {
            return element
          }
          return {
            ...element,
            center: {
              x: element.center.x + dx,
              y: element.center.y + dy,
            },
          }
        }

        if (element.type === "pcb_silkscreen_pill") {
          const original = originalPositions.get(element.pcb_silkscreen_pill_id)
          if (!original) return element
          // Check if applyEditEvents already moved the element
          if (element.center.x !== original.cx) {
            return element
          }
          return {
            ...element,
            center: {
              x: element.center.x + dx,
              y: element.center.y + dy,
            },
          }
        }

        if (element.type === "pcb_silkscreen_text") {
          const original = originalPositions.get(element.pcb_silkscreen_text_id)
          if (!original) return element
          // Check if applyEditEvents already moved the element
          if (element.anchor_position?.x !== original.ax) {
            return element
          }
          return {
            ...element,
            anchor_position: {
              x: element.anchor_position.x + dx,
              y: element.anchor_position.y + dy,
            },
          }
        }

        return element
      })
    }
  }

  return result
}
