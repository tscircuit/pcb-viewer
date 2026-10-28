import {
  getBoundsOfPcbElements,
  getElementId,
} from "@tscircuit/circuit-json-util"
import type { AnyCircuitElement, PcbTraceRoutePoint } from "circuit-json"

const formatToFixed4 = (value: number): string =>
  Number.isFinite(value) ? value.toFixed(4) : "NaN"

const generateHash = (input: string): number => {
  let hash = 5381
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) + hash + input.charCodeAt(i)
  }
  return Math.abs(hash)
}

const getTraceRoutePointSignature = (point: PcbTraceRoutePoint): string => {
  switch (point.route_type) {
    case "wire":
      return JSON.stringify([
        point.route_type,
        point.x,
        point.y,
        point.width,
        point.layer,
        point.copper_pour_id,
        point.is_inside_copper_pour,
        point.start_pcb_port_id,
        point.end_pcb_port_id,
      ])
    case "via":
      return JSON.stringify([
        point.route_type,
        point.x,
        point.y,
        point.from_layer,
        point.to_layer,
        point.outer_diameter,
        point.hole_diameter,
        point.tented_on_top,
        point.tented_on_bottom,
        point.copper_pour_id,
        point.is_inside_copper_pour,
      ])
    case "through_pad":
      return JSON.stringify([
        point.route_type,
        point.start.x,
        point.start.y,
        point.end.x,
        point.end.y,
        point.width,
        point.start_layer,
        point.end_layer,
        point.pcb_smtpad_id,
        point.pcb_plated_hole_id,
      ])
    default:
      // Preserve support for legacy routes without a route_type discriminator.
      return JSON.stringify(point)
  }
}

export const calculateCircuitJsonKey = (
  circuitJson?: AnyCircuitElement[],
): string => {
  if (!circuitJson?.length) {
    return "0"
  }

  const elementSignatures: string[] = []

  for (const element of circuitJson) {
    if (!element?.type?.startsWith("pcb_")) {
      continue
    }

    const id = getElementId(element)

    const bounds = getBoundsOfPcbElements([element])

    const boundsStr = [
      formatToFixed4(bounds.minX),
      formatToFixed4(bounds.minY),
      formatToFixed4(bounds.maxX),
      formatToFixed4(bounds.maxY),
    ].join(",")
    let signature = `${id}:${boundsStr}`
    if (element.type === "pcb_trace") {
      signature += `:${(element.route ?? []).length}:${element.route_thickness_mode ?? "constant"}:${element.should_round_corners ?? false}:${element.highlight_color ?? ""}`
      for (const point of element.route ?? []) {
        // A route can change while its bounds and point count stay identical.
        // Use a fixed field order so equivalent JSON keeps the same key.
        signature += `:${getTraceRoutePointSignature(point)}`
      }
    }
    if (element.type === "pcb_board") {
      signature += `:${element.default_via_tented_on_top}:${element.default_via_tented_on_bottom}`
    }
    if (element.type === "pcb_via") {
      signature += `:${element.tented_on_top}:${element.tented_on_bottom}`
    }

    elementSignatures.push(signature)
  }

  if (elementSignatures.length === 0) {
    return "0"
  }

  elementSignatures.sort()

  const combinedSignature = elementSignatures.join(",")
  const hash = generateHash(combinedSignature)

  return `${elementSignatures.length}_${hash.toString(36)}`
}
