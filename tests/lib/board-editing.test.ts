import { describe, expect, it } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import {
  applyEditableBoard,
  getEditableBoard,
  resizeEditableBoard,
} from "../../src/lib/board-editing"

describe("board-editing helpers", () => {
  it("finds the first board with explicit width and height", () => {
    const circuitJson: AnyCircuitElement[] = [
      {
        type: "pcb_board",
        pcb_board_id: "outline-only",
        center: { x: 0, y: 0 },
        outline: [
          { x: -5, y: -5 },
          { x: 5, y: -5 },
          { x: 5, y: 5 },
        ],
      } as any,
      {
        type: "pcb_board",
        pcb_board_id: "editable",
        center: { x: 4, y: -3 },
        width: 40,
        height: 20,
      } as any,
    ]

    expect(getEditableBoard(circuitJson)).toEqual({
      pcb_board_id: "editable",
      center: { x: 4, y: -3 },
      width: 40,
      height: 20,
    })
  })

  it("updates board center and dimensions without touching other elements", () => {
    const circuitJson: AnyCircuitElement[] = [
      {
        type: "pcb_board",
        pcb_board_id: "board-1",
        center: { x: 0, y: 0 },
        width: 20,
        height: 10,
      } as any,
      {
        type: "pcb_component",
        pcb_component_id: "comp-1",
        center: { x: 2, y: 3 },
        width: 1,
        height: 1,
      } as any,
    ]

    const nextCircuit = applyEditableBoard({
      circuitJson,
      board: {
        pcb_board_id: "board-1",
        center: { x: 5, y: -2 },
        width: 24,
        height: 12,
      },
    })

    expect(nextCircuit[0]).toMatchObject({
      type: "pcb_board",
      center: { x: 5, y: -2 },
      width: 24,
      height: 12,
    })
    expect(nextCircuit[1]).toMatchObject({
      type: "pcb_component",
      center: { x: 2, y: 3 },
    })
  })

  it("resizes around the opposite edge for corner handles", () => {
    const board = {
      pcb_board_id: "board-1",
      center: { x: 0, y: 0 },
      width: 20,
      height: 10,
    }

    expect(
      resizeEditableBoard({
        board,
        handle: "ne",
        delta: { x: 6, y: 4 },
      }),
    ).toEqual({
      pcb_board_id: "board-1",
      center: { x: 3, y: 2 },
      width: 26,
      height: 14,
    })
  })
})
