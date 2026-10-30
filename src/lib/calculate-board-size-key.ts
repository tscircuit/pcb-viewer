import type { AnyCircuitElement } from "circuit-json"

export const calculateBoardSizeKey = (
  circuitJson?: AnyCircuitElement[],
): string => {
  if (!circuitJson) return "empty"

  const boardSizeKeys = circuitJson
    .filter(
      (element) => element.type === "pcb_board" || element.type === "pcb_panel",
    )
    .map((element) =>
      JSON.stringify([
        element.type,
        element.center.x,
        element.center.y,
        element.width,
        element.height,
        element.type === "pcb_board"
          ? element.outline?.map(({ x, y }) => [x, y])
          : undefined,
      ]),
    )
    .sort()

  return boardSizeKeys.length > 0 ? boardSizeKeys.join(";") : "no-board"
}
