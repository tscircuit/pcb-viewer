import { expect, test } from "bun:test"
import type { PcbTrace } from "circuit-json"
import { convertElementToPrimitives } from "../../src/lib/convert-element-to-primitive"

test("convertElementToPrimitives does not bridge wire segments across vias or layer changes", () => {
  const trace: PcbTrace = {
    type: "pcb_trace",
    pcb_trace_id: "trace_via_hop",
    route: [
      { route_type: "wire", x: -12, y: 0, width: 0.15, layer: "top" },
      { route_type: "wire", x: -6, y: 0, width: 0.15, layer: "top" },
      {
        route_type: "via",
        x: -6,
        y: 0,
        from_layer: "top",
        to_layer: "bottom",
      },
      { route_type: "wire", x: -6, y: 0, width: 0.15, layer: "bottom" },
      { route_type: "wire", x: 6, y: 0, width: 0.15, layer: "bottom" },
      {
        route_type: "via",
        x: 6,
        y: 0,
        from_layer: "bottom",
        to_layer: "top",
      },
      { route_type: "wire", x: 6, y: 0, width: 0.15, layer: "top" },
      { route_type: "wire", x: 12, y: 0, width: 0.15, layer: "top" },
    ],
  }

  const lines = convertElementToPrimitives(trace, [trace]).map((p) => {
    if (p.pcb_drawing_type !== "line") {
      throw new Error(`Expected line primitive, got ${p.pcb_drawing_type}`)
    }
    return { x1: p.x1, x2: p.x2, layer: p.layer }
  })
  expect(lines).toEqual([
    { x1: -12, x2: -6, layer: "top" },
    { x1: -6, x2: 6, layer: "bottom" },
    { x1: 6, x2: 12, layer: "top" },
  ])

  const bareViaTrace: PcbTrace = {
    type: "pcb_trace",
    pcb_trace_id: "trace_bare_vias",
    route: [
      { route_type: "wire", x: -12, y: 0, width: 0.15, layer: "top" },
      {
        route_type: "via",
        x: -6,
        y: 0,
        from_layer: "top",
        to_layer: "bottom",
      },
      {
        route_type: "via",
        x: 6,
        y: 0,
        from_layer: "bottom",
        to_layer: "top",
      },
      { route_type: "wire", x: 12, y: 0, width: 0.15, layer: "top" },
    ],
  }
  expect(convertElementToPrimitives(bareViaTrace, [bareViaTrace])).toEqual([])
})
