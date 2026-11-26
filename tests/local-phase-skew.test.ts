import { expect, test } from "bun:test"
import type {
  AnyCircuitElement,
  LayerRef,
  PcbDifferentialPairPhaseSkewSegment,
  PcbTrace,
} from "circuit-json"
import {
  getLocalPhaseSkewAtPoint,
  getLocalPhaseSkewTraceIndex,
  isPointOnTraceCopper,
} from "../src/lib/local-phase-skew"

const wire = (x: number, y: number, layer: LayerRef = "top") =>
  ({ route_type: "wire", x, y, width: 0.1, layer }) as const

test("keeps known zero separate from unknown on pair copper", () => {
  const segments: PcbDifferentialPairPhaseSkewSegment[] = [
    {
      start: { x: 1, y: 0 },
      end: { x: 5, y: 0 },
      layer: "top",
      width: 0.1,
      start_length_difference_mm: 0,
      end_length_difference_mm: 2,
    },
  ]
  const skewAt = (x: number, layer: LayerRef = "top") =>
    getLocalPhaseSkewAtPoint({ segments, layer, point: { x, y: 0 } })
  expect(skewAt(0)).toBeUndefined()
  expect(skewAt(1)).toBe(0)
  expect(skewAt(3)).toBe(1)
  expect(skewAt(5)).toBe(2)
  expect(skewAt(6)).toBeUndefined()
  expect(skewAt(3, "bottom")).toBeUndefined()
})

test("indexes declared pair members that have no local match, not unrelated traces", () => {
  const elements = [
    {
      type: "source_bus",
      source_bus_id: "pair",
      differential_pair: {
        positive_source_trace_id: "p",
        negative_source_trace_id: "n",
      },
    },
    ...["p", "n", "unrelated"].map((id) => ({
      type: "pcb_trace",
      pcb_trace_id: `pcb_${id}`,
      source_trace_id: id,
      route: [wire(0, 0), wire(10, 0)],
    })),
  ] as AnyCircuitElement[]
  const index = getLocalPhaseSkewTraceIndex(elements)
  expect([...index.entries()]).toEqual([
    ["pcb_p", []],
    ["pcb_n", []],
  ])
})

test("does not report local skew over a fictitious bridge between copper layers", () => {
  const trace: PcbTrace = {
    type: "pcb_trace",
    pcb_trace_id: "trace",
    route: [
      wire(0, 0),
      wire(2, 0),
      {
        route_type: "via",
        x: 2,
        y: 0,
        from_layer: "top",
        to_layer: "bottom",
      },
      wire(2, 0, "bottom"),
      wire(4, 0, "bottom"),
    ],
  }
  expect(isPointOnTraceCopper(trace, "top", { x: 1, y: 0 })).toBe(true)
  expect(isPointOnTraceCopper(trace, "top", { x: 3, y: 0 })).toBe(false)
  expect(isPointOnTraceCopper(trace, "bottom", { x: 1, y: 0 })).toBe(false)
  expect(isPointOnTraceCopper(trace, "bottom", { x: 3, y: 0 })).toBe(true)
})
