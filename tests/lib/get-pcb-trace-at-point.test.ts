import { describe, expect, it } from "bun:test"
import type { PcbTrace } from "circuit-json"
import { getPcbTraceAtPoint } from "../../src/lib/get-pcb-trace-at-point"
import type { Line, Primitive } from "../../src/lib/types"

const transform = { a: 40, b: 0, c: 0, d: -40, e: 120, f: 80 }
const createTrace = (pcbTraceId: string): PcbTrace => ({
  type: "pcb_trace",
  pcb_trace_id: pcbTraceId,
  source_trace_id: "shared_signal",
  route: [
    { route_type: "wire", x: -1, y: 0, width: 0.15, layer: "top" },
    { route_type: "wire", x: 0, y: 0, width: 0.15, layer: "top" },
    { route_type: "via", x: 0, y: 0, from_layer: "top", to_layer: "bottom" },
    { route_type: "wire", x: 1, y: 0, width: 0.15, layer: "bottom" },
  ],
})
const createLine = (trace: PcbTrace, layer = "top", y = 0): Line => ({
  _pcb_drawing_object_id: `${trace.pcb_trace_id}-${layer}`,
  _element: trace,
  pcb_drawing_type: "line",
  x1: -1,
  y1: y,
  x2: 1,
  y2: y,
  width: 0.15,
  layer,
})

describe("picking a return-current context trace", () => {
  it("chooses the closest routed segment instead of the first trace on its net", () => {
    const farther = createTrace("farther")
    const closest = createTrace("closest")
    expect(
      getPcbTraceAtPoint({
        primitives: [createLine(farther, "top", 0.07), createLine(closest)],
        point: { x: 0.4, y: 0.01 },
        transform,
        selectedLayer: "top",
      }),
    ).toBe(closest)
  })

  it("prefers the selected layer over an overlapping hidden trace", () => {
    const top = createTrace("top_trace")
    const bottom = createTrace("bottom_trace")
    const picked = getPcbTraceAtPoint({
      primitives: [createLine(top), createLine(bottom, "bottom", 0.01)],
      point: { x: 0.4, y: 0 },
      transform,
      selectedLayer: "bottom",
      includeHiddenTraces: true,
    })
    expect(picked).toBe(bottom)
    // The callback's trace ID must still identify the complete multilayer route.
    expect(picked?.route).toBe(bottom.route)
    expect(picked?.route[2]).toMatchObject({
      route_type: "via",
      from_layer: "top",
      to_layer: "bottom",
    })
  })

  it("does not select hidden traces unless X-Ray permits them", () => {
    const bottom = createTrace("bottom_trace")
    const options = {
      primitives: [createLine(bottom, "bottom")],
      point: { x: 0.4, y: 0 },
      transform,
      selectedLayer: "top" as const,
    }
    expect(getPcbTraceAtPoint(options)).toBeUndefined()
    expect(getPcbTraceAtPoint({ ...options, includeHiddenTraces: true })).toBe(
      bottom,
    )
  })

  it("ignores non-trace copper and blank board areas", () => {
    const trace = createTrace("signal")
    const pad: Primitive = {
      _pcb_drawing_object_id: "pad",
      _element: {
        type: "pcb_smtpad",
        pcb_smtpad_id: "pad",
        pcb_component_id: "component",
        shape: "rect",
        x: 0,
        y: 0,
        width: 1,
        height: 1,
        layer: "top",
      },
      pcb_drawing_type: "rect",
      x: 0,
      y: 0,
      w: 1,
      h: 1,
      layer: "top",
    }
    expect(
      getPcbTraceAtPoint({
        primitives: [pad],
        point: { x: 0, y: 0 },
        transform,
        selectedLayer: "top",
      }),
    ).toBeUndefined()
    expect(
      getPcbTraceAtPoint({
        primitives: [createLine(trace)],
        point: { x: 3, y: 3 },
        transform,
        selectedLayer: "top",
      }),
    ).toBeUndefined()
  })
})
