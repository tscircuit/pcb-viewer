import type { AnyCircuitElement } from "circuit-json"
import type { ConnectivityMap } from "circuit-json-to-connectivity-map"
import { getElementNetId } from "./x-ray-net"

/** Pours have no interaction primitives, so resolve their highlights electrically. */
export function getHighlightedCopperPourIds(
  elements: AnyCircuitElement[],
  highlightedNetElementIds: string[],
  connectivityMap: ConnectivityMap,
): string[] {
  if (highlightedNetElementIds.length === 0) return []
  const netIds = new Set(
    highlightedNetElementIds.flatMap((id) => {
      const netId = connectivityMap.getNetConnectedToId(id)
      return netId ? [netId] : []
    }),
  )
  return elements.flatMap((element) => {
    if (element.type !== "pcb_copper_pour") return []
    const netId = getElementNetId(element, connectivityMap)
    return netId && netIds.has(netId) ? [element.pcb_copper_pour_id] : []
  })
}
