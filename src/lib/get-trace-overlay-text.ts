import type {
  AnyCircuitElement,
  PcbTrace,
  SourceNet,
  SourceTrace,
} from "circuit-json"

type SourceNetId = SourceNet["source_net_id"]
type SourceTraceId = SourceTrace["source_trace_id"]

export interface TraceOverlayElementIndex {
  sourceNetById: Map<SourceNetId, SourceNet>
  sourceTraceById: Map<SourceTraceId, SourceTrace>
}

interface TraceTextContext {
  primitiveElement: PcbTrace
  traceOverlayElementIndex: TraceOverlayElementIndex
}

interface TraceOverlayInfo {
  text: string
  name: string | null
  isOverLength: boolean
}

const getNonEmptyName = (name?: string) => name?.trim() || null

export function createTraceOverlayElementIndex(
  elements: AnyCircuitElement[],
): TraceOverlayElementIndex {
  const sourceNetById = new Map<SourceNetId, SourceNet>()
  const sourceTraceById = new Map<SourceTraceId, SourceTrace>()

  for (const element of elements) {
    if (element.type === "source_net") {
      sourceNetById.set(element.source_net_id, element)
    } else if (element.type === "source_trace") {
      sourceTraceById.set(element.source_trace_id, element)
    }
  }

  return { sourceNetById, sourceTraceById }
}

export function getAssociatedTraceName({
  primitiveElement,
  traceOverlayElementIndex,
}: TraceTextContext): string | null {
  const sourceElementId = primitiveElement.source_trace_id
  if (!sourceElementId) return null

  const sourceTrace =
    traceOverlayElementIndex.sourceTraceById.get(sourceElementId)

  const sourceTraceName = getNonEmptyName(sourceTrace?.name)
  if (sourceTraceName) return sourceTraceName

  const sourceNet = traceOverlayElementIndex.sourceNetById.get(sourceElementId)
  const sourceNetName = getNonEmptyName(sourceNet?.name)
  if (sourceNetName) return sourceNetName

  for (const sourceNetId of sourceTrace?.connected_source_net_ids ?? []) {
    const connectedSourceNetName = getNonEmptyName(
      traceOverlayElementIndex.sourceNetById.get(sourceNetId)?.name,
    )
    if (connectedSourceNetName) return connectedSourceNetName
  }

  return null
}

export function getTraceOverlayInfo({
  primitiveElement,
  traceOverlayElementIndex,
}: TraceTextContext): TraceOverlayInfo | null {
  const sourceTraceId = primitiveElement.source_trace_id
  const trace = sourceTraceId
    ? traceOverlayElementIndex.sourceTraceById.get(sourceTraceId)
    : undefined
  const traceLength = primitiveElement.trace_length
  const hasTraceLength = typeof traceLength === "number"
  const maxLength = trace?.max_length
  const text = hasTraceLength
    ? `${traceLength.toFixed(3)}${
        typeof maxLength === "number" ? ` / ${maxLength}` : ""
      } mm`
    : ""
  const name =
    getAssociatedTraceName({
      primitiveElement,
      traceOverlayElementIndex,
    }) ?? getNonEmptyName(trace?.display_name)

  if (!text && !name) return null

  const isOverLength = Boolean(
    hasTraceLength && typeof maxLength === "number" && traceLength > maxLength,
  )

  return {
    text,
    name,
    isOverLength,
  }
}
