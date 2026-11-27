import type { Point } from "@tscircuit/math-utils"
import type { HighlightedPrimitive } from "components/MouseElementTracker"
import type { PhaseSkewTraceIndex } from "./create-phase-skew-trace-index"
import { getPhaseSkewAtPoint } from "./get-phase-skew-at-point"
import { getPhaseSkewText } from "./get-phase-skew-text"

export function getPrimitivePhaseSkewText({
  primitive,
  phaseSkewTraceIndex,
  point,
}: {
  primitive: HighlightedPrimitive
  phaseSkewTraceIndex?: PhaseSkewTraceIndex
  point?: Point
}): string | null {
  if (primitive._element.type !== "pcb_trace") return null
  const trace = phaseSkewTraceIndex?.[primitive._element.pcb_trace_id]
  if (!trace || !point || !primitive.layer) return null
  const differenceMm = getPhaseSkewAtPoint({
    trace,
    point,
    layer: primitive.layer,
  })
  if (differenceMm === null) return null
  return getPhaseSkewText(differenceMm)
}
