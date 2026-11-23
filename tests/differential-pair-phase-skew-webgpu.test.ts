import { expect, test } from "bun:test"
import {
  type RgbPixel,
  boardPointToScreen,
  openPhaseSkewPage,
  screenshotSettledPixelsAt,
  togglePhaseSkew,
  waitForScreenshotPixels,
} from "./fixtures/phase-skew/open-phase-skew-page"
import { renderUsbPairBoard } from "./fixtures/phase-skew/usb-pair-board"

test("WebGPU draws differential pair phase skew in its own layers and clears it when turned off", async () => {
  const { page, errors, close } = await openPhaseSkewPage({
    circuitJson: renderUsbPairBoard(),
    renderer: "webgpu",
  })
  try {
    const points = [
      boardPointToScreen({ x: 0, y: 0.3 }),
      boardPointToScreen({ x: 0, y: -0.3 }),
    ]
    const baselinePixels = await screenshotSettledPixelsAt({ page, points })
    await togglePhaseSkew({ page })
    // Blue on the positive trace and red on the negative one, as on Canvas.
    const expected: RgbPixel[] = [
      [0, 0, 255],
      [255, 0, 0],
    ]
    const pixels = await waitForScreenshotPixels({ page, points, expected })
    expect(pixels).toEqual(expected)
    expect(
      await page.locator(".pcb-layer-top, [data-webgpu-error]").count(),
    ).toBe(0)
    // Turning it off sends the worker an empty stroke list.
    await togglePhaseSkew({ page })
    const clearedPixels = await waitForScreenshotPixels({
      page,
      points,
      expected: baselinePixels,
    })
    expect(clearedPixels).toEqual(baselinePixels)
    expect(errors).toEqual([])
  } finally {
    await close()
  }
}, 60000)
