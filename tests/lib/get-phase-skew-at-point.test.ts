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
    layer: "top",
  })
  return differenceMm === null ? null : getPhaseSkewText(differenceMm)
}

test("the bumped trace leads and its partner lags by the same amount", () => {
  expect(hoverText("pcb_trace_0", { x: 5, y: 0.6 })).toBe("Leading 1.823 mm")
  expect(hoverText("pcb_trace_1", { x: 5, y: -0.6 })).toBe("Lagging 1.823 mm")
})

test("phase skew is interpolated along a segment and in phase before the bump", () => {
  expect(hoverText("pcb_trace_0", { x: -11, y: 0.6 })).toBe("In phase")
  expect(hoverText("pcb_trace_0", { x: -8.9, y: 1.7 })).toBe("Leading 0.404 mm")
})

test("points away from the trace have no phase skew", () => {
  expect(hoverText("pcb_trace_0", { x: 5, y: 3 })).toBeNull()
})

test("zero-length and non-finite segments do not replace a valid skew reading", () => {
  const trace = index.pcb_trace_0!
  const point = { x: 5, y: 0.61 }
  const segment = trace.segments.at(-1)!

  for (const invalidSegment of [
    { ...segment, start: point, end: point },
    {
      ...segment,
      start: { ...segment.start, y: point.y },
      end: { ...segment.end, y: point.y },
      end_length_difference_mm: Number.POSITIVE_INFINITY,
    },
  ]) {
    expect(
      getPhaseSkewAtPoint({
        trace: { ...trace, segments: [...trace.segments, invalidSegment] },
        point,
        maxDistanceMm: 0.1,
        layer: "top",
      }),
    ).toBeCloseTo(1.82254)
  }
})

test("phase skew trace IDs cannot resolve to inherited properties", () => {
  expect(index.constructor).toBeUndefined()
  expect(index.__proto__).toBeUndefined()
})

test("the phase skew index skips pairs missing a trace or segment array", () => {
  const pair = (tuningBump as AnyCircuitElement[]).find(
    (element) => element.type === "pcb_differential_pair_phase_skew",
  )!
  const { positive_trace, negative_trace, ...pairWithoutTraces } = pair
  const { segments: _segments, ...negativeTraceWithoutSegments } =
    negative_trace

  for (const incompletePair of [
    { ...pairWithoutTraces, negative_trace },
    { ...pairWithoutTraces, positive_trace },
    {
      ...pairWithoutTraces,
      positive_trace,
      negative_trace: negativeTraceWithoutSegments,
    },
  ]) {
    expect(
      Object.keys(
        createPhaseSkewTraceIndex([incompletePair] as AnyCircuitElement[]),
      ),
    ).toEqual([])
  }
})

test("hovering a trace on one layer ignores phase skew measured on another", async () => {
  const { default: ddr } = await import(
    "../../src/examples/2026/differential-pair-phase-skew/am3352-ddr-track-a.circuit.json"
  )
  const ddrIndex = createPhaseSkewTraceIndex(ddr as AnyCircuitElement[])
  // DDR_DQS_PAIR1's top-layer fanout sits over its bottom-layer coupled run
  const fanoutPoint = { x: 1.2, y: -6.8 }
  expect(
    getPhaseSkewAtPoint({
      trace: ddrIndex.pcb_trace_414!,
      point: fanoutPoint,
      maxDistanceMm: 0.1,
      layer: "top",
    }),
  ).toBeNull()
  expect(
    getPhaseSkewAtPoint({
      trace: ddrIndex.pcb_trace_414!,
      point: fanoutPoint,
      maxDistanceMm: 0.1,
      layer: "bottom",
    }),
  ).toBeCloseTo(-0.85007)
})
