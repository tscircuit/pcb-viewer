import { describe, expect, spyOn, test } from "bun:test"
import "bun-match-svg"
import type { AnyCircuitElement } from "circuit-json"
import { CircuitToCanvasDrawer } from "circuit-to-canvas"
import { compose, identity, scale, translate } from "transformation-matrix"
import { drawPcbSmtPadElementsForLayer } from "../../src/lib/draw-pcb-smtpad"
import { drawPlatedHolePads } from "../../src/lib/draw-plated-hole"
import { drawPcbViaElementsForLayer } from "../../src/lib/draw-via"
import {
  createRecordingCanvas,
  createTestPlatedHole,
  createTestSmtPad,
  createTestVia,
  renderRecordedShapesToSvg,
  testBoard,
} from "./mock-recording-canvas"

describe("copper layer isolation for plated holes, vias, and SMT pads", () => {
  test("drawPlatedHolePads skips bottom-only plated holes on top canvas and scopes soldermask to bottom_copper", () => {
    const elements: AnyCircuitElement[] = [
      testBoard,
      createTestPlatedHole({ id: "ph_bottom", x: 0, layers: ["bottom"] }),
    ]

    const top = createRecordingCanvas()
    drawPlatedHolePads({
      canvas: top.canvas,
      elements,
      layers: ["top_copper"],
      realToCanvasMat: identity(),
      drawSoldermask: true,
    })
    expect(top.stats.drawCalls).toBe(0)

    const bottom = createRecordingCanvas()
    const drawSpy = spyOn(CircuitToCanvasDrawer.prototype, "drawElements")
    try {
      drawPlatedHolePads({
        canvas: bottom.canvas,
        elements,
        layers: ["bottom_copper"],
        realToCanvasMat: identity(),
        drawSoldermask: true,
      })

      expect(bottom.stats.drawCalls).toBeGreaterThan(0)
      expect(drawSpy).toHaveBeenCalledTimes(1)
      const options = drawSpy.mock.calls[0]?.[1]
      expect(options?.drawSoldermask).toBe(true)
      expect(options?.drawSoldermaskTop).toBe(false)
      expect(options?.drawSoldermaskBottom).toBe(true)
      expect(options?.clipContextElements).toBe(elements)
    } finally {
      drawSpy.mockRestore()
    }
  })

  test("drawPcbViaElementsForLayer skips blind vias on unspanned copper layers and keeps legacy vias", () => {
    const elements: AnyCircuitElement[] = [
      testBoard,
      createTestVia({
        id: "via_blind_top_inner1",
        x: 1,
        y: 1,
        layers: ["top", "inner1"],
      }),
    ]

    const bottom = createRecordingCanvas()
    drawPcbViaElementsForLayer({
      canvas: bottom.canvas,
      elements,
      layers: ["bottom_copper"],
      realToCanvasMat: identity(),
      drawSoldermask: true,
    })
    expect(bottom.stats.drawCalls).toBe(0)

    const legacyElements: AnyCircuitElement[] = [
      testBoard,
      createTestVia({ id: "via_legacy_omitted", x: 2, y: 2 }),
      createTestVia({ id: "via_legacy_empty", x: -2, y: -2, layers: [] }),
    ]
    const legacyBottom = createRecordingCanvas()
    drawPcbViaElementsForLayer({
      canvas: legacyBottom.canvas,
      elements: legacyElements,
      layers: ["bottom_copper"],
      realToCanvasMat: identity(),
      drawSoldermask: true,
    })
    expect(legacyBottom.stats.drawCalls).toBeGreaterThan(0)
    expect(legacyBottom.stats.shapes.length).toBeGreaterThanOrEqual(4)
  })

  test("drawPcbSmtPadElementsForLayer scopes soldermask to bottom_copper and disables it on inner layers", () => {
    const elements: AnyCircuitElement[] = [
      testBoard,
      createTestSmtPad({ id: "pad_bottom", x: 0, layer: "bottom" }),
      createTestSmtPad({ id: "pad_inner1", x: 3, layer: "inner1" }),
    ]

    const drawSpy = spyOn(CircuitToCanvasDrawer.prototype, "drawElements")
    try {
      const bottom = createRecordingCanvas()
      drawPcbSmtPadElementsForLayer({
        canvas: bottom.canvas,
        elements,
        layers: ["bottom_copper"],
        realToCanvasMat: identity(),
        drawSoldermask: true,
      })
      expect(drawSpy).toHaveBeenCalledTimes(1)
      expect(drawSpy.mock.calls[0]?.[1]).toMatchObject({
        layers: ["bottom_copper"],
        drawSoldermask: true,
        drawSoldermaskTop: false,
        drawSoldermaskBottom: true,
        clipContextElements: elements,
      })

      const inner = createRecordingCanvas()
      drawPcbSmtPadElementsForLayer({
        canvas: inner.canvas,
        elements,
        layers: ["inner1_copper"],
        realToCanvasMat: identity(),
        drawSoldermask: true,
      })
      expect(drawSpy).toHaveBeenCalledTimes(2)
      expect(drawSpy.mock.calls[1]?.[1]).toMatchObject({
        layers: ["inner1_copper"],
        drawSoldermask: false,
        drawSoldermaskTop: false,
        drawSoldermaskBottom: false,
        clipContextElements: elements,
      })
    } finally {
      drawSpy.mockRestore()
    }
  })

  test("isolates top_copper and bottom_copper rendering in visual snapshot", async () => {
    const elements: AnyCircuitElement[] = [
      testBoard,
      createTestPlatedHole({ id: "ph_bottom", x: -4, layers: ["bottom"] }),
      createTestVia({
        id: "via_blind_top_inner1",
        x: 0,
        y: 3,
        layers: ["top", "inner1"],
      }),
      createTestVia({ id: "via_legacy", x: 0, y: -3 }),
      createTestSmtPad({ id: "pad_bottom", x: 4, layer: "bottom" }),
    ]
    const realToCanvasMat = compose(translate(150, 120), scale(18, -18))

    const top = createRecordingCanvas()
    for (const drawFn of [
      drawPlatedHolePads,
      drawPcbSmtPadElementsForLayer,
      drawPcbViaElementsForLayer,
    ]) {
      drawFn({
        canvas: top.canvas,
        elements,
        layers: ["top_copper"],
        realToCanvasMat,
        drawSoldermask: false,
      })
    }

    const bottom = createRecordingCanvas()
    for (const drawFn of [
      drawPlatedHolePads,
      drawPcbSmtPadElementsForLayer,
      drawPcbViaElementsForLayer,
    ]) {
      drawFn({
        canvas: bottom.canvas,
        elements,
        layers: ["bottom_copper"],
        realToCanvasMat,
        drawSoldermask: false,
      })
    }

    expect(top.stats.shapes.some((shape) => Math.abs(shape.y - 66) < 1)).toBe(
      true,
    )
    expect(top.stats.shapes.some((shape) => Math.abs(shape.y - 174) < 1)).toBe(
      true,
    )
    expect(top.stats.shapes.some((shape) => Math.abs(shape.x - 78) < 1)).toBe(
      false,
    )
    expect(top.stats.shapes.some((shape) => Math.abs(shape.x - 222) < 20)).toBe(
      false,
    )

    expect(
      bottom.stats.shapes.some((shape) => Math.abs(shape.x - 78) < 1),
    ).toBe(true)
    expect(
      bottom.stats.shapes.some((shape) => Math.abs(shape.y - 174) < 1),
    ).toBe(true)
    expect(
      bottom.stats.shapes.some((shape) => Math.abs(shape.x - 222) < 20),
    ).toBe(true)
    expect(
      bottom.stats.shapes.some((shape) => Math.abs(shape.y - 66) < 1),
    ).toBe(false)

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="280" viewBox="0 0 640 280">
  <title>Top vs bottom copper layer isolation for plated holes, vias, and SMT pads</title>
  <rect width="640" height="280" fill="#0f1117"/>
  <g transform="translate(10 30)">
    <rect width="300" height="240" rx="6" fill="#181b24" stroke="#2d3343"/>
    <text x="12" y="20" fill="#e6edf3" font-family="sans-serif" font-size="12">top_copper (blind + legacy via only)</text>
    ${renderRecordedShapesToSvg(top.stats.shapes)}
  </g>
  <g transform="translate(330 30)">
    <rect width="300" height="240" rx="6" fill="#181b24" stroke="#2d3343"/>
    <text x="12" y="20" fill="#e6edf3" font-family="sans-serif" font-size="12">bottom_copper (bottom hole + pad + legacy via)</text>
    ${renderRecordedShapesToSvg(bottom.stats.shapes)}
  </g>
</svg>`

    await expect(svg).toMatchSvgSnapshot(
      import.meta.path,
      "draw-copper-layer-isolation",
    )
  })
})
