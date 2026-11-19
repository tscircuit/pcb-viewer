import type { CircuitJson, PcbTrace, SourceTrace } from "circuit-json"

/**
 * Length of copper a named trace has run when it first reaches `x`,
 * measured from its first route point. Throws if the trace is missing or
 * never reaches `x`, so a broken fixture fails the test.
 */
export function routeLengthToX({
  circuitJson,
  traceName,
  x,
}: {
  circuitJson: CircuitJson
  traceName: string
  x: number
}): number {
  const sourceTrace = circuitJson.find(
    (element): element is SourceTrace =>
      element.type === "source_trace" && element.name === traceName,
  )
  const pcbTrace = circuitJson.find(
    (element): element is PcbTrace =>
      element.type === "pcb_trace" &&
      element.source_trace_id === sourceTrace?.source_trace_id,
  )
  if (!pcbTrace) throw new Error(`No routed trace named ${traceName}`)

  let length = 0
  for (let i = 0; i + 1 < pcbTrace.route.length; i++) {
    const from = pcbTrace.route[i]
    const to = pcbTrace.route[i + 1]
    if (from.route_type !== "wire" || to.route_type !== "wire") {
      throw new Error("routeLengthToX only supports wire-only routes")
    }
    const stepLength = Math.hypot(to.x - from.x, to.y - from.y)
    const crossesX = (from.x - x) * (to.x - x) <= 0 && from.x !== to.x
    if (crossesX) {
      return length + (stepLength * (x - from.x)) / (to.x - from.x)
    }
    length += stepLength
  }
  throw new Error(`${traceName} never reaches x = ${x}`)
}
