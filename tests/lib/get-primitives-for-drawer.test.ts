import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { convertElementToPrimitives } from "../../src/lib/convert-element-to-primitive"
import { getPrimitivesForDrawer } from "../../src/lib/get-primitives-for-drawer"

test("keeps plated-hole drills in the dedicated drill layer", () => {
  const platedHole = {
    type: "pcb_plated_hole",
    pcb_plated_hole_id: "pcb_plated_hole_0",
    shape: "circular_hole_with_rect_pad",
    x: 0,
    y: 0,
    hole_diameter: 0.9,
    rect_pad_width: 1.8,
    rect_pad_height: 1.6,
    hole_offset_x: -0.1,
    hole_offset_y: 0,
    layers: ["top", "bottom"],
  } as AnyCircuitElement
  const primitives = convertElementToPrimitives(platedHole, [platedHole])

  const drawablePrimitives = getPrimitivesForDrawer({
    primitives,
    isShowingSolderMask: true,
    isShowingSilkscreen: true,
    isShowingFabricationNotes: true,
  })

  expect(drawablePrimitives).toHaveLength(1)
  expect(drawablePrimitives[0]).toMatchObject({
    pcb_drawing_type: "circle",
    layer: "drill",
    x: -0.1,
    y: 0,
    r: 0.45,
  })
})
