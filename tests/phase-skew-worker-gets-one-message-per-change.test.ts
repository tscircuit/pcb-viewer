import { expect, test } from "bun:test"
import { getDifferentialPairPhaseSkew } from "circuit-json-to-differential-pair-phase-skew"
import { getPhaseSkewStrokes } from "../src/lib/get-phase-skew-strokes"
import {
  openPhaseSkewPage,
  togglePhaseSkew,
} from "./fixtures/phase-skew/open-phase-skew-page"
import { renderUsbPairBoard } from "./fixtures/phase-skew/usb-pair-board"
import { renderViaPairBoard } from "./fixtures/phase-skew/via-pair-board"

test("with phase skew on, a new board reaches the WebGPU worker in one message with its strokes, and turning it off in one stroke update", async () => {
  const viaPair = renderViaPairBoard()
  const viaPairStrokeCount = getPhaseSkewStrokes({
    differentialPairPhaseSkews: getDifferentialPairPhaseSkew({
      circuitJson: viaPair,
    }),
  }).length
  const { page, errors, close } = await openPhaseSkewPage({
    circuitJson: renderUsbPairBoard(),
    renderer: "webgpu",
  })
  try {
    await togglePhaseSkew({ page })
    const sentBeforeNewBoard = await page.evaluate(
      () => window.phaseSkewWorkerMessages.length,
    )
    await page.evaluate(
      (circuitJson) => window.setPhaseSkewCircuitJson(circuitJson),
      viaPair,
    )
    await page.waitForFunction(
      (sentBefore) =>
        window.phaseSkewWorkerMessages
          .slice(sentBefore)
          .some((message) => message.type === "scene"),
      sentBeforeNewBoard,
    )
    const sentBeforeToggleOff = await page.evaluate(
      () => window.phaseSkewWorkerMessages.length,
    )
    await togglePhaseSkew({ page })
    await page.waitForFunction(
      (sentBefore) =>
        window.phaseSkewWorkerMessages
          .slice(sentBefore)
          .some((message) => message.type === "layer_strokes"),
      sentBeforeToggleOff,
    )
    const sentMessages = await page.evaluate(
      () => window.phaseSkewWorkerMessages,
    )
    // Camera and visibility updates go in their own messages and aren't counted.
    const newBoardMessages = sentMessages
      .slice(sentBeforeNewBoard, sentBeforeToggleOff)
      .filter(({ type }) => type !== "view")
    const toggleOffMessages = sentMessages
      .slice(sentBeforeToggleOff)
      .filter(({ type }) => type !== "view")
    expect(newBoardMessages).toEqual([
      { type: "scene", layerStrokeCount: viaPairStrokeCount },
    ])
    expect(toggleOffMessages).toEqual([
      { type: "layer_strokes", layerStrokeCount: undefined },
    ])
    expect(errors).toEqual([])
  } finally {
    await close()
  }
}, 60000)
