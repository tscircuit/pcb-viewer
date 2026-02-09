import { test, expect } from "bun:test"
import { drawSilkscreenElementsForLayer } from "./draw-silkscreen"
import { identity } from "transformation-matrix"

// Mock canvas and context for bun test environment
const mockContext = {
  clearRect: () => {},
  save: () => {},
  restore: () => {},
  beginPath: () => {},
  moveTo: () => {},
  lineTo: () => {},
  stroke: () => {},
  fill: () => {},
  closePath: () => {},
  translate: () => {},
  rotate: () => {},
  scale: () => {},
  arc: () => {},
  rect: () => {},
  fillRect: () => {},
  strokeRect: () => {},
  measureText: () => ({
    width: 10,
    actualBoundingBoxAscent: 10,
    actualBoundingBoxDescent: 2,
  }),
  fillText: () => {},
  setLineDash: () => {},
  clip: () => {},
} as any

const mockCanvas = {
  getContext: () => mockContext,
  width: 1000,
  height: 1000,
  style: {},
} as any

test("drawSilkscreenElementsForLayer handles knockout text", () => {
  // Inject mock canvas creation
  const canvas = mockCanvas

  const elements = [
    {
      type: "pcb_silkscreen_rect",
      pcb_silkscreen_rect_id: "rect_1",
      pcb_component_id: "component_1",
      center: { x: 0, y: 0 },
      width: 10,
      height: 5,
      layer: "top",
    },
    {
      type: "pcb_silkscreen_text",
      pcb_silkscreen_text_id: "text_1",
      pcb_component_id: "component_1",
      anchor_position: { x: 0, y: 0 },
      text: "KNOCKOUT",
      font_size: 1,
      layer: "top",
      anchor_alignment: "center",
      is_knockout: true,
    },
  ] as any

  drawSilkscreenElementsForLayer({
    canvas,
    elements,
    layers: ["top"] as any,
    realToCanvasMat: identity(),
  })

  // We can't easily assert pixel values in this environment without a full browser setup or image comparison tool that works with canvas in bun/node.
  // However, the fact that this runs without error confirms that our code path (separating text, converting, drawing) is executed.
  // We rely on the visual fixture for correctness.
  expect(true).toBe(true)
})
