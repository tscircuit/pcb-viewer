import {
  findBoundsAndCenter,
  getBoardBounds,
} from "@tscircuit/circuit-json-util"
import type { AnyCircuitElement } from "circuit-json"

export function getPcbViewportBounds(elements: AnyCircuitElement[]) {
  const pcbElements = elements.filter((element) =>
    element.type.startsWith("pcb_"),
  )
  if (pcbElements.length === 0) {
    return { center: { x: 0, y: 0 }, width: 0.001, height: 0.001 }
  }
  const boardsAndPanels = pcbElements
    .filter(
      (element) => element.type === "pcb_board" || element.type === "pcb_panel",
    )
    .map((element) => {
      if (element.type !== "pcb_board" || !element.outline?.length)
        return element
      const { center, width, height } = getBoardBounds(element)
      return { ...element, center, width, height }
    })
  return findBoundsAndCenter(
    boardsAndPanels.length > 0 ? boardsAndPanels : pcbElements,
  )
}
