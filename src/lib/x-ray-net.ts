import {
  getAssociatedTraceName,
  getTraceOverlayInfo,
} from "./get-trace-overlay-text"
import type { AnyCircuitElement } from "circuit-json"
import type { ConnectivityMap } from "circuit-json-to-connectivity-map"

/** Resolve copper through electrical connectivity, never through its component. */
export function getElementNetId(
  element: AnyCircuitElement | undefined,
  connectivityMap: ConnectivityMap,
): string | undefined {
  if (!element) return
  const ids: string[] = []
  for (const key of [
    `${element.type}_id`,
    "pcb_port_id",
    "pcb_trace_id",
    "source_trace_id",
    "source_net_id",
  ]) {
    const value = (element as unknown as Record<string, unknown>)[key]
    if (typeof value === "string") ids.push(value)
  }
  for (const id of ids) {
    const net = connectivityMap.getNetConnectedToId(id)
    if (net) return net
  }
}

export function isXRayCopper(element: AnyCircuitElement | undefined) {
  return (
    element &&
    [
      "pcb_trace",
      "pcb_smtpad",
      "pcb_plated_hole",
      "pcb_via",
      "pcb_copper_pour",
    ].includes(element.type)
  )
}

/** Use trace/net names before generated pad-selector labels, consistently with hover text. */
export function getXRayDisplayName(
  element: AnyCircuitElement,
  elements: AnyCircuitElement[],
  connectivityMap: ConnectivityMap,
): string {
  const directName =
    element.type === "pcb_trace"
      ? getAssociatedTraceName({ primitiveElement: element, elements })
      : null
  if (directName) return directName
  const netId = getElementNetId(element, connectivityMap)
  const connected = netId
    ? elements.filter(
        (candidate) => getElementNetId(candidate, connectivityMap) === netId,
      )
    : []
  for (const type of ["source_net", "source_trace"]) {
    for (const candidate of connected) {
      if (
        candidate.type === type &&
        "name" in candidate &&
        typeof candidate.name === "string" &&
        candidate.name.trim()
      )
        return candidate.name.trim()
    }
  }
  if (element.type === "pcb_trace") {
    const label = getTraceOverlayInfo({
      primitiveElement: element,
      elements,
    })?.name
    if (label) return label
  }
  for (const candidate of connected) {
    if (candidate.type === "source_trace" && candidate.display_name?.trim())
      return candidate.display_name.trim()
  }
  return "Net"
}

export interface XRayGroup {
  id: string
  name: string
  netIds: string[]
}

/** Resolve bus members electrically so pads and split trace segments work too. */
export function getXRayGroups(
  netId: string,
  elements: AnyCircuitElement[],
  connectivityMap: ConnectivityMap,
): XRayGroup[] {
  return elements.flatMap((element) => {
    if (element.type !== "source_bus") return []
    const netIds = [
      ...new Set(
        element.source_trace_ids.flatMap((id) => {
          const net = connectivityMap.getNetConnectedToId(id)
          return net ? [net] : []
        }),
      ),
    ]
    if (!netIds.includes(netId)) return []
    return [
      {
        id: element.source_bus_id,
        name: element.name?.trim() || "Bus",
        netIds,
      },
    ]
  })
}
