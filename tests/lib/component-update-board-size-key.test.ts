import { expect, test } from "bun:test"
import { calculateBoardSizeKey } from "../../src/lib/calculate-board-size-key"
import { createViewportCircuitJson } from "../viewport-framing/create-viewport-circuit-json"

test("ignores component updates and element ordering when deciding to refit", () => {
  const elements = createViewportCircuitJson({ scenario: "multiple_boards" })
  const updated = createViewportCircuitJson({
    scenario: "multiple_boards",
    componentX: 3,
  })
  expect(calculateBoardSizeKey(updated)).toBe(calculateBoardSizeKey(elements))
  expect(calculateBoardSizeKey([...updated].reverse())).toBe(
    calculateBoardSizeKey(elements),
  )
  expect(calculateBoardSizeKey(undefined)).toBe("empty")
  expect(calculateBoardSizeKey([])).toBe("no-board")
})
