import { expect, test } from "bun:test"
import { type PcbTrace, pcb_trace } from "circuit-json"
import { getPrimitivesUnderPoint } from "../../src/components/MouseElementTracker"
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

test("interpolated through-pad boundaries remain finite and hoverable", () => {
  const trace = pcb_trace.parse({
    type: "pcb_trace",
    pcb_trace_id: "pcb_trace_repeated_through_pad_boundary",
    route_thickness_mode: "interpolated",
    route: [
      { route_type: "wire", x: -2, y: 0, width: 0.2, layer: "top" },
      { route_type: "wire", x: -1, y: 0, width: 0.2, layer: "top" },
      {
        route_type: "through_pad",
        start: { x: -1, y: 0 },
        end: { x: 1, y: 0 },
        width: 0.6,
        start_layer: "top",
        end_layer: "top",
      },
      { route_type: "wire", x: 1, y: 0, width: 0.2, layer: "top" },
      { route_type: "wire", x: 2, y: 0, width: 0.2, layer: "top" },
    ],
  })
  const primitives = convertElementToPrimitives(trace, [trace])
  const polygon = primitives[0]

  expect(primitives).toHaveLength(1)
  expect(polygon?.pcb_drawing_type).toBe("polygon")
  if (polygon?.pcb_drawing_type !== "polygon") {
    throw new Error("Expected an interpolated trace polygon")
  }
  expect(
    polygon.points.every(
      (point) => Number.isFinite(point.x) && Number.isFinite(point.y),
    ),
  ).toBe(true)
  expect(
    getPrimitivesUnderPoint(
      primitives,
      { x: 0, y: 0.2 },
      { a: 40, b: 0, c: 0, d: -40, e: 0, f: 0 },
      "top",
    ),
  ).toEqual([polygon])
})
