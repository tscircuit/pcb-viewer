import { findBoundsAndCenter } from "@tscircuit/circuit-json-util"
import type { AnyCircuitElement } from "circuit-json"

const emptyPcbViewBounds = {
  center: { x: 0, y: 0 },
  width: 0.001,
  height: 0.001,
}

export const getDefaultPcbViewBounds = (elements: AnyCircuitElement[]) => {
  const panels = elements.filter((element) => element.type === "pcb_panel")
  if (panels.length > 0) return findBoundsAndCenter(panels)

  const boards = elements.filter((element) => element.type === "pcb_board")
  if (boards.length > 0) return findBoundsAndCenter(boards)

  const pcbElements = elements.filter((element) =>
    element.type.startsWith("pcb_"),
  )
  if (pcbElements.length > 0) return findBoundsAndCenter(pcbElements)

  return emptyPcbViewBounds
}
