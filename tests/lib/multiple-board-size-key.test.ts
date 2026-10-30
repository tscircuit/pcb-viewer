import { expect, test } from "bun:test"
import { calculateBoardSizeKey } from "../../src/lib/calculate-board-size-key"
import { createViewportCircuitJson } from "../viewport-framing/create-viewport-circuit-json"

test("tracks the positions, dimensions and outlines of every board", () => {
  const elements = createViewportCircuitJson({ scenario: "multiple_boards" })
  const originalKey = calculateBoardSizeKey(elements)

  expect(
    calculateBoardSizeKey(
      createViewportCircuitJson({
        scenario: "multiple_boards",
        secondBoardX: 150,
      }),
    ),
  ).not.toBe(originalKey)
  expect(
    calculateBoardSizeKey(
      elements.map((element) =>
        element.type === "pcb_board" && element.pcb_board_id === "second_board"
          ? { ...element, width: 40 }
          : element,
      ),
    ),
  ).not.toBe(originalKey)
  expect(
    calculateBoardSizeKey(
      elements.map((element) =>
        element.type === "pcb_board" && element.pcb_board_id === "first_board"
          ? { ...element, center: { x: -30, y: 0 } }
          : element,
      ),
    ),
  ).not.toBe(originalKey)
  expect(
    calculateBoardSizeKey(
      elements.map((element) =>
        element.type === "pcb_board" && element.pcb_board_id === "second_board"
          ? {
              ...element,
              outline: [
                { x: 20, y: -10 },
                { x: 40, y: -10 },
                { x: 30, y: 10 },
              ],
            }
          : element,
      ),
    ),
  ).not.toBe(originalKey)
})
