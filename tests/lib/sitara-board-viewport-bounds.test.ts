import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { getPcbViewportBounds } from "../../src/lib/get-pcb-viewport-bounds"
import circuitJson from "../fixtures/tmds62levm-off-board-notes.circuit.json"

test.failing("fits the TMDS62LEVM board instead of its imported drawing frame", () => {
  const elements = circuitJson as AnyCircuitElement[]
  const board = elements.find((element) => element.type === "pcb_board")!
  expect(getPcbViewportBounds(elements)).toEqual({
    center: board.center,
    width: board.width!,
    height: board.height!,
  })
})
