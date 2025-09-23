import { su } from "@tscircuit/circuit-json-util"
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
  // Get connection information
  if (trace?.display_name) {
    // Add max length info
    if (trace?.max_length) {
      text += ` / ${trace.max_length}mm `
    } else {
      text += " mm "
    }
    text += `(${trace.display_name})`
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
