import { describe, it, expect } from "bun:test"
import { calculateBoardSizeKey } from "../../src/lib/calculate-board-size-key"
import type { AnyCircuitElement } from "circuit-json"

describe("calculateBoardSizeKey", () => {
  it("should handle multiple pcb_board elements correctly", () => {
    const circuitJson: AnyCircuitElement[] = [
      {
        type: "pcb_board",
        pcb_board_id: "board_1",
        center: { x: 0, y: 0 },
        width: 40,
        height: 30,
      },
      {
        type: "pcb_board",
        pcb_board_id: "board_2",
        center: { x: 100, y: 0 },
        width: 50,
        height: 50,
      },
    ]

    const key = calculateBoardSizeKey(circuitJson)
    expect(key).toContain("40_30")
    expect(key).toContain("50_50")
  })
})
