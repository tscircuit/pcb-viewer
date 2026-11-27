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

test("the bumped trace leads and its partner lags by the same amount", () => {
  expect(hoverText("pcb_trace_0", { x: 5, y: 0.6 })).toBe("Leading by 1.823 mm")
  expect(hoverText("pcb_trace_1", { x: 5, y: -0.6 })).toBe(
    "Lagging by 1.823 mm",
  )
})

test("phase skew is interpolated along a segment and zero before the bump", () => {
  expect(hoverText("pcb_trace_0", { x: -11, y: 0.6 })).toBe("In phase")
  expect(hoverText("pcb_trace_0", { x: -8.9, y: 1.7 })).toBe(
    "Leading by 0.404 mm",
  )
})

test("points away from the trace have no phase skew", () => {
  expect(hoverText("pcb_trace_0", { x: 5, y: 3 })).toBeNull()
})
