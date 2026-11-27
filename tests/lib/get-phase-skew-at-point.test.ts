import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import tuningBump from "../../src/examples/2026/differential-pair-phase-skew/tuning-bump.circuit.json"
import {
  createPhaseSkewTraceIndex,
  getPhaseSkewAtPoint,
  getPhaseSkewText,
} from "../../src/lib/get-phase-skew-at-point"

const index = createPhaseSkewTraceIndex(tuningBump as AnyCircuitElement[])
const hoverText = (pcbTraceId: string, point: { x: number; y: number }) => {
  const differenceMm = getPhaseSkewAtPoint({
    trace: index[pcbTraceId]!,
    point,
    maxDistanceMm: 0.1,
  })
  return differenceMm === null ? null : getPhaseSkewText(differenceMm)
}

test("the bumped trace is longer and its partner shorter by the same amount", () => {
  expect(hoverText("pcb_trace_0", { x: 5, y: 0.6 })).toBe(
    "1.823 mm longer than partner",
  )
  expect(hoverText("pcb_trace_1", { x: 5, y: -0.6 })).toBe(
    "1.823 mm shorter than partner",
  )
})

test("phase skew is interpolated along a segment and matched before the bump", () => {
  expect(hoverText("pcb_trace_0", { x: -11, y: 0.6 })).toBe("Length matched")
  expect(hoverText("pcb_trace_0", { x: -8.9, y: 1.7 })).toBe(
    "0.404 mm longer than partner",
  )
})

test("points away from the trace have no phase skew", () => {
  expect(hoverText("pcb_trace_0", { x: 5, y: 3 })).toBeNull()
})
