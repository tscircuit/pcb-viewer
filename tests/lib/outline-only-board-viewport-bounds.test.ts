import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { getPcbViewportBounds } from "../../src/lib/get-pcb-viewport-bounds"

test("fits an outline-only board around its PCB components", () => {
  const elements: AnyCircuitElement[] = [
    {
      type: "pcb_board",
      pcb_board_id: "polygon_board",
      center: { x: 30, y: 20 },
      material: "fr4",
      thickness: 1.6,
      num_layers: 2,
      outline: [
        { x: 10, y: 10 },
        { x: 50, y: 10 },
        { x: 50, y: 30 },
        { x: 30, y: 30 },
        { x: 30, y: 20 },
        { x: 10, y: 20 },
      ],
    },
    {
      type: "pcb_component",
      pcb_component_id: "pcb_r1",
      source_component_id: "source_r1",
      center: { x: 15, y: 15 },
      width: 2,
      height: 2,
      rotation: 0,
      layer: "top",
      obstructs_within_bounds: true,
    },
    {
      type: "pcb_component",
      pcb_component_id: "pcb_r2",
      source_component_id: "source_r2",
      center: { x: 45, y: 25 },
      width: 2,
      height: 2,
      rotation: 0,
      layer: "top",
      obstructs_within_bounds: true,
    },
  ]

  expect(getPcbViewportBounds(elements)).toEqual({
    center: { x: 30, y: 20 },
    width: 40,
    height: 20,
  })
})
