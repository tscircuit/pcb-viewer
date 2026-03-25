import { describe, expect, it } from "bun:test"
import type { PcbTrace } from "circuit-json"
import { filterTraceByLayers } from "../../src/lib/draw-pcb-trace"

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
})
