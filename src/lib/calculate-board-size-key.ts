import type { AnyCircuitElement, PcbBoard } from "circuit-json"

export const calculateBoardSizeKey = (
  circuitJson?: AnyCircuitElement[],
): string => {
  if (!circuitJson) return "empty"

  const board = circuitJson.find((e) => e.type === "pcb_board") as
    | PcbBoard
    | undefined

  if (!board) return "no-board"

  if (board.outline) {
    return board.outline.map((o) => `${o.x}_${o.y}`).join(",")
  }

  return `${board.width}_${board.height}`
}
