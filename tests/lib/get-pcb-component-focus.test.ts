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

test("PCB focus handles rect-pad plated holes without hole_offset_x/y and with rect_pad_offset_x/y", () => {
  const elements: AnyCircuitElement[] = [
    {
      ...component,
      center: { x: 10, y: 20 },
      rotation: 0,
    },
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "pad_1",
      pcb_component_id: "component",
      shape: "rect",
      x: 8,
      y: 20,
      width: 1,
      height: 2,
      layer: "top",
    },
    {
      type: "pcb_plated_hole",
      pcb_plated_hole_id: "ph_1",
      pcb_component_id: "component",
      shape: "pill_hole_with_rect_pad",
      hole_shape: "pill",
      pad_shape: "rect",
      x: 12,
      y: 20,
      hole_width: 1,
      hole_height: 2,
      rect_pad_width: 2,
      rect_pad_height: 4,
      rect_pad_offset_x: 1,
      rect_pad_offset_y: 0,
      layers: ["top", "bottom"],
    } as unknown as AnyCircuitElement,
  ]

  const result = getPcbComponentFocus(elements, "component", 800, 600)!
  expect(result).toBeDefined()
  expect(result.bounds.minX).toBeCloseTo(7.5)
  expect(result.bounds.maxX).toBeCloseTo(14)
  expect(result.bounds.minY).toBeCloseTo(18)
  expect(result.bounds.maxY).toBeCloseTo(22)
  expect(Number.isFinite(result.transform.a)).toBe(true)
  expect(Number.isFinite(result.transform.e)).toBe(true)
  expect(Number.isFinite(result.transform.f)).toBe(true)
})
