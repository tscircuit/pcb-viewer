import { expect, test } from "bun:test"
import type { LayerStroke } from "@tscircuit/circuit-json-webgpu"
import type { AnyCircuitElement } from "circuit-json"
import { openPhaseSkewWorkerPage } from "./fixtures/phase-skew/open-phase-skew-page"
import { renderUsbPairBoard } from "./fixtures/phase-skew/usb-pair-board"
import { renderViaPairBoard } from "./fixtures/phase-skew/via-pair-board"

/** A phase skew stroke; the controlled drawer only counts them. */
const STROKE: LayerStroke = {
  layer: "top",
  start: { x: -1, y: 0.3 },
  end: { x: 0, y: 0.3 },
  widthMm: 0.165,
  color: [0, 0, 1, 1],
}

test("the WebGPU worker draws a new board with its own phase skew strokes, even in a frame before a stroke update", async () => {
  const usbPair = renderUsbPairBoard() as AnyCircuitElement[]
  const viaPair = renderViaPairBoard() as AnyCircuitElement[]
  const { page, errors, close } = await openPhaseSkewWorkerPage()
  try {
    const { drawnFrames, workerErrors } = await page.evaluate(
      async ({ usbPair, viaPair, stroke }) => {
        const { send, flushFrame, stats } = window.phaseSkewWorkerTest
        send({
          type: "scene",
          elements: usbPair,
          sceneGeneration: 1,
          layerStrokes: [stroke],
        })
        send({
          type: "view",
          width: 600,
          height: 400,
          transform: { a: 15, b: 0, c: 0, d: -15, e: 300, f: 200 },
          options: { selectedLayer: "top" },
        })
        await flushFrame()
        // A new board and its strokes, with a frame before any stroke update.
        send({
          type: "scene",
          elements: viaPair,
          sceneGeneration: 2,
          layerStrokes: [stroke, stroke, stroke],
        })
        await flushFrame()
        // A colour change after a scene replaces the strokes it carried.
        send({
          type: "scene",
          elements: usbPair,
          sceneGeneration: 3,
          layerStrokes: [stroke],
        })
        send({ type: "layer_strokes", layerStrokes: [stroke, stroke] })
        await flushFrame()
        return { drawnFrames: stats.drawnFrames, workerErrors: stats.errors }
      },
      { usbPair, viaPair, stroke: STROKE },
    )
    expect(drawnFrames).toEqual([
      { elementCount: usbPair.length, layerStrokeCount: 1 },
      { elementCount: viaPair.length, layerStrokeCount: 3 },
      { elementCount: usbPair.length, layerStrokeCount: 2 },
    ])
    expect(workerErrors).toEqual([])
    expect(errors).toEqual([])
  } finally {
    await close()
  }
}, 60000)
