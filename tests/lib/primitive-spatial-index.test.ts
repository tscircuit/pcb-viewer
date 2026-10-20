import { expect, it } from "bun:test"
import type { PcbSmtPad, PcbTrace } from "circuit-json"
import {
  createPrimitiveSpatialIndex,
  getPrimitivesNearPoint,
} from "../../src/lib/primitive-spatial-index"
import type { Circle, Line } from "../../src/lib/types"

const trace: PcbTrace = {
  type: "pcb_trace",
  pcb_trace_id: "trace_0",
  route: [],
}

const pad: PcbSmtPad = {
  type: "pcb_smtpad",
  pcb_smtpad_id: "pad_0",
  shape: "circle",
  x: 100,
  y: 100,
  radius: 1,
  layer: "top",
}

const nearbyTrace: Line = {
  _pcb_drawing_object_id: "nearby_trace",
  _element: trace,
  pcb_drawing_type: "line",
  x1: 0,
  y1: 0,
  x2: 10,
  y2: 0,
  width: 0.2,
  layer: "top",
}

const distantPad: Circle = {
  _pcb_drawing_object_id: "distant_pad",
  _element: pad,
  pcb_drawing_type: "circle",
  x: 100,
  y: 100,
  r: 1,
  layer: "top",
}

it("returns local hover candidates without scanning distant primitives", () => {
  const primitives = [nearbyTrace, distantPad]
  const spatialIndex = createPrimitiveSpatialIndex(primitives)

  expect(
    getPrimitivesNearPoint({
      point: { x: 5, y: 0.1 },
      realToScreenScale: 40,
      spatialIndex,
    }),
  ).toEqual([nearbyTrace])
})

it("includes traces within their screen-space hit target", () => {
  const spatialIndex = createPrimitiveSpatialIndex([nearbyTrace, distantPad])

  expect(
    getPrimitivesNearPoint({
      point: { x: 5, y: 0.12 },
      realToScreenScale: 40,
      spatialIndex,
    }),
  ).toContain(nearbyTrace)
})

it("preserves primitive priority for overlapping hit candidates", () => {
  const firstPad: Circle = {
    ...distantPad,
    _pcb_drawing_object_id: "first_pad",
    x: 0,
    y: 0,
  }
  const secondPad: Circle = {
    ...distantPad,
    _pcb_drawing_object_id: "second_pad",
    x: 0,
    y: 0,
    r: 100,
  }
  const spatialIndex = createPrimitiveSpatialIndex([firstPad, secondPad])

  expect(
    getPrimitivesNearPoint({
      point: { x: 0, y: 0 },
      realToScreenScale: 40,
      spatialIndex,
    }),
  ).toEqual([firstPad, secondPad])
})
