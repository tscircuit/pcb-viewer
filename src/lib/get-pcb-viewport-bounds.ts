import { findBoundsAndCenter } from "@tscircuit/circuit-json-util"
import type { AnyCircuitElement } from "circuit-json"

export function getPcbViewportBounds(elements: AnyCircuitElement[]) {
  const pcbElements = elements.filter((element) =>
    element.type.startsWith("pcb_"),
  )
  if (pcbElements.length === 0) {
    return { center: { x: 0, y: 0 }, width: 0.001, height: 0.001 }
  }
  const pcbBoards = pcbElements.filter(
    (element) => element.type === "pcb_board",
  )
  return findBoundsAndCenter(pcbBoards.length > 0 ? pcbBoards : pcbElements)
}
