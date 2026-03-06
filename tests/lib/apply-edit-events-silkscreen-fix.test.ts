import { describe, it, expect } from "bun:test"
import { applyEditEventsWithSilkscreenFix } from "../../src/lib/apply-edit-events-with-silkscreen-fix"
import type { ManualEditEvent } from "@tscircuit/props"

const makeEditEvent = (
  original: { x: number; y: number },
  next: { x: number; y: number },
): ManualEditEvent =>
  ({
    edit_event_id: "e1",
    edit_event_type: "edit_pcb_component_location",
    pcb_edit_event_type: "edit_component_location",
    pcb_component_id: "comp_1",
    original_center: original,
    new_center: next,
    in_progress: false,
    created_at: Date.now(),
  }) as any

const baseCircuit = [
  {
    type: "pcb_component",
    pcb_component_id: "comp_1",
    center: { x: 0, y: 0 },
    width: 2,
    height: 1,
    layer: "top",
    rotation: 0,
  },
  {
    type: "pcb_silkscreen_line",
    pcb_silkscreen_line_id: "line_1",
    pcb_component_id: "comp_1",
    x1: -1,
    y1: 0,
    x2: 1,
    y2: 0,
    stroke_width: 0.1,
    layer: "top",
  },
  {
    type: "pcb_silkscreen_oval",
    pcb_silkscreen_oval_id: "oval_1",
    pcb_component_id: "comp_1",
    center: { x: 0, y: 0.5 },
    radius_x: 0.3,
    radius_y: 0.2,
    layer: "top",
    stroke_width: 0.1,
  },
  {
    type: "pcb_silkscreen_pill",
    pcb_silkscreen_pill_id: "pill_1",
    pcb_component_id: "comp_1",
    center: { x: 0, y: -0.5 },
    width: 0.5,
    height: 0.3,
    layer: "top",
    stroke_width: 0.1,
  },
] as any[]

describe("applyEditEventsWithSilkscreenFix", () => {
  it("moves pcb_silkscreen_line with component (already handled by core)", () => {
    const result = applyEditEventsWithSilkscreenFix({
      circuitJson: baseCircuit,
      editEvents: [makeEditEvent({ x: 0, y: 0 }, { x: 5, y: 3 })],
    })
    const line = result.find((e) => e.type === "pcb_silkscreen_line") as any
    expect(line.x1).toBeCloseTo(4)
    expect(line.y1).toBeCloseTo(3)
    expect(line.x2).toBeCloseTo(6)
    expect(line.y2).toBeCloseTo(3)
  })

  it("moves pcb_silkscreen_oval with component (was broken before fix)", () => {
    const result = applyEditEventsWithSilkscreenFix({
      circuitJson: baseCircuit,
      editEvents: [makeEditEvent({ x: 0, y: 0 }, { x: 5, y: 3 })],
    })
    const oval = result.find((e) => e.type === "pcb_silkscreen_oval") as any
    expect(oval.center.x).toBeCloseTo(5)
    expect(oval.center.y).toBeCloseTo(3.5)
  })

  it("moves pcb_silkscreen_pill with component (was broken before fix)", () => {
    const result = applyEditEventsWithSilkscreenFix({
      circuitJson: baseCircuit,
      editEvents: [makeEditEvent({ x: 0, y: 0 }, { x: 5, y: 3 })],
    })
    const pill = result.find((e) => e.type === "pcb_silkscreen_pill") as any
    expect(pill.center.x).toBeCloseTo(5)
    expect(pill.center.y).toBeCloseTo(2.5)
  })

  it("does not move silkscreen elements belonging to other components", () => {
    const circuit = [
      ...baseCircuit,
      {
        type: "pcb_silkscreen_oval",
        pcb_silkscreen_oval_id: "oval_2",
        pcb_component_id: "comp_2",
        center: { x: 10, y: 10 },
        radius_x: 0.3,
        radius_y: 0.2,
        layer: "top",
        stroke_width: 0.1,
      },
    ] as any[]

    const result = applyEditEventsWithSilkscreenFix({
      circuitJson: circuit,
      editEvents: [makeEditEvent({ x: 0, y: 0 }, { x: 5, y: 3 })],
    })

    const otherOval = result.find(
      (e: any) => e.pcb_silkscreen_oval_id === "oval_2",
    ) as any
    expect(otherOval.center.x).toBeCloseTo(10)
    expect(otherOval.center.y).toBeCloseTo(10)
  })

  it("preserves relative offset between silkscreen oval and component center", () => {
    const result = applyEditEventsWithSilkscreenFix({
      circuitJson: baseCircuit,
      editEvents: [makeEditEvent({ x: 0, y: 0 }, { x: 7, y: -2 })],
    })
    const comp = result.find((e) => e.type === "pcb_component") as any
    const oval = result.find((e) => e.type === "pcb_silkscreen_oval") as any
    // Original offset: oval.center - comp.center = (0-0, 0.5-0) = (0, 0.5)
    const offsetX = oval.center.x - comp.center.x
    const offsetY = oval.center.y - comp.center.y
    expect(offsetX).toBeCloseTo(0)
    expect(offsetY).toBeCloseTo(0.5)
  })

  it("handles empty editEvents without error", () => {
    const result = applyEditEventsWithSilkscreenFix({
      circuitJson: baseCircuit,
      editEvents: [],
    })
    expect(result).toHaveLength(baseCircuit.length)
    const oval = result.find((e) => e.type === "pcb_silkscreen_oval") as any
    expect(oval.center.x).toBeCloseTo(0)
    expect(oval.center.y).toBeCloseTo(0.5)
  })
})
