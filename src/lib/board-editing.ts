import type { AnyCircuitElement, PcbBoard } from "circuit-json"

export type EditableBoard = {
  pcb_board_id: string
  center: { x: number; y: number }
  width: number
  height: number
}

export type ResizeHandle = "n" | "ne" | "e" | "se" | "s" | "sw" | "w" | "nw"

const MIN_BOARD_DIMENSION = 1

export const getEditableBoard = (
  circuitJson?: AnyCircuitElement[],
): EditableBoard | null => {
  if (!circuitJson) return null

  const board = circuitJson.find((element): element is PcbBoard => {
    return (
      element.type === "pcb_board" &&
      Number.isFinite(element.width) &&
      Number.isFinite(element.height)
    )
  })

  if (
    !board?.pcb_board_id ||
    !board.center ||
    !Number.isFinite(board.width) ||
    !Number.isFinite(board.height)
  ) {
    return null
  }

  const width = board.width as number
  const height = board.height as number

  return {
    pcb_board_id: board.pcb_board_id,
    center: { ...board.center },
    width,
    height,
  }
}

export const getEditableBoardKey = (board: EditableBoard | null): string => {
  if (!board) return "no-editable-board"

  return [
    board.pcb_board_id,
    board.center.x,
    board.center.y,
    board.width,
    board.height,
  ].join(":")
}

export const applyEditableBoard = ({
  circuitJson,
  board,
}: {
  circuitJson: AnyCircuitElement[]
  board: EditableBoard
}): AnyCircuitElement[] => {
  return circuitJson.map((element) => {
    if (
      element.type !== "pcb_board" ||
      element.pcb_board_id !== board.pcb_board_id
    ) {
      return element
    }

    return {
      ...element,
      center: { ...board.center },
      width: board.width,
      height: board.height,
    } satisfies PcbBoard
  })
}

export const resizeEditableBoard = ({
  board,
  handle,
  delta,
}: {
  board: EditableBoard
  handle: ResizeHandle
  delta: { x: number; y: number }
}): EditableBoard => {
  let left = board.center.x - board.width / 2
  let right = board.center.x + board.width / 2
  let top = board.center.y + board.height / 2
  let bottom = board.center.y - board.height / 2

  if (handle.includes("w")) left += delta.x
  if (handle.includes("e")) right += delta.x
  if (handle.includes("n")) top += delta.y
  if (handle.includes("s")) bottom += delta.y

  if (right - left < MIN_BOARD_DIMENSION) {
    if (handle.includes("w")) {
      left = right - MIN_BOARD_DIMENSION
    } else if (handle.includes("e")) {
      right = left + MIN_BOARD_DIMENSION
    }
  }

  if (top - bottom < MIN_BOARD_DIMENSION) {
    if (handle.includes("s")) {
      bottom = top - MIN_BOARD_DIMENSION
    } else if (handle.includes("n")) {
      top = bottom + MIN_BOARD_DIMENSION
    }
  }

  return {
    ...board,
    center: {
      x: (left + right) / 2,
      y: (top + bottom) / 2,
    },
    width: right - left,
    height: top - bottom,
  }
}
