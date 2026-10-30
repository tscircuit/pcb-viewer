import { expect, test } from "bun:test"
import { findBoundsAndCenter } from "@tscircuit/circuit-json-util"
import type { AnyCircuitElement } from "circuit-json"
import { getPcbViewportBounds } from "../../src/lib/get-pcb-viewport-bounds"
import circuitJson from "../fixtures/tmds62levm-off-board-notes.circuit.json"

test("includes every physical board when fitting a multi-board scene", () => {
  const elements = circuitJson as AnyCircuitElement[]
  const board = elements.find((element) => element.type === "pcb_board")!
  const secondBoard = {
    ...board,
    pcb_board_id: "second_board",
    outline: undefined,
    center: { x: board.center.x + 200, y: board.center.y },
  }
  expect(getPcbViewportBounds([...elements, secondBoard])).toEqual(
    findBoundsAndCenter([board, secondBoard]),
  )
})
