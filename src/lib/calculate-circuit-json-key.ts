import { getBoundsOfPcbElements, getElementId } from "@tscircuit/circuit-json-util"
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
    if (element.type === "pcb_trace") {
      const routeLength = ((element as PcbTrace).route ?? []).length
      signature += `:${routeLength}`
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
