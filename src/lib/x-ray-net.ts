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
    ["pcb_trace", "pcb_smtpad", "pcb_plated_hole", "pcb_via"].includes(
      element.type,
    )
  )
}
