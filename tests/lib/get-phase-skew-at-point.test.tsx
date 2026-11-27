import { expect, test } from "bun:test"
import { Circuit } from "@tscircuit/core"
import TuningBumpBoard from "../../src/examples/2026/differential-pair-phase-skew/tuning-bump.circuit"
import {
  createPhaseSkewTraceIndex,
  getPhaseSkewAtPoint,
  getPhaseSkewText,
} from "../../src/lib/get-phase-skew-at-point"

const circuit = new Circuit()
circuit.add(<TuningBumpBoard />)
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

test("the bumped trace leads and its partner lags by the same amount", () => {
  expect(getHoverText({ pcbTraceId: "pcb_trace_0", x: 5, y: 0.6 })).toBe(
    "Leading 1.82 mm",
  )
  expect(getHoverText({ pcbTraceId: "pcb_trace_1", x: 5, y: -0.6 })).toBe(
    "Lagging 1.82 mm",
  )
})

test("hover reads the nearest stored sample", () => {
  expect(getHoverText({ pcbTraceId: "pcb_trace_0", x: -11, y: 0.6 })).toBe(
    "In phase",
  )
  expect(getHoverText({ pcbTraceId: "pcb_trace_0", x: -8.9, y: 1.7 })).toBe(
    "Leading 0.40 mm",
  )
})

test("hovering a trace on one layer ignores phase skew measured on another", () => {
  expect(
    getHoverText({ pcbTraceId: "pcb_trace_0", x: 5, y: 0.6, layer: "bottom" }),
  ).toBeNull()
})
