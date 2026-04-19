import { test, expect } from "bun:test"
import { applyEditEventsWithSilkscreenFix } from "../../src/lib/apply-edit-events-with-silkscreen-fix"
import type { ManualEditEvent } from "@tscircuit/props"
import type { AnyCircuitElement } from "circuit-json"

test("silkscreen path moves with component", () => {
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
      type: "pcb_silkscreen_path",
      layer: "top",
      pcb_component_id: "comp_1",
      pcb_silkscreen_path_id: "path_1",
      route: [
        { x: -1, y: 0 },
        { x: 0, y: 1 },
        { x: 1, y: 0 },
      ],
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
      new_center: { x: 2, y: 1 },
      in_progress: false,
      created_at: Date.now(),
    },
  ]

  const result = applyEditEventsWithSilkscreenFix({
    circuitJson,
    editEvents,
  })

  const silkscreenPath = result.find(
    (e: any) => e.type === "pcb_silkscreen_path",
  ) as any

  expect(silkscreenPath).toBeDefined()
  expect(silkscreenPath.route).toEqual([
    { x: 1, y: 1 }, // -1 + 2, 0 + 1
    { x: 2, y: 2 }, // 0 + 2, 1 + 1
    { x: 3, y: 1 }, // 1 + 2, 0 + 1
  ])
})
