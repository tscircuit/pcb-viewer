import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { getPcbViewportBounds } from "../../src/lib/get-pcb-viewport-bounds"

test("fits the full panel around its boards", () => {
  const elements: AnyCircuitElement[] = [
    {
      type: "pcb_panel",
      pcb_panel_id: "pcb_panel_0",
      thickness: 1.6,
      width: 80,
      height: 60,
      covered_with_solder_mask: false,
      center: { x: 40, y: 30 },
    },
    {
      type: "pcb_board",
      pcb_board_id: "pcb_board_0",
      pcb_panel_id: "pcb_panel_0",
      center: { x: 20, y: 15 },
      width: 40,
      height: 20,
      material: "fr4",
      num_layers: 2,
      thickness: 1.6,
    },
  ]

  expect(getPcbViewportBounds(elements)).toEqual({
    center: { x: 40, y: 30 },
    width: 80,
    height: 60,
  })
})
