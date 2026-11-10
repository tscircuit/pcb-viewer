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

test("handles outline-only pcb_board elements that omit center", () => {
  const outlineOnlyBoard = [
    {
      type: "pcb_board" as const,
      pcb_board_id: "outline_board",
      material: "fr4" as const,
      thickness: 1.6,
      num_layers: 2,
      outline: [
        { x: 0, y: 0 },
        { x: 20, y: 0 },
        { x: 20, y: 15 },
        { x: 0, y: 15 },
      ],
    },
  ]
  const resizedOutlineOnlyBoard = [
    {
      ...outlineOnlyBoard[0]!,
      outline: [
        { x: 0, y: 0 },
        { x: 30, y: 0 },
        { x: 30, y: 15 },
        { x: 0, y: 15 },
      ],
    },
  ]
  expect(calculateBoardSizeKey(outlineOnlyBoard as any)).not.toBe(
    calculateBoardSizeKey(resizedOutlineOnlyBoard as any),
  )
})
