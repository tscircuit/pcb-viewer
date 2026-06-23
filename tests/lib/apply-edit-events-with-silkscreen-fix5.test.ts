import { test, expect } from "bun:test"
import { applyEditEventsWithSilkscreenFix } from "../../src/lib/apply-edit-events-with-silkscreen-fix"
import type { ManualEditEvent } from "@tscircuit/props"
import type { AnyCircuitElement } from "circuit-json"

test("silkscreen elements without pcb_component_id are not affected", () => {
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
      pcb_silkscreen_line_id: "line_1",
      x1: -1,
      y1: -0.5,
      x2: 1,
      y2: -0.5,
      stroke_width: 0.1,
    } as any,
  ]

  const editEvents: ManualEditEvent[] = [
    {
      edit_event_id: "edit_1",
      edit_event_type: "edit_pcb_component_location",
      pcb_edit_event_type: "edit_component_location",
      pcb_component_id: "comp_1",
      original_center: { x: 0, y: 0 },
      new_center: { x: 5, y: 3 },
      in_progress: false,
      created_at: Date.now(),
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
  // Should remain unchanged since no pcb_component_id
  expect(silkscreenLine.x1).toBe(-1)
  expect(silkscreenLine.y1).toBe(-0.5)
  expect(silkscreenLine.x2).toBe(1)
  expect(silkscreenLine.y2).toBe(-0.5)
})
