import { expect, test } from "bun:test"
import type { PcbComponent } from "circuit-json"
import { isInsideOf } from "../src/components/EditPlacementOverlay"

const component: PcbComponent = {
  type: "pcb_component",
  pcb_component_id: "pcb_component_1",
  source_component_id: "source_component_1",
  center: { x: 10, y: 20 },
  layer: "top",
  rotation: 0,
  width: 4,
  height: 2,
}

test("isInsideOf detects points within component bounds and positive/negative scale padding", () => {
  expect(isInsideOf(component, { x: 10, y: 20 }, 0)).toBe(true)
  expect(isInsideOf(component, { x: 11.9, y: 20.9 }, 0)).toBe(true)
  expect(isInsideOf(component, { x: 12.2, y: 20 }, 0)).toBe(false)
  expect(isInsideOf(component, { x: 12.2, y: 20 }, 0.5)).toBe(true)
  expect(isInsideOf(component, { x: 12.2, y: 20 }, -0.5)).toBe(true)
})
