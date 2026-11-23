import { expect, test } from "bun:test"
import {
  type RgbPixel,
  boardPointToScreen,
  openPhaseSkewPage,
  screenshotSettledPixelsAt,
  selectLayer,
  togglePhaseSkew,
  waitForScreenshotPixels,
} from "./fixtures/phase-skew/open-phase-skew-page"
import {
  VIA_X_MM,
  renderViaPairBoard,
} from "./fixtures/phase-skew/via-pair-board"

/** KiCad's blue, which the positive trace keeps after its detour. */
const POSITIVE_PEAK_PIXEL: RgbPixel = [0, 0, 255]

test("phase skew continues on the bottom layer past a via, leaves its drill showing and clears when turned off, in both renderers", async () => {
  const circuitJson = renderViaPairBoard()
  const viaCentre = boardPointToScreen({ x: VIA_X_MM, y: 0.3 })
  const afterVia = boardPointToScreen({ x: VIA_X_MM + 0.5, y: 0.3 })
  const points = [viaCentre, afterVia]
  for (const renderer of ["canvas", "webgpu"] as const) {
    const { page, errors, close } = await openPhaseSkewPage({
      circuitJson,
      renderer,
    })
    try {
      // The positive trace runs on the bottom layer after its via.
      await selectLayer({ page, layer: "bottom" })
      const baselinePixels = await screenshotSettledPixelsAt({ page, points })
      await togglePhaseSkew({ page })
      const expected: RgbPixel[] = [baselinePixels[0], POSITIVE_PEAK_PIXEL]
      const overlayPixels = await waitForScreenshotPixels({
        page,
        points,
        expected,
      })
      await togglePhaseSkew({ page })
      const clearedPixels = await waitForScreenshotPixels({
        page,
        points,
        expected: baselinePixels,
      })
      expect({ renderer, overlayPixels, clearedPixels }).toEqual({
        renderer,
        overlayPixels: expected,
        clearedPixels: baselinePixels,
      })
      expect(errors).toEqual([])
    } finally {
      await close()
    }
  }
}, 60000)
