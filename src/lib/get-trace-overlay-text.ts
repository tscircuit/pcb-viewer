import { su } from "@tscircuit/soup-util"
import { AnyCircuitElement } from "circuit-json"

interface TraceOverlayInfo {
  text: string
  isOverLength: boolean
}

export function getTraceOverlayInfo({
  primitiveElement,
  elements,
  isMultipleTraces,
}: {
  primitiveElement: any
  elements: AnyCircuitElement[]
  isMultipleTraces: boolean
}): TraceOverlayInfo | null {
  let text = primitiveElement.trace_length
    ? `${primitiveElement.trace_length.toFixed(3)}`
    : ""

  const trace = su(elements).source_trace.get(
    primitiveElement?.source_trace_id!,
  )

  if (trace?.max_length) {
    text += ` / ${trace.max_length}mm`
  } else if (primitiveElement.trace_length) {
    text += " mm"
  }

  const ports = su(elements)
    .source_port.list()
    .filter((port) =>
      trace?.connected_source_port_ids.includes(port.source_port_id),
    )

  const sourceComponents = su(elements)
    .source_component.list()
    .filter((component) =>
      ports.some(
        (port) => port.source_component_id === component.source_component_id,
      ),
    )

  if (isMultipleTraces) {
    text += ` {${sourceComponents[0].name}.${ports[0].name} to:
 ${sourceComponents[1].name}.${ports[1].name}}`
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
