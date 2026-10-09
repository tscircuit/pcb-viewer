import { expect, test } from "bun:test"
import { getBoundsOfPcbElements } from "@tscircuit/circuit-json-util"
import {
  type PcbTrace,
  type PcbTraceRoutePointThroughPad,
  type PcbTraceRoutePointVia,
  pcb_trace,
} from "circuit-json"
import { calculateCircuitJsonKey } from "../../src/lib/calculate-circuit-json-key"
import { convertElementToPrimitives } from "../../src/lib/convert-element-to-primitive"

const createTrace = (overrides: Partial<PcbTrace> = {}): PcbTrace => ({
  type: "pcb_trace",
  pcb_trace_id: "trace_refresh",
  route: [
    { route_type: "wire", x: 0, y: 0, width: 0.2, layer: "top" },
    { route_type: "wire", x: 5, y: 5, width: 0.2, layer: "top" },
    { route_type: "wire", x: 10, y: 10, width: 0.2, layer: "top" },
  ],
  ...overrides,
})

const expectTraceRefresh = (before: PcbTrace, after: PcbTrace) => {
  expect(pcb_trace.safeParse(before).success).toBe(true)
  expect(pcb_trace.safeParse(after).success).toBe(true)
  expect(after.route).toHaveLength(before.route.length)
  expect(getBoundsOfPcbElements([after])).toEqual(
    getBoundsOfPcbElements([before]),
  )
  expect(calculateCircuitJsonKey([after])).not.toBe(
    calculateCircuitJsonKey([before]),
  )
}

test("moving an interior waypoint refreshes the trace without changing its bounds", () => {
  const before = createTrace()
  const after = createTrace({
    route: [
      before.route[0]!,
      { route_type: "wire", x: 5, y: 3, width: 0.2, layer: "top" },
      before.route[2]!,
    ],
  })

  // The converter produces a different path, so the viewer must not retain
  // the old circuit elements in its circuitJsonKey-dependent memo.
  expect(convertElementToPrimitives(before, [before])[0]).toMatchObject({
    pcb_drawing_type: "line",
    x2: 5,
    y2: 5,
  })
  expect(convertElementToPrimitives(after, [after])[0]).toMatchObject({
    pcb_drawing_type: "line",
    x2: 5,
    y2: 3,
  })
  expectTraceRefresh(before, after)
})

test("wire width changes refresh the trace within unchanged bounds", () => {
  const before = createTrace()
  expectTraceRefresh(
    before,
    createTrace({
      route: [
        before.route[0]!,
        { route_type: "wire", x: 5, y: 5, width: 0.8, layer: "top" },
        before.route[2]!,
      ],
    }),
  )
})

test("changing wire layers refreshes the trace", () => {
  const before = createTrace()
  expectTraceRefresh(
    before,
    createTrace({
      route: before.route.map((point) =>
        point.route_type === "wire" ? { ...point, layer: "bottom" } : point,
      ),
    }),
  )
})

test("reordering interior waypoints refreshes the trace", () => {
  const before = createTrace({
    route: [
      { route_type: "wire", x: 0, y: 0, width: 0.2, layer: "top" },
      { route_type: "wire", x: 3, y: 7, width: 0.2, layer: "top" },
      { route_type: "wire", x: 7, y: 3, width: 0.2, layer: "top" },
      { route_type: "wire", x: 10, y: 10, width: 0.2, layer: "top" },
    ],
  })
  expectTraceRefresh(
    before,
    createTrace({
      route: [
        before.route[0]!,
        before.route[2]!,
        before.route[1]!,
        before.route[3]!,
      ],
    }),
  )
})

test("changing the trace thickness mode refreshes the primitives", () => {
  const before = createTrace({ route_thickness_mode: "constant" })
  const after = createTrace({ route_thickness_mode: "interpolated" })
  expect(
    convertElementToPrimitives(before, [before])[0]?.pcb_drawing_type,
  ).toBe("line")
  expect(convertElementToPrimitives(after, [after])[0]?.pcb_drawing_type).toBe(
    "polygon",
  )
  expectTraceRefresh(before, after)
})

test("through-pad endpoint changes refresh the trace", () => {
  const before = createTrace({
    route: [
      { route_type: "wire", x: 0, y: 0, width: 0.2, layer: "top" },
      {
        route_type: "through_pad",
        start: { x: 4, y: 4 },
        end: { x: 6, y: 6 },
        width: 0.4,
        start_layer: "top",
        end_layer: "bottom",
      },
      { route_type: "wire", x: 10, y: 10, width: 0.2, layer: "bottom" },
    ],
  })
  expectTraceRefresh(
    before,
    createTrace({
      route: before.route.map((point) =>
        point.route_type === "through_pad"
          ? { ...point, start: { x: 3, y: 4 }, end: { x: 7, y: 6 } }
          : point,
      ),
    }),
  )
})

test("through-pad width and layer changes each refresh the trace", () => {
  const before = createTrace({
    route: [
      { route_type: "wire", x: 0, y: 0, width: 0.2, layer: "top" },
      {
        route_type: "through_pad",
        start: { x: 4, y: 4 },
        end: { x: 6, y: 6 },
        width: 0.4,
        start_layer: "top",
        end_layer: "bottom",
      },
      { route_type: "wire", x: 10, y: 10, width: 0.2, layer: "bottom" },
    ],
  })
  for (const change of [
    { width: 0.8 },
    { start_layer: "inner1" },
    { end_layer: "inner2" },
  ] satisfies Partial<PcbTraceRoutePointThroughPad>[]) {
    expectTraceRefresh(
      before,
      createTrace({
        route: before.route.map((point) =>
          point.route_type === "through_pad" ? { ...point, ...change } : point,
        ),
      }),
    )
  }
})

test("via dimensions and layer-span changes each refresh the trace", () => {
  const before = createTrace({
    route: [
      { route_type: "wire", x: 0, y: 0, width: 0.2, layer: "top" },
      {
        route_type: "via",
        x: 5,
        y: 5,
        from_layer: "top",
        to_layer: "bottom",
        outer_diameter: 0.6,
        hole_diameter: 0.3,
      },
      { route_type: "wire", x: 10, y: 10, width: 0.2, layer: "bottom" },
    ],
  })
  for (const change of [
    { outer_diameter: 0.8 },
    { hole_diameter: 0.4 },
    { from_layer: "inner1" },
    { to_layer: "inner2" },
  ] satisfies Partial<PcbTraceRoutePointVia>[]) {
    expectTraceRefresh(
      before,
      createTrace({
        route: before.route.map((point) =>
          point.route_type === "via" ? { ...point, ...change } : point,
        ),
      }),
    )
  }
})

test("corner rounding and highlight-color changes each refresh the trace", () => {
  const before = createTrace()
  expectTraceRefresh(before, createTrace({ should_round_corners: true }))
  expectTraceRefresh(before, createTrace({ highlight_color: "#ff00ff" }))
})

test("trace keys are independent of route-point object property order", () => {
  const before = createTrace()
  const after = createTrace({
    route: before.route.map((point) =>
      point.route_type === "wire"
        ? {
            layer: point.layer,
            width: point.width,
            y: point.y,
            x: point.x,
            route_type: point.route_type,
          }
        : point,
    ),
  })
  expect(calculateCircuitJsonKey([after])).toBe(
    calculateCircuitJsonKey([before]),
  )
})

test("an omitted thickness mode has the same key as the default constant mode", () => {
  expect(calculateCircuitJsonKey([createTrace()])).toBe(
    calculateCircuitJsonKey([
      createTrace({ route_thickness_mode: "constant" }),
    ]),
  )
})
