import { createCanvas } from "@napi-rs/canvas"
import { expect, test } from "bun:test"
import type { AnyCircuitElement, PcbVia } from "circuit-json"
import { identity } from "transformation-matrix"
import { drawSoldermaskElementsForLayer } from "../../src/lib/draw-soldermask"
import { drawPcbViaElementsForLayer } from "../../src/lib/draw-via"
import type { Primitive } from "../../src/lib/types"

test("filtered and hovered vias inherit the board defaults for the rendered face", () => {
  const via: PcbVia = {
    type: "pcb_via",
    pcb_via_id: "via",
    subcircuit_id: "board",
    x: 30,
    y: 50,
    layers: ["top", "bottom"],
    outer_diameter: 20,
    hole_diameter: 10,
  }
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
      default_via_tented_on_top: true,
      default_via_tented_on_bottom: false,
    },
    via,
    { ...via, pcb_via_id: "exposed", x: 70, tented_on_top: false },
  ]
  const canvas = createCanvas(100, 100)
  const ctx = canvas.getContext("2d")
  const options = {
    canvas: canvas as unknown as HTMLCanvasElement,
    elements,
    realToCanvasMat: identity(),
    drawSoldermask: true,
  }

  drawPcbViaElementsForLayer({ ...options, layers: ["top_copper"] })
  expect([...ctx.getImageData(30, 50, 1, 1).data]).toEqual([52, 135, 73, 255])
  expect([...ctx.getImageData(70, 50, 1, 1).data]).toEqual([255, 38, 226, 255])

  ctx.clearRect(0, 0, 100, 100)
  drawPcbViaElementsForLayer({ ...options, layers: ["bottom_copper"] })
  expect([...ctx.getImageData(30, 50, 1, 1).data]).toEqual([255, 38, 226, 255])

  const primitives: Primitive[] = [
    {
      pcb_drawing_type: "circle",
      _pcb_drawing_object_id: "via_hover",
      _element: via,
      x: via.x,
      y: via.y,
      r: via.outer_diameter / 2,
      layer: "top",
      is_mouse_over: true,
    },
  ]
  ctx.clearRect(0, 0, 100, 100)
  drawPcbViaElementsForLayer({ ...options, layers: ["top_copper"], primitives })
  expect([...ctx.getImageData(30, 50, 1, 1).data]).toEqual([52, 135, 73, 255])

  ctx.clearRect(0, 0, 100, 100)
  drawSoldermaskElementsForLayer({
    ...options,
    layers: ["top_soldermask"],
    drawSoldermaskTop: true,
    drawSoldermaskBottom: false,
    primitives,
  })
  expect([...ctx.getImageData(30, 50, 1, 1).data]).toEqual([52, 135, 73, 255])
})
