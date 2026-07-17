import { expect, test } from "bun:test"
import type { PcbTrace } from "circuit-json"
import { convertElementToPrimitives } from "../../src/lib/convert-element-to-primitive"

test("interpolated traces accept through-pad route points", () => {
  const trace: PcbTrace = {
    type: "pcb_trace",
    pcb_trace_id: "pcb_trace_through_pad",
    route_thickness_mode: "interpolated",
    route: [
      {
        route_type: "wire",
        x: -2,
        y: 0,
        width: 0.2,
        layer: "inner7",
      },
      {
        route_type: "through_pad",
        start: { x: -1, y: 0 },
        end: { x: 1, y: 0 },
        width: 0.6,
        start_layer: "inner7",
        end_layer: "inner8",
      },
      {
        route_type: "wire",
        x: 2,
        y: 0,
        width: 0.2,
        layer: "inner8",
      },
    ],
  }

  const primitives = convertElementToPrimitives(trace, [trace])

  expect(primitives).toHaveLength(1)
  expect(primitives[0]?.pcb_drawing_type).toBe("polygon")
  expect(
    primitives[0]?.pcb_drawing_type === "polygon" &&
      primitives[0].points.every(
        (point) => Number.isFinite(point.x) && Number.isFinite(point.y),
      ),
  ).toBe(true)
})
