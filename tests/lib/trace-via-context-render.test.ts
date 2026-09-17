import { createCanvas } from "@napi-rs/canvas"
import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { identity } from "transformation-matrix"
import { drawPcbTraceElementsForLayer } from "../../src/lib/draw-pcb-trace"

test("route vias retain board sizing and standalone via precedence with hidden pours", () => {
  const elements: AnyCircuitElement[] = [
    {
      type: "pcb_board",
      pcb_board_id: "board",
      subcircuit_id: "board",
      center: { x: 50, y: 50 },
      width: 100,
      height: 100,
      num_layers: 2,
      thickness: 1.6,
      material: "fr4",
      min_via_pad_diameter: 20,
      min_via_hole_diameter: 10,
    },
    {
      type: "pcb_trace",
      pcb_trace_id: "trace",
      subcircuit_id: "board",
      route: [
        { route_type: "wire", x: 10, y: 50, width: 2, layer: "top" },
        { route_type: "wire", x: 50, y: 50, width: 2, layer: "top" },
        {
          route_type: "via",
          x: 50,
          y: 50,
          from_layer: "top",
          to_layer: "bottom",
        },
      ],
    },
  ]
  const canvas = createCanvas(100, 100)
  const ctx = canvas.getContext("2d")

  drawPcbTraceElementsForLayer({
    canvas: canvas as unknown as HTMLCanvasElement,
    elements,
    layers: ["bottom_copper"],
    realToCanvasMat: identity(),
    showCopperPours: false,
  })
  expect([...ctx.getImageData(58, 50, 1, 1).data]).toEqual([77, 127, 196, 255])

  ctx.clearRect(0, 0, 100, 100)
  drawPcbTraceElementsForLayer({
    canvas: canvas as unknown as HTMLCanvasElement,
    elements: [
      ...elements,
      {
        type: "pcb_via",
        pcb_via_id: "standalone",
        subcircuit_id: "board",
        x: 50,
        y: 50,
        layers: ["top", "bottom"],
        outer_diameter: 20,
        hole_diameter: 10,
        tented_on_bottom: false,
      },
    ],
    layers: ["bottom_copper"],
    realToCanvasMat: identity(),
    showCopperPours: false,
  })
  expect([...ctx.getImageData(58, 50, 1, 1).data]).toEqual([0, 0, 0, 0])
})
