import { createBoardOwnerMap } from "@tscircuit/circuit-json-util"
import type {
  AnyCircuitElement,
  PcbPlatedHole,
  PcbTrace,
  PcbVia,
} from "circuit-json"

/** circuit-to-canvas's drill for a route-point via whose board sets no minimum, in mm. */
const DEFAULT_ROUTE_VIA_HOLE_DIAMETER_MM = 0.25

/** circuit-to-canvas's pad for a route-point via whose board sets no minimum, in mm. */
const DEFAULT_ROUTE_VIA_OUTER_DIAMETER_MM = 0.6

/** A via or plated hole whose drill the Canvas copper pass cuts. */
export type PhaseSkewDrilledElement = PcbVia | PcbPlatedHole

/**
 * The scene's vias and plated holes, plus a via for each route point that
 * no `pcb_via` covers. circuit-to-canvas makes those route-point vias the
 * same way in `getViasFromTraces` while drawing traces, so resolving them
 * once per scene lets the overlay re-cut every drill without redrawing a
 * trace.
 */
export function getPhaseSkewDrilledElements({
  elements,
}: {
  elements: AnyCircuitElement[]
}): PhaseSkewDrilledElement[] {
  const boardOwnerMap = createBoardOwnerMap(elements)
  const standaloneVias = elements.filter(
    (element): element is PcbVia => element.type === "pcb_via",
  )
  const viasByPosition = new Map<string, PcbVia[]>()
  for (const via of standaloneVias) {
    const positionKey = getViaPositionKey({
      pcb_board_id: boardOwnerMap.get(via.pcb_via_id)?.pcb_board_id,
      x: via.x,
      y: via.y,
    })
    viasByPosition.set(positionKey, [
      ...(viasByPosition.get(positionKey) ?? []),
      via,
    ])
  }
  const routeVias: PcbVia[] = []
  const traces = elements.filter(
    (element): element is PcbTrace => element.type === "pcb_trace",
  )
  for (const trace of traces) {
    const board = boardOwnerMap.get(trace.pcb_trace_id)
    for (const [routeIndex, point] of trace.route.entries()) {
      if (point.route_type !== "via") continue
      const positionKey = getViaPositionKey({
        pcb_board_id: board?.pcb_board_id,
        x: point.x,
        y: point.y,
      })
      const viasAtPosition = viasByPosition.get(positionKey) ?? []
      const isCovered = viasAtPosition.some(
        (via) =>
          via.layers.includes(point.from_layer) &&
          via.layers.includes(point.to_layer),
      )
      if (isCovered) continue
      const routeVia: PcbVia = {
        type: "pcb_via",
        pcb_via_id: `${trace.pcb_trace_id}_route_via_${routeIndex}`,
        pcb_trace_id: trace.pcb_trace_id,
        x: point.x,
        y: point.y,
        layers: [point.from_layer, point.to_layer],
        hole_diameter:
          point.hole_diameter ??
          board?.min_via_hole_diameter ??
          DEFAULT_ROUTE_VIA_HOLE_DIAMETER_MM,
        outer_diameter:
          point.outer_diameter ??
          board?.min_via_pad_diameter ??
          DEFAULT_ROUTE_VIA_OUTER_DIAMETER_MM,
        tented_on_top: point.tented_on_top,
        tented_on_bottom: point.tented_on_bottom,
      }
      routeVias.push(routeVia)
      viasByPosition.set(positionKey, [...viasAtPosition, routeVia])
    }
  }
  const platedHoles = elements.filter(
    (element): element is PcbPlatedHole => element.type === "pcb_plated_hole",
  )
  return [...standaloneVias, ...routeVias, ...platedHoles]
}

/** Vias on the same board at the same point share a key. */
function getViaPositionKey({
  pcb_board_id,
  x,
  y,
}: {
  pcb_board_id: string | undefined
  x: number
  y: number
}): string {
  return `${pcb_board_id ?? ""}:${x}:${y}`
}
