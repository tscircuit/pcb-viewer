import { applyEditEvents } from "@tscircuit/core"
import type { ManualEditEvent } from "@tscircuit/props"
import { applyToPoint } from "transformation-matrix"
import { translate } from "transformation-matrix"
import type { AnyCircuitElement } from "circuit-json"

/**
 * Extends applyEditEvents from @tscircuit/core to also transform silkscreen
 * element types that are not yet handled by circuit-json-util's transformPCBElement:
 * - pcb_silkscreen_oval
 * - pcb_silkscreen_pill
 *
 * Without this fix, oval and pill silkscreen elements stay in place when their
 * parent component is moved via a manual edit event.
 *
 * See: https://github.com/tscircuit/pcb-viewer/issues/84
 */
export function applyEditEventsWithSilkscreenFix({
  circuitJson,
  editEvents,
}: {
  circuitJson: AnyCircuitElement[]
  editEvents: ManualEditEvent[]
}): AnyCircuitElement[] {
  // First apply the standard applyEditEvents (handles line, path, circle, rect, text)
  let result = applyEditEvents({
    circuitJson: circuitJson as any,
    editEvents,
  }) as AnyCircuitElement[]

  // Now handle oval and pill silkscreen elements which transformPCBElement misses
  for (const editEvent of editEvents) {
    if (
      editEvent.edit_event_type !== "edit_pcb_component_location" ||
      !editEvent.original_center
    ) {
      continue
    }

    const dx = editEvent.new_center.x - editEvent.original_center.x
    const dy = editEvent.new_center.y - editEvent.original_center.y

    if (dx === 0 && dy === 0) continue

    const mat = translate(dx, dy)

    result = result.map((element: any) => {
      if (element.pcb_component_id !== editEvent.pcb_component_id) {
        return element
      }

      if (
        element.type === "pcb_silkscreen_oval" ||
        element.type === "pcb_silkscreen_pill"
      ) {
        const newCenter = applyToPoint(mat, element.center)
        return { ...element, center: newCenter }
      }

      return element
    })
  }

  return result
}
