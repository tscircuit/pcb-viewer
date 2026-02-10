import { test, expect } from "bun:test"
import { applyEditEventsWithSilkscreenFix } from "../../src/lib/apply-edit-events-with-silkscreen-fix"
import type { ManualEditEvent } from "@tscircuit/props"
import type { AnyCircuitElement } from "circuit-json"

test("silkscreen line moves with component", () => {
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
  expect(silkscreenLine.x1).toBe(4) // -1 + 5
  expect(silkscreenLine.y1).toBe(2.5) // -0.5 + 3
  expect(silkscreenLine.x2).toBe(6) // 1 + 5
  expect(silkscreenLine.y2).toBe(2.5) // -0.5 + 3
})

test("silkscreen circle moves with component", () => {
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
      type: "pcb_silkscreen_circle",
      layer: "top",
      pcb_component_id: "comp_1",
      pcb_silkscreen_circle_id: "circle_1",
      center: { x: 0, y: 0 },
      radius: 0.5,
    } as any,
  ]

  const editEvents: ManualEditEvent[] = [
    {
      edit_event_id: "edit_1",
      edit_event_type: "edit_pcb_component_location",
      pcb_edit_event_type: "edit_component_location",
      pcb_component_id: "comp_1",
      original_center: { x: 0, y: 0 },
      new_center: { x: 3, y: 2 },
      in_progress: false,
      created_at: Date.now(),
    },
  ]

  const result = applyEditEventsWithSilkscreenFix({
    circuitJson,
    editEvents,
  })

  const silkscreenCircle = result.find(
    (e: any) => e.type === "pcb_silkscreen_circle",
  ) as any

  expect(silkscreenCircle).toBeDefined()
  expect(silkscreenCircle.center.x).toBe(3)
  expect(silkscreenCircle.center.y).toBe(2)
})

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
