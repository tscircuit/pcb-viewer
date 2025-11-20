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
  expect(primitives[0].roundness).toBe(1.5)
  expect(primitives[0].ccw_rotation).toBe(30)
})

