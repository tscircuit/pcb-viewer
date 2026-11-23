import { expect, test } from "bun:test"
import {
  type RgbPixel,
  boardPointToScreen,
  exitXRay,
  openPhaseSkewPage,
  screenshotPixelsAt,
  togglePhaseSkew,
  waitForScreenshotPixels,
  xRayNetAt,
} from "./fixtures/phase-skew/open-phase-skew-page"
import { renderUsbPairBoard } from "./fixtures/phase-skew/usb-pair-board"

/** KiCad's blue, which the positive trace takes between the detours. */
const POSITIVE_PEAK_PIXEL: RgbPixel = [0, 0, 255]

test("X-ray hides phase skew on the other copper and leaving X-ray shows it again, in both renderers", async () => {
  const circuitJson = renderUsbPairBoard()
  const positiveTrace = boardPointToScreen({ x: 0, y: 0.3 })
  const negativeTrace = boardPointToScreen({ x: 0, y: -0.3 })
  for (const renderer of ["canvas", "webgpu"] as const) {
    const { page, errors, close } = await openPhaseSkewPage({
      circuitJson,
      renderer,
    })
    try {
      // The positive trace's dimmed copper while X-ray shows only USB_DN.
      await xRayNetAt({ page, point: negativeTrace })
      const [dimmedCopperPixel] = await screenshotPixelsAt({
        page,
        points: [positiveTrace],
      })
      await exitXRay({ page })

      await togglePhaseSkew({ page })
      await waitForScreenshotPixels({
        page,
        points: [positiveTrace],
        expected: [POSITIVE_PEAK_PIXEL],
      })
      await xRayNetAt({ page, point: negativeTrace })
      const xRayPixels = await waitForScreenshotPixels({
        page,
        points: [positiveTrace],
        expected: [dimmedCopperPixel],
      })
      await exitXRay({ page })
      const restoredPixels = await waitForScreenshotPixels({
        page,
        points: [positiveTrace],
        expected: [POSITIVE_PEAK_PIXEL],
      })
      expect({ renderer, xRayPixels, restoredPixels }).toEqual({
        renderer,
        xRayPixels: [dimmedCopperPixel],
        restoredPixels: [POSITIVE_PEAK_PIXEL],
      })
      expect(errors).toEqual([])
    } finally {
      await close()
    }
  }
}, 60000)
