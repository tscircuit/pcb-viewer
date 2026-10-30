import { expect, test } from "bun:test"
import { calculateBoardSizeKey } from "../../src/lib/calculate-board-size-key"
import { createViewportCircuitJson } from "../viewport-framing/create-viewport-circuit-json"

test("tracks panel geometry with and without a PCB board", () => {
  const elements = createViewportCircuitJson({ scenario: "panel" })
  const resized = createViewportCircuitJson({
    scenario: "panel",
    panelWidth: 200,
  })
  expect(calculateBoardSizeKey(resized)).not.toBe(
    calculateBoardSizeKey(elements),
  )
  expect(
    calculateBoardSizeKey(
      elements.filter((element) => element.type === "pcb_panel"),
    ),
  ).not.toBe(
    calculateBoardSizeKey(
      resized.filter((element) => element.type === "pcb_panel"),
    ),
  )
  expect(
    calculateBoardSizeKey(
      elements.map((element) =>
        element.type === "pcb_panel"
          ? { ...element, center: { x: 50, y: 30 }, height: 100 }
          : element,
      ),
    ),
  ).not.toBe(calculateBoardSizeKey(elements))
})
