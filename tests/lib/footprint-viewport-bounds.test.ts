import { expect, test } from "bun:test"
import { findBoundsAndCenter } from "@tscircuit/circuit-json-util"
import type { AnyCircuitElement } from "circuit-json"
import { getPcbViewportBounds } from "../../src/lib/get-pcb-viewport-bounds"
import circuitJson from "../fixtures/tmds62levm-off-board-notes.circuit.json"

test("still fits all footprint geometry when there is no PCB board", () => {
  const elements = (circuitJson as AnyCircuitElement[]).filter(
    (element) => element.type !== "pcb_board",
  )
  expect(getPcbViewportBounds(elements)).toEqual(findBoundsAndCenter(elements))
  expect(getPcbViewportBounds([])).toEqual({
    center: { x: 0, y: 0 },
    width: 0.001,
    height: 0.001,
  })
})
