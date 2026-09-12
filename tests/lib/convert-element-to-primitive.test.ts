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

test("polygon pad plated hole follows ccw_rotation", () => {
  // 6mm x 1mm bar with the drill offset to the right end
  const bar = {
    type: "pcb_plated_hole",
    pcb_plated_hole_id: "pcb_plated_hole_polygon",
    shape: "hole_with_polygon_pad",
    hole_shape: "circle",
    hole_diameter: 0.8,
    x: 10,
    y: 5,
    hole_offset_x: 2,
    hole_offset_y: 0,
    pad_outline: [
      { x: -3, y: -0.5 },
      { x: 3, y: -0.5 },
      { x: 3, y: 0.5 },
      { x: -3, y: 0.5 },
    ],
    layers: ["top", "bottom"],
  } as any

  const unrotated = convertElementToPrimitives(bar, [bar])
  const rotated = convertElementToPrimitives({ ...bar, ccw_rotation: 90 }, [
    bar,
  ])

  const polygon = (primitives: any[]) =>
    primitives.find((p) => p.pcb_drawing_type === "polygon")
  const drill = (primitives: any[]) =>
    primitives.find((p) => p.layer === "drill")

  const extent = (points: { x: number; y: number }[]) => ({
    width:
      Math.max(...points.map((p) => p.x)) - Math.min(...points.map((p) => p.x)),
    height:
      Math.max(...points.map((p) => p.y)) - Math.min(...points.map((p) => p.y)),
  })

  expect(extent(polygon(unrotated).points)).toEqual({ width: 6, height: 1 })
  const rotatedExtent = extent(polygon(rotated).points)
  expect(rotatedExtent.width).toBeCloseTo(1, 6)
  expect(rotatedExtent.height).toBeCloseTo(6, 6)

  // the drill offset rotates with the pad: right of the center -> above it
  expect(drill(unrotated).x).toBeCloseTo(12, 6)
  expect(drill(unrotated).y).toBeCloseTo(5, 6)
  expect(drill(rotated).x).toBeCloseTo(10, 6)
  expect(drill(rotated).y).toBeCloseTo(7, 6)
})
