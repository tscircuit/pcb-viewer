import type { AnyCircuitElement } from "circuit-json"

/** Maps each bus that sets max_length_skew to that limit, so a pair's phase skew color is full at its own limit. */
export function getPhaseSkewFullScaleMmBySourceBusId(
  elements: AnyCircuitElement[],
): Record<string, number> {
  const fullScaleMmBySourceBusId: Record<string, number> = {}
  for (const element of elements) {
    if (element.type !== "source_bus") continue
    if (element.max_length_skew === undefined) continue
    fullScaleMmBySourceBusId[element.source_bus_id] = element.max_length_skew
  }
  return fullScaleMmBySourceBusId
}
