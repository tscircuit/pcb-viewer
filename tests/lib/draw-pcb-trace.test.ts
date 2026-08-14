import { describe, expect, it } from "bun:test"
import type { AnyCircuitElement, PcbTrace } from "circuit-json"
import {
  filterTraceByLayers,
  getHighlightedTraceElementIds,
  getTraceClipContextElements,
  showTraceSegmentsInsideHiddenCopperPours,
} from "../../src/lib/draw-pcb-trace"

describe("drawPcbTrace layer filtering", () => {
  it("keeps via separators so cross-layer runs do not get stitched together", () => {
    const trace: PcbTrace = {
      type: "pcb_trace",
      pcb_trace_id: "trace1",
      route: [
        { route_type: "wire", x: 0, y: 0, width: 0.15, layer: "top" },
        { route_type: "wire", x: 1, y: 0, width: 0.15, layer: "top" },
        {
          route_type: "via",
          x: 1,
          y: 0,
          from_layer: "top",
          to_layer: "inner1",
          via_diameter: 0.3,
        },
        { route_type: "wire", x: 2, y: 0, width: 0.15, layer: "inner1" },
        { route_type: "wire", x: 3, y: 0, width: 0.15, layer: "inner1" },
        {
          route_type: "via",
          x: 3,
          y: 0,
          from_layer: "inner1",
          to_layer: "top",
          via_diameter: 0.3,
        },
        { route_type: "wire", x: 3, y: 1, width: 0.15, layer: "top" },
        { route_type: "wire", x: 4, y: 1, width: 0.15, layer: "top" },
      ],
    } as PcbTrace

    const filtered = filterTraceByLayers(trace, new Set(["top"]))

    expect(filtered).toBeDefined()
    expect(filtered?.route.map((segment) => segment.route_type)).toEqual([
      "wire",
      "wire",
      "via",
      "via",
      "wire",
      "wire",
    ])
  })

  it("drops traces that do not contain at least two wire points on the target layer", () => {
    const trace: PcbTrace = {
      type: "pcb_trace",
      pcb_trace_id: "trace2",
      route: [
        { route_type: "wire", x: 0, y: 0, width: 0.15, layer: "top" },
        {
          route_type: "via",
          x: 0,
          y: 0,
          from_layer: "top",
          to_layer: "inner1",
          via_diameter: 0.3,
        },
        { route_type: "wire", x: 1, y: 0, width: 0.15, layer: "inner1" },
      ],
    } as PcbTrace

    expect(filterTraceByLayers(trace, new Set(["top"]))).toBeNull()
  })

  it("shows trace segments marked inside a copper pour when pours are hidden", () => {
    const trace: PcbTrace = {
      type: "pcb_trace",
      pcb_trace_id: "trace_inside_hidden_pour",
      route: [
        {
          route_type: "wire",
          x: 0,
          y: 0,
          width: 0.15,
          layer: "top",
          copper_pour_id: "pcb_copper_pour_0",
          is_inside_copper_pour: true,
        },
        {
          route_type: "wire",
          x: 1,
          y: 0,
          width: 0.15,
          layer: "top",
          copper_pour_id: "pcb_copper_pour_0",
          is_inside_copper_pour: true,
        },
      ],
    }

    const visibleTrace = showTraceSegmentsInsideHiddenCopperPours(trace)

    for (const routePoint of visibleTrace.route) {
      if (routePoint.route_type !== "wire") {
        throw new Error("Expected a wire route point")
      }
      expect(routePoint.is_inside_copper_pour).toBe(false)
    }
    expect(trace.route[0]).toHaveProperty("is_inside_copper_pour", true)
    expect(trace.route[1]).toHaveProperty("is_inside_copper_pour", true)
  })

  it("disables geometric pour clipping when copper pours are hidden", () => {
    const elements = [
      {
        type: "pcb_copper_pour",
        pcb_copper_pour_id: "pcb_copper_pour_0",
      },
    ] as AnyCircuitElement[]

    expect(getTraceClipContextElements(elements, true)).toBe(elements)
    expect(getTraceClipContextElements(elements, false)).toEqual([])
  })

  it("highlights a hovered trace on every rendered copper layer", () => {
    const trace: PcbTrace = {
      type: "pcb_trace",
      pcb_trace_id: "trace1",
      route: [],
    }
    const highlightedPrimitive = {
      _pcb_drawing_object_id: "line_0",
      _element: trace,
      pcb_drawing_type: "line",
      x1: 0,
      y1: 0,
      x2: 1,
      y2: 0,
      width: 0.15,
      layer: "top",
      is_mouse_over: true,
    } as const

    expect(
      getHighlightedTraceElementIds({
        primitives: [highlightedPrimitive],
      }),
    ).toEqual(new Set(["trace1"]))
  })
})
