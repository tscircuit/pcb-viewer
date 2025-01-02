import { su } from "@tscircuit/soup-util"
import { AnyCircuitElement } from "circuit-json"

interface TraceTextContext {
  primitiveElement: any
  elements: AnyCircuitElement[]
}

interface TraceOverlayInfo {
  text: string
  isOverLength: boolean
}

export function getTraceOverlayInfo({
  primitiveElement,
  elements,
}: TraceTextContext): TraceOverlayInfo | null {
  let text = primitiveElement.trace_length
    ? `${primitiveElement.trace_length.toFixed(3)}`
    : ""

  const trace = su(elements).source_trace.get(
    primitiveElement?.source_trace_id!,
  )
  // Add max length info
  if (trace?.max_length) {
    text += ` / ${trace.max_length}mm `
  } else {
    text += " mm "
  }

  // Get connection information
  if (trace?.connected_source_port_ids && trace?.connected_source_net_ids) {
    const ports = su(elements)
      .source_port.list()
      .filter((port) =>
        trace.connected_source_port_ids.includes(port.source_port_id),
      )

    const nets = su(elements)
      .source_net.list()
      .filter((net) =>
        trace.connected_source_net_ids.includes(net.source_net_id),
      )

    const sourceComponents = su(elements)
      .source_component.list()
      .filter((component) =>
        ports.some(
          (port) => port.source_component_id === component.source_component_id,
        ),
      )

    // Add connection information if we have both endpoints
    if (ports.length >= 2 && sourceComponents.length >= 2) {
      text += ` (${sourceComponents[0]?.name}.${ports[0]?.name}  to ${sourceComponents[1]?.name}.${ports[1]?.name})`
    }

    if (
      ports.length === 1 &&
      sourceComponents.length === 1 &&
      nets.length === 1
    ) {
      text += `(${sourceComponents[0]?.name}.${ports[0]?.name} to: net.${nets[0]?.name})`
    }
  }

  if (!text) return null

  const isOverLength =
    primitiveElement.trace_length &&
    trace?.max_length &&
    primitiveElement.trace_length > trace.max_length

  return {
    text,
    isOverLength,
  }
}
