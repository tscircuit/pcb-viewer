import { expect, test } from "bun:test"
import {
  type RgbPixel,
  boardPointToScreen,
  openPhaseSkewPage,
  togglePhaseSkew,
  waitForScreenshotPixels,
} from "./fixtures/phase-skew/open-phase-skew-page"
import { renderUsbPairBoard } from "./fixtures/phase-skew/usb-pair-board"

test("WebGPU draws differential pair phase skew in its own layers", async () => {
  const { page, errors, close } = await openPhaseSkewPage({
    circuitJson: renderUsbPairBoard(),
    renderer: "webgpu",
  })
  try {
    await togglePhaseSkew({ page })
    // Blue on the positive trace and red on the negative one, as on Canvas.
    const expected: RgbPixel[] = [
      [0, 0, 255],
      [255, 0, 0],
    ]
    const pixels = await waitForScreenshotPixels({
      page,
      points: [
        boardPointToScreen({ x: 0, y: 0.3 }),
        boardPointToScreen({ x: 0, y: -0.3 }),
      ],
      expected,
    })
    expect(pixels).toEqual(expected)
    expect(
      await page.locator(".pcb-layer-top, [data-webgpu-error]").count(),
    ).toBe(0)
    expect(errors).toEqual([])
  } finally {
    await close()
  }
}, 60000)
