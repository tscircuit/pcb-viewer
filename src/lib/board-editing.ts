import type { AnyCircuitElement } from "circuit-json"

export type ResizeHandle = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw"

export interface EditableBoard {
  center: { x: number; y: number }
  width: number
  height: number
}

/**
 * Extract an editable board from circuit JSON elements.
 * Only boards with explicit width/height (no outline polygon) are editable.
 */
export function getEditableBoard(
  elements: AnyCircuitElement[],
): EditableBoard | null {
  const board = elements.find((e) => e.type === "pcb_board") as any
  if (!board) return null

  // If the board uses an outline polygon instead of width/height, it's not
  // editable through the rectangular drag/resize UI
  if (board.outline && Array.isArray(board.outline) && board.outline.length > 0)
    return null

  if (typeof board.width !== "number" || typeof board.height !== "number")
    return null

  return {
    center: { x: board.center?.x ?? 0, y: board.center?.y ?? 0 },
    width: board.width,
    height: board.height,
  }
}

/**
 * Produce a stable string key for the board dimensions so we can reset
 * overrides when the source data changes.
 */
export function getEditableBoardKey(
  board: EditableBoard | null,
): string | null {
  if (!board) return null
  return `${board.center.x},${board.center.y},${board.width},${board.height}`
}

const MIN_BOARD_SIZE = 0.5 // mm

/**
 * Resize the board by dragging one of the 8 handles.
 * The opposite edge stays fixed.
 */
export function resizeEditableBoard({
  board,
  handle,
  delta,
}: {
  board: EditableBoard
  handle: ResizeHandle
  delta: { x: number; y: number }
}): EditableBoard {
  let left = board.center.x - board.width / 2
  let right = board.center.x + board.width / 2
  let top = board.center.y + board.height / 2
  let bottom = board.center.y - board.height / 2

  if (handle.includes("e")) {
    right += delta.x
  }
  if (handle.includes("w")) {
    left += delta.x
  }
  if (handle.includes("n")) {
    top += delta.y
  }
  if (handle.includes("s")) {
    bottom += delta.y
  }

  // Enforce minimum size
  if (right - left < MIN_BOARD_SIZE) {
    if (handle.includes("e")) right = left + MIN_BOARD_SIZE
    else left = right - MIN_BOARD_SIZE
  }
  if (top - bottom < MIN_BOARD_SIZE) {
    if (handle.includes("n")) top = bottom + MIN_BOARD_SIZE
    else bottom = top - MIN_BOARD_SIZE
  }

  const newWidth = right - left
  const newHeight = top - bottom

  return {
    center: {
      x: left + newWidth / 2,
      y: bottom + newHeight / 2,
    },
    width: newWidth,
    height: newHeight,
  }
}

/**
 * Apply an EditableBoard override to circuit JSON elements.
 * Returns a new array with the pcb_board element updated.
 */
export function applyEditableBoard({
  circuitJson,
  board,
}: {
  circuitJson: AnyCircuitElement[]
  board: EditableBoard
}): AnyCircuitElement[] {
  return circuitJson.map((elm) => {
    if (elm.type !== "pcb_board") return elm
    return {
      ...elm,
      center: board.center,
      width: board.width,
      height: board.height,
    } as AnyCircuitElement
  })
}
