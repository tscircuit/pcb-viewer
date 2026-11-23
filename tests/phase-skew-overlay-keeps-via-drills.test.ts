import { expect, test } from "bun:test"
import {
  type RgbPixel,
  boardPointToScreen,
  openPhaseSkewPage,
  screenshotPixelsAt,
  togglePhaseSkew,
  waitForScreenshotPixels,
} from "./fixtures/phase-skew/open-phase-skew-page"
import {
  VIA_X_MM,
  renderViaPairBoard,
} from "./fixtures/phase-skew/via-pair-board"

/** KiCad's blue, which the positive trace takes after its detour. */
const POSITIVE_PEAK_PIXEL: RgbPixel = [0, 0, 255]

test("phase skew paints up to a via but leaves its drill showing, in both renderers", async () => {
  const circuitJson = renderViaPairBoard()
  const viaCentre = boardPointToScreen({ x: VIA_X_MM, y: 0.3 })
  const besideVia = boardPointToScreen({ x: VIA_X_MM - 0.5, y: 0.3 })
  for (const renderer of ["canvas", "webgpu"] as const) {
    const { page, errors, close } = await openPhaseSkewPage({
      circuitJson,
      renderer,
    })
    try {
      const [drillPixel] = await screenshotPixelsAt({
        page,
        points: [viaCentre],
      })
      await togglePhaseSkew({ page })
      const expected: RgbPixel[] = [drillPixel, POSITIVE_PEAK_PIXEL]
      const pixels = await waitForScreenshotPixels({
        page,
        points: [viaCentre, besideVia],
        expected,
      })
      expect({ renderer, pixels }).toEqual({ renderer, pixels: expected })
      expect(errors).toEqual([])
    } finally {
      await close()
    }
  }
}, 60000)
