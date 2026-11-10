import {
  getBoundsOfPcbElements,
  getElementId,
} from "@tscircuit/circuit-json-util"
import type { AnyCircuitElement, PcbTrace } from "circuit-json"

const formatToFixed4 = (value: number): string =>
  Number.isFinite(value) ? value.toFixed(4) : "NaN"

const generateHash = (input: string): number => {
  let hash = 5381
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) + hash + input.charCodeAt(i)
  }
  return Math.abs(hash)
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
    if ("layer" in element && typeof element.layer === "string") {
      signature += `:${element.layer}`
    } else if ("layers" in element && Array.isArray(element.layers)) {
      signature += `:${element.layers.join("+")}`
    }
    if ("is_covered_with_solder_mask" in element) {
      signature += `:${element.is_covered_with_solder_mask}`
    } else if ("covered_with_solder_mask" in element) {
      signature += `:${element.covered_with_solder_mask}`
    }
    if (element.type === "pcb_trace") {
      const route = (element as PcbTrace).route ?? []
      signature += `:${route.length}`
      for (const point of route) {
        if (!point) continue
        if (point.route_type === "via") {
          signature += `:${formatToFixed4(point.x)},${formatToFixed4(point.y)},${point.from_layer},${point.to_layer},${point.tented_on_top},${point.tented_on_bottom}`
        } else if (point.route_type === "through_pad") {
          signature += `:${formatToFixed4(point.start.x)},${formatToFixed4(point.start.y)},${formatToFixed4(point.end.x)},${formatToFixed4(point.end.y)},${formatToFixed4(point.width)},${point.start_layer},${point.end_layer}`
        } else {
          signature += `:${formatToFixed4(point.x)},${formatToFixed4(point.y)},${formatToFixed4(point.width ?? 0)},${point.layer}`
        }
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
