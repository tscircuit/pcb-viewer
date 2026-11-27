import { expect, test } from "bun:test"
import { Circuit } from "@tscircuit/core"
import ForumExampleBoard from "../../src/examples/2026/differential-pair-phase-skew/forum-example.circuit"
import {
  createPhaseSkewTraceIndex,
  getPhaseSkewAtPoint,
  getPhaseSkewText,
} from "../../src/lib/get-phase-skew-at-point"

const circuit = new Circuit()
circuit.add(<ForumExampleBoard />)
await circuit.renderUntilSettled()
const index = createPhaseSkewTraceIndex(circuit.getCircuitJson())

function getHoverText({
  pcbTraceId,
  x,
  y,
  layer = "top",
}: { pcbTraceId: string; x: number; y: number; layer?: string }) {
  const differenceMm = getPhaseSkewAtPoint({
    trace: index[pcbTraceId]!,
    point: { x, y },
    layer,
  })
  return differenceMm === null ? null : getPhaseSkewText(differenceMm)
}

test("the positive trace leads over its bump while the negative trace lags", () => {
  expect(getHoverText({ pcbTraceId: "pcb_trace_0", x: -0.934, y: 4.711 })).toBe(
    "Leading 2.430 mm",
  )
  expect(getHoverText({ pcbTraceId: "pcb_trace_1", x: 1.943, y: 2.28 })).toBe(
    "Lagging 0.837 mm",
  )
})

test("phase skew is interpolated along a segment", () => {
  // Midway along the diagonal from 0.66885 mm to 0.96279 mm ahead.
  expect(getHoverText({ pcbTraceId: "pcb_trace_0", x: -4.557, y: 3.443 })).toBe(
    "Leading 0.816 mm",
  )
})

test("both traces are in phase at their ends", () => {
  expect(getHoverText({ pcbTraceId: "pcb_trace_0", x: -9.5, y: 1.99 })).toBe(
    "In phase",
  )
  expect(getHoverText({ pcbTraceId: "pcb_trace_0", x: 9.5, y: 1.99 })).toBe(
    "In phase",
  )
  expect(getHoverText({ pcbTraceId: "pcb_trace_1", x: 9.5, y: 0.34 })).toBe(
    "In phase",
  )
})

test("hovering a trace on one layer ignores phase skew measured on another", () => {
  expect(
    getHoverText({
      pcbTraceId: "pcb_trace_0",
      x: -0.934,
      y: 4.711,
      layer: "bottom",
    }),
  ).toBeNull()
})
