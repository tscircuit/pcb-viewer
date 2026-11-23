import { expect, test } from "bun:test"
import { getDifferentialPairPhaseSkew } from "circuit-json-to-differential-pair-phase-skew"
import { getPhaseSkewStrokes } from "../src/lib/get-phase-skew-strokes"
import {
  type RgbPixel,
  boardPointToScreen,
  openPhaseSkewPage,
  selectLayer,
  togglePhaseSkew,
  waitForScreenshotPixels,
} from "./fixtures/phase-skew/open-phase-skew-page"
import { renderUnnamedPairBoard } from "./fixtures/phase-skew/unnamed-pair-board"
import { renderUsbPairBoard } from "./fixtures/phase-skew/usb-pair-board"
import { renderViaPairBoard } from "./fixtures/phase-skew/via-pair-board"

const viaPair = renderViaPairBoard()
const viaPairStrokeCount = getPhaseSkewStrokes({
  differentialPairPhaseSkews: getDifferentialPairPhaseSkew({
    circuitJson: viaPair,
  }),
}).length

test("with phase skew on, a new board reaches the WebGPU worker in one message with its strokes, and turning it off in one stroke update", async () => {
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

test("the first WebGPU frame uses the last board and overlay choice made during startup", async () => {
  const usbPair = renderUsbPairBoard()
  const unnamedPair = renderUnnamedPairBoard([
    { x: 5, y: 0 },
    { x: 6, y: 1 },
    { x: 7, y: 0 },
  ])
  const { page, errors, close } = await openPhaseSkewPage({
    circuitJson: usbPair,
    renderer: "webgpu",
    holdWorkerReady: true,
  })
  try {
    const replaceBoard = (board: typeof usbPair) =>
      page.evaluate((board) => window.setPhaseSkewCircuitJson(board), board)
    await togglePhaseSkew({ page })
    await replaceBoard(unnamedPair)
    await togglePhaseSkew({ page })
    await replaceBoard(usbPair)
    await replaceBoard(unnamedPair)
    await togglePhaseSkew({ page })
    await replaceBoard(viaPair)
    await selectLayer({ page, layer: "bottom" })

    const submittedMessages = () =>
      page.evaluate(() =>
        window.phaseSkewWorkerMessages.filter(({ type }) => type !== "view"),
      )
    expect(await submittedMessages()).toEqual([
      { type: "init", layerStrokeCount: undefined },
    ])
    await page.evaluate(() => window.releasePhaseSkewWorker!())
    await page.locator('#root[data-rendered="true"]').waitFor({ timeout: 5000 })

    const points = [
      boardPointToScreen({ x: 7, y: 0.3 }),
      boardPointToScreen({ x: 7, y: -0.3 }),
    ]
    // Only the final board has bottom copper here, and both traces are skewed.
    const expected: RgbPixel[] = [
      [0, 0, 255],
      [255, 0, 0],
    ]
    expect(await waitForScreenshotPixels({ page, points, expected })).toEqual(
      expected,
    )
    expect(await submittedMessages()).toEqual([
      { type: "init", layerStrokeCount: undefined },
      { type: "scene", layerStrokeCount: viaPairStrokeCount },
    ])
    expect(errors).toEqual([])
  } finally {
    await close()
  }
}, 60000)
