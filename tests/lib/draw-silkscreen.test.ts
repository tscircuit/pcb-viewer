import { describe, expect, it, spyOn } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { CircuitToCanvasDrawer } from "circuit-to-canvas"
import { identity } from "transformation-matrix"
import {
  drawSilkscreenElementsForLayer,
  getSilkscreenElementsForLayer,
} from "../../src/lib/draw-silkscreen"

const elements: AnyCircuitElement[] = [
  {
    type: "pcb_silkscreen_pill",
    pcb_silkscreen_pill_id: "top_pill",
    pcb_component_id: "comp_1",
    center: { x: 0, y: 0 },
    width: 2,
    height: 1,
    layer: "top",
  },
  {
    type: "pcb_silkscreen_oval",
    pcb_silkscreen_oval_id: "bottom_oval",
    pcb_component_id: "comp_1",
    center: { x: 3, y: 0 },
    radius_x: 1,
    radius_y: 0.5,
    layer: "bottom",
  },
  {
    type: "pcb_silkscreen_rect",
    pcb_silkscreen_rect_id: "top_rect",
    pcb_component_id: "comp_1",
    center: { x: -3, y: 0 },
    width: 1,
    height: 1,
    stroke_width: 0.1,
    layer: "top",
  },
]

const createMockCanvas = () => {
  const ops: string[] = []
  const ctx = {
    canvas: { width: 100, height: 100 },
    save: () => {},
    restore: () => {},
    translate: () => {},
    rotate: () => {},
    beginPath: () => {},
    closePath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    arcTo: () => {},
    arc: () => {
      ops.push("arc")
    },
    ellipse: () => {
      ops.push("ellipse")
    },
    rect: () => {
      ops.push("rect")
    },
    stroke: () => {},
    fill: () => {},
    setLineDash: () => {},
  }
  return {
    ops,
    canvas: {
      width: 100,
      height: 100,
      getContext: () => ctx,
    } as unknown as HTMLCanvasElement,
  }
}

describe("drawSilkscreenElementsForLayer", () => {
  it("only returns silkscreen elements assigned to the requested board side", () => {
    expect(
      getSilkscreenElementsForLayer({
        elements,
        layers: ["top_silkscreen"],
      }).map((el) => el.type),
    ).toEqual(["pcb_silkscreen_pill", "pcb_silkscreen_rect"])

    expect(
      getSilkscreenElementsForLayer({
        elements,
        layers: ["bottom_silkscreen"],
      }).map((el) => el.type),
    ).toEqual(["pcb_silkscreen_oval"])

    expect(
      getSilkscreenElementsForLayer({
        elements,
        layers: [],
      }),
    ).toHaveLength(3)
  })

  it("does not leak top silkscreen pills or bottom silkscreen ovals onto the opposite layer", () => {
    const drawElementsSpy = spyOn(
      CircuitToCanvasDrawer.prototype,
      "drawElements",
    )

    try {
      const topTarget = createMockCanvas()
      drawSilkscreenElementsForLayer({
        canvas: topTarget.canvas,
        elements,
        layers: ["top_silkscreen"],
        realToCanvasMat: identity(),
      })
      expect(drawElementsSpy).toHaveBeenCalledTimes(1)
      expect(drawElementsSpy.mock.calls[0]?.[0]).toEqual([
        elements[0]!,
        elements[2]!,
      ])
      expect(topTarget.ops).toContain("arc")
      expect(topTarget.ops).toContain("rect")
      expect(topTarget.ops).not.toContain("ellipse")

      drawElementsSpy.mockClear()

      const bottomTarget = createMockCanvas()
      drawSilkscreenElementsForLayer({
        canvas: bottomTarget.canvas,
        elements,
        layers: ["bottom_silkscreen"],
        realToCanvasMat: identity(),
      })
      expect(drawElementsSpy).toHaveBeenCalledTimes(1)
      expect(drawElementsSpy.mock.calls[0]?.[0]).toEqual([elements[1]!])
      expect(bottomTarget.ops).toContain("ellipse")
      expect(bottomTarget.ops).not.toContain("arc")
      expect(bottomTarget.ops).not.toContain("rect")
    } finally {
      drawElementsSpy.mockRestore()
    }
  })
})
