import type { AnyCircuitElement, PcbBoard } from "circuit-json"

export const calculateBoardSizeKey = (
  circuitJson?: AnyCircuitElement[],
): string => {
  if (!circuitJson) return "empty"

  const boards = circuitJson.filter((e) => e.type === "pcb_board") as
    | PcbBoard[]
    | undefined

  if (!boards || boards.length === 0) return "no-board"
  const round = (n: number) => Math.round(n * 1000) / 1000

  return boards
    .map((board) => {
      if (board.outline) {
        return board.outline.map((o) => `${round(o.x)}_${round(o.y)}`).join(",")
      }
      return `${round(board.width!)}_${round(board.height!)}_${round(board.center.x)}_${round(board.center.y)}`
    })
    .join("|")
}
