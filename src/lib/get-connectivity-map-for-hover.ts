import type { AnyCircuitElement, PcbTrace } from "circuit-json"
import { getFullConnectivityMapFromCircuitJson } from "circuit-json-to-connectivity-map"

const hasAuthoritativePcbPortEndpoints = (trace: PcbTrace) => {
  let startPcbPortId: string | undefined
  let endPcbPortId: string | undefined

  for (const routePoint of trace.route) {
    if (routePoint.route_type !== "wire") continue
    startPcbPortId ??= routePoint.start_pcb_port_id
    endPcbPortId ??= routePoint.end_pcb_port_id
  }

  return Boolean(startPcbPortId && endPcbPortId)
}

/**
 * Build the connectivity map used for PCB hover highlighting.
 *
 * A routed trace with both PCB port endpoints is fully attributed by those
 * endpoints. Autorouted MST branches can also carry a `source_trace_id` for
 * just one source branch; treating that metadata as another electrical
 * connection can merge otherwise unrelated nets in the hover map.
 */
export const getConnectivityMapForHover = (elements: AnyCircuitElement[]) => {
  const elementsWithAuthoritativePcbConnectivity = elements.map((element) => {
    if (
      element.type !== "pcb_trace" ||
      !element.source_trace_id ||
      !hasAuthoritativePcbPortEndpoints(element)
    ) {
      return element
    }

    const { source_trace_id: _sourceTraceId, ...traceWithPcbEndpoints } =
      element
    return traceWithPcbEndpoints as AnyCircuitElement
  })

  return getFullConnectivityMapFromCircuitJson(
    elementsWithAuthoritativePcbConnectivity,
  )
}
