import type {
  AnyCircuitElement,
  PcbPlatedHole,
  PcbTrace,
  PcbVia,
} from "circuit-json"

export function getPhaseSkewDrilledElements(elements: AnyCircuitElement[]) {
  const drilledElements: (PcbTrace | PcbVia | PcbPlatedHole)[] = []
  for (const element of elements) {
    if (element.type === "pcb_via" || element.type === "pcb_plated_hole") {
      drilledElements.push(element)
    } else if (element.type === "pcb_trace") {
      // The Canvas drawer resolves via dimensions and deduplicates route-point
      // vias itself. Give it only the via points so the drill pass draws no wires.
      const route = element.route.filter((point) => point.route_type === "via")
      if (route.length) drilledElements.push({ ...element, route })
    }
  }
  return drilledElements
}
