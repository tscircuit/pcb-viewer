import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { applyToPoint } from "transformation-matrix"
import { getPcbComponentFocus } from "../../src/lib/get-pcb-component-focus"

const component = {
  type: "pcb_component",
  pcb_component_id: "component",
  source_component_id: "source",
  center: { x: 17, y: -9 },
  width: 8,
  height: 4,
  rotation: 0,
  layer: "bottom",
  obstructs_within_bounds: true,
} as const

test("PCB focus centers an off-origin component with padding and inverted Y", () => {
  const result = getPcbComponentFocus([component], "component", 800, 600)!
  expect(applyToPoint(result.transform, component.center)).toEqual({
    x: 400,
    y: 300,
  })
  const corner = applyToPoint(result.transform, {
    x: result.bounds.minX,
    y: result.bounds.maxY,
  })
  expect(corner.x).toBeGreaterThan(0)
  expect(corner.y).toBeGreaterThan(0)
  expect(result.transform.d).toBeLessThan(0)
  expect(result.component.layer).toBe("bottom")
})

test("PCB focus waits for layout and ignores stale component IDs", () => {
  const elements: AnyCircuitElement[] = [component]
  expect(getPcbComponentFocus(elements, "component", 0, 600)).toBeUndefined()
  expect(getPcbComponentFocus(elements, "component", 800, 0)).toBeUndefined()
  expect(getPcbComponentFocus(elements, "missing", 800, 600)).toBeUndefined()
})
