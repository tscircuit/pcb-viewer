import type { AnyCircuitElement, PcbTrace } from "circuit-json"

export interface ReturnCurrentRegion {
  minX: number
  minY: number
  maxX: number
  maxY: number
  marginMm: number
}

export function getReturnCurrentRegion(
  circuitJson: readonly AnyCircuitElement[],
  route: PcbTrace["route"],
  contactIds: string[],
  marginMm: number,
): ReturnCurrentRegion {
  if (!Number.isFinite(marginMm) || marginMm < 0.25 || marginMm > 20)
    throw new Error("Region margin must be 0.25–20 mm.")
  const board = circuitJson.find((element) => element.type === "pcb_board")
  if (!board || board.outline?.length || !board.width || !board.height)
    throw new Error(
      "Local regions currently require a rectangular PCB outline.",
    )
  const points = route.flatMap((point) => {
    if (point.route_type === "through_pad")
      throw new Error("Through-pad signal routes are unsupported.")
    const radius =
      point.route_type === "wire"
        ? point.width / 2
        : point.route_type === "via"
          ? Math.max(
              0,
              ...circuitJson
                .filter(
                  (e) =>
                    e.type === "pcb_via" &&
                    Math.hypot(e.x - point.x, e.y - point.y) < 1e-6,
                )
                .map((e) => (e.type === "pcb_via" ? e.outer_diameter / 2 : 0)),
            )
          : 0
    return [
      { x: point.x - radius, y: point.y - radius },
      { x: point.x + radius, y: point.y + radius },
    ]
  })
  for (const element of circuitJson) {
    if (element.type === "pcb_port" && contactIds.includes(element.pcb_port_id))
      points.push(element)
    if (
      element.type === "pcb_smtpad" &&
      element.pcb_port_id &&
      contactIds.includes(element.pcb_port_id)
    ) {
      if (element.shape === "polygon") {
        points.push(...element.points)
        continue
      }
      // Circumscribed circle also contains rotated pads; conservative crop bounds.
      const radius =
        element.shape === "rect"
          ? Math.hypot(element.width, element.height) / 2
          : element.shape === "circle"
            ? element.radius
            : 0
      points.push(
        { x: element.x - radius, y: element.y - radius },
        { x: element.x + radius, y: element.y + radius },
      )
    }
  }
  if (!points.length)
    throw new Error(
      "Choose a complete routed signal before defining its region.",
    )
  return {
    minX: Math.max(
      board.center.x - board.width / 2,
      Math.min(...points.map((p) => p.x)) - marginMm,
    ),
    minY: Math.max(
      board.center.y - board.height / 2,
      Math.min(...points.map((p) => p.y)) - marginMm,
    ),
    maxX: Math.min(
      board.center.x + board.width / 2,
      Math.max(...points.map((p) => p.x)) + marginMm,
    ),
    maxY: Math.min(
      board.center.y + board.height / 2,
      Math.max(...points.map((p) => p.y)) + marginMm,
    ),
    marginMm,
  }
}
