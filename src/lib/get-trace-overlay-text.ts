import { su } from "@tscircuit/circuit-json-util"
import type { AnyCircuitElement, PcbTrace } from "circuit-json"

interface TraceTextContext {
  primitiveElement: PcbTrace
  elements: AnyCircuitElement[]
}

interface TraceOverlayInfo {
  text: string
  name: string | null
  isOverLength: boolean
}

const getNonEmptyName = (name?: string) => name?.trim() || null

export function getAssociatedTraceName({
  primitiveElement,
  elements,
}: TraceTextContext): string | null {
  const sourceElementId = primitiveElement.source_trace_id
  if (!sourceElementId) return null

  const circuitJson = su(elements)
  const sourceTrace = circuitJson.source_trace.get(sourceElementId)

  const sourceTraceName = getNonEmptyName(sourceTrace?.name)
  if (sourceTraceName) return sourceTraceName

  const sourceNet = circuitJson.source_net.get(sourceElementId)
  const sourceNetName = getNonEmptyName(sourceNet?.name)
  if (sourceNetName) return sourceNetName

  for (const sourceNetId of sourceTrace?.connected_source_net_ids ?? []) {
    const connectedSourceNetName = getNonEmptyName(
      circuitJson.source_net.get(sourceNetId)?.name,
    )
    if (connectedSourceNetName) return connectedSourceNetName
  }

  return null
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
  const name = getAssociatedTraceName({ primitiveElement, elements })
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

  if (!text && !name) return null

  const isOverLength = Boolean(
    primitiveElement.trace_length &&
      trace?.max_length &&
      primitiveElement.trace_length > trace.max_length,
  )

  return {
    text,
    name,
    isOverLength,
  }
}
