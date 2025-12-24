import type { AnyCircuitElement, PcbBoard } from "circuit-json"

export const calculateBoardSizeKey = (
  circuitJson?: AnyCircuitElement[],
): string => {
  if (!circuitJson) return "empty"

  const board = circuitJson.find((e) => e.type === "pcb_board") as
    | PcbBoard
    | undefined

  if (!board) return "no-board"
  const round = (n: number) => Math.round(n * 1000) / 1000

  if (board.outline) {
    return board.outline.map((o) => `${round(o.x)}_${round(o.y)}`).join(",")
  }

  return `${round(board.width!)}_${round(board.height!)}`
}
