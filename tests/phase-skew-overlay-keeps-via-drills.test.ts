import { expect, test } from "bun:test"
import {
  type RgbPixel,
  boardPointToScreen,
  screenshotSettledPixelsAt,
  selectLayer,
  startPhaseSkewBrowser,
  togglePhaseSkew,
  waitForScreenshotPixels,
} from "./fixtures/phase-skew/open-phase-skew-page"
import {
  VIA_X_MM,
  renderRouteOnlyViaPairBoard,
  renderViaPairBoard,
} from "./fixtures/phase-skew/via-pair-board"

/** KiCad's blue, which the positive trace keeps after its detour. */
const POSITIVE_PEAK_PIXEL: RgbPixel = [0, 0, 255]

/**
 * The same vias stored as `pcb_via` records and only as route points.
 * circuit-json-webgpu draws no via for a route point alone, so that board
 * has no drill to keep there and is checked on Canvas only.
 */
const VIA_BOARDS = [
  {
    vias: "pcb_via records",
    circuitJson: renderViaPairBoard(),
    renderers: ["canvas", "webgpu"] as const,
  },
  {
    vias: "route points only",
    circuitJson: renderRouteOnlyViaPairBoard(),
    renderers: ["canvas"] as const,
  },
]

test.each(["canvas", "webgpu"] as const)(
  "%s keeps the via drill open, shows skew past it and restores copper when disabled",
  async (renderer) => {
    const viaCentre = boardPointToScreen({ x: VIA_X_MM, y: 0.3 })
    const afterVia = boardPointToScreen({ x: VIA_X_MM + 0.5, y: 0.3 })
    const points = [viaCentre, afterVia]
    const harness = await startPhaseSkewBrowser(renderer)
    try {
      for (const { vias, circuitJson, renderers } of VIA_BOARDS) {
        if (!renderers.some((candidate) => candidate === renderer)) continue
        const { page, errors, close } = await harness.open({ circuitJson })
        try {
          // The positive trace runs on the bottom layer after its via.
          await selectLayer({ page, layer: "bottom" })
          const baselinePixels = await screenshotSettledPixelsAt({
            page,
            points,
          })
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
          expect({ vias, overlayPixels, clearedPixels }).toEqual({
            vias,
            overlayPixels: expected,
            clearedPixels: baselinePixels,
          })
          expect(errors).toEqual([])
        } finally {
          await close()
        }
      }
    } finally {
      await harness.close()
    }
  },
  60000,
)
