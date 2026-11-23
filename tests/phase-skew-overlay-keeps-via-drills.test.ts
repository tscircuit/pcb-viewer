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

test("phase skew continues on the bottom layer past a via, leaves its drill showing and clears when turned off", async () => {
  const viaCentre = boardPointToScreen({ x: VIA_X_MM, y: 0.3 })
  const afterVia = boardPointToScreen({ x: VIA_X_MM + 0.5, y: 0.3 })
  const points = [viaCentre, afterVia]
  for (const { vias, circuitJson, renderers } of VIA_BOARDS) {
    for (const renderer of renderers) {
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
        expect({ vias, renderer, overlayPixels, clearedPixels }).toEqual({
          vias,
          renderer,
          overlayPixels: expected,
          clearedPixels: baselinePixels,
        })
        expect(errors).toEqual([])
      } finally {
        await close()
      }
    }
  }
}, 120000)
