import { test, expect } from "bun:test"
import { applyEditEventsWithSilkscreenFix } from "../../src/lib/apply-edit-events-with-silkscreen-fix"
import type { ManualEditEvent } from "@tscircuit/props"
import type { AnyCircuitElement } from "circuit-json"

test("silkscreen text moves with component", () => {
  const circuitJson: AnyCircuitElement[] = [
    {
      type: "pcb_component",
      pcb_component_id: "comp_1",
      center: { x: 0, y: 0 },
      width: 2,
      height: 1,
      layer: "top",
    } as any,
    {
      type: "pcb_silkscreen_text",
      layer: "top",
      pcb_component_id: "comp_1",
      pcb_silkscreen_text_id: "text_1",
      anchor_position: { x: 0, y: 0 },
      text: "R1",
      font_size: 1,
    } as any,
  ]

  const editEvents: ManualEditEvent[] = [
    {
      edit_event_id: "edit_1",
      edit_event_type: "edit_pcb_component_location",
      pcb_edit_event_type: "edit_component_location",
      pcb_component_id: "comp_1",
      original_center: { x: 0, y: 0 },
      new_center: { x: 4, y: 2 },
      in_progress: false,
      created_at: Date.now(),
    },
  ]

  const result = applyEditEventsWithSilkscreenFix({
    circuitJson,
    editEvents,
  })

  const silkscreenText = result.find(
    (e: any) => e.type === "pcb_silkscreen_text",
  ) as any

  expect(silkscreenText).toBeDefined()
  expect(silkscreenText.anchor_position.x).toBe(4)
  expect(silkscreenText.anchor_position.y).toBe(2)
})
