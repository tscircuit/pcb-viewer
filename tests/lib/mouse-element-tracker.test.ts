import { expect, it } from "bun:test"
import type { PcbTrace } from "circuit-json"
import { getPrimitivesUnderPoint } from "../../src/components/MouseElementTracker"
import type { Line } from "../../src/lib/types"

const trace: PcbTrace = {
  type: "pcb_trace",
  pcb_trace_id: "trace_0",
  route: [],
}

const createTracePrimitive = (layer: "top" | "bottom"): Line => ({
  _pcb_drawing_object_id: `line_${layer}`,
  _element: trace,
  pcb_drawing_type: "line",
  x1: 0,
  y1: 0,
  x2: 1,
  y2: 0,
  width: 0.15,
  layer,
})

it("only hit-tests PCB traces on the selected layer", () => {
  const topTrace = createTracePrimitive("top")
  const bottomTrace = createTracePrimitive("bottom")

  expect(
    getPrimitivesUnderPoint(
      [topTrace, bottomTrace],
      { x: 0.5, y: 0 },
      { a: 40, b: 0, c: 0, d: 40, e: 0, f: 0 },
      "top",
    ),
  ).toEqual([topTrace])
})
