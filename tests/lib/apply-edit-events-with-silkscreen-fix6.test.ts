import { test, expect } from "bun:test"
import { applyEditEventsWithSilkscreenFix } from "../../src/lib/apply-edit-events-with-silkscreen-fix"
import type { ManualEditEvent } from "@tscircuit/props"
import type { AnyCircuitElement } from "circuit-json"

test("silkscreen elements move correctly with multiple sequential edit events", () => {
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
      type: "pcb_silkscreen_line",
      layer: "top",
      pcb_component_id: "comp_1",
      pcb_silkscreen_line_id: "line_1",
      x1: 0,
      y1: 0,
      x2: 1,
      y2: 0,
      stroke_width: 0.1,
    } as any,
  ]

  // Multiple edit events: move from (0,0) → (2,0) → (5,0)
  const editEvents: ManualEditEvent[] = [
    {
      edit_event_id: "edit_1",
      edit_event_type: "edit_pcb_component_location",
      pcb_edit_event_type: "edit_component_location",
      pcb_component_id: "comp_1",
      original_center: { x: 0, y: 0 },
      new_center: { x: 2, y: 0 },
      in_progress: false,
      created_at: Date.now(),
    },
    {
      edit_event_id: "edit_2",
      edit_event_type: "edit_pcb_component_location",
      pcb_edit_event_type: "edit_component_location",
      pcb_component_id: "comp_1",
      original_center: { x: 2, y: 0 },
      new_center: { x: 5, y: 0 },
      in_progress: false,
      created_at: Date.now() + 1,
    },
  ]

  const result = applyEditEventsWithSilkscreenFix({
    circuitJson,
    editEvents,
  })

  const silkscreenLine = result.find(
    (e: any) => e.type === "pcb_silkscreen_line",
  ) as any

  expect(silkscreenLine).toBeDefined()
  // First edit: x1 moves from 0 to 2
  // Second edit: x1 moves from 2 to 5
  // Final position should be 5, not 2
  expect(silkscreenLine.x1).toBe(5) // 0 + 2 + 3
  expect(silkscreenLine.y1).toBe(0)
  expect(silkscreenLine.x2).toBe(6) // 1 + 2 + 3
  expect(silkscreenLine.y2).toBe(0)
})
