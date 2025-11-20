import { expect, test } from "bun:test"
import { convertElementToPrimitives } from "../../src/lib/convert-element-to-primitive"
import type { AnyCircuitElement } from "circuit-json"

test("pcb cutout rect includes corner radius and rotation", () => {
  const cutout: AnyCircuitElement = {
    type: "pcb_cutout",
    pcb_cutout_id: "pcb_cutout_rect_0",
    shape: "rect",
    center: { x: 0, y: 0 },
    width: 10,
    height: 5,
    corner_radius: 1.5,
    rotation: 30,
  }

  const primitives = convertElementToPrimitives(cutout, [cutout])

  expect(primitives).toHaveLength(1)
  const [primitive] = primitives

  if (primitive.pcb_drawing_type !== "rect") {
    throw new Error("Expected pcb_cutout to produce rect primitive")
  }

  const rect = primitive

  expect(rect.roundness).toBe(1.5)
  expect(rect.ccw_rotation).toBe(30)
})
