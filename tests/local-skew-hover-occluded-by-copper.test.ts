import { expect, test } from "bun:test"
import { renderCopperCrossingBoard } from "./local-skew-overlay/copper-crossing-board"
import {
  OFF_BOARD_POINT,
  openOverlayPage,
  screenPointOf,
  screenshotPixelsAt,
} from "./local-skew-overlay/open-overlay-page"

test("hover follows the painted widths and rounded pad corners on higher Canvas layers", async () => {
  const { page, errors, close } = await openOverlayPage({
    initialState: {
      is_showing_local_skew: true,
      selected_layer: "top",
      hidden_layer_opacity: 0.5,
    },
    circuitJson: renderCopperCrossingBoard(),
  })
  try {
    await page.locator(".pcb-local-skew-overlay").waitFor()
    const coveredPoint = await screenPointOf({ page, x: -4, y: 0.3 })
    const uncoveredTrace = await screenPointOf({ page, x: -1, y: 0.3 })
    const uncoveredCorner = await screenPointOf({ page, x: 3.39, y: 0.3 })
    const coveredPad = await screenPointOf({ page, x: 2.5, y: 0.3 })

    await page.mouse.move(OFF_BOARD_POINT.x, OFF_BOARD_POINT.y)
    const pixels = await screenshotPixelsAt({
      page,
      points: [coveredPoint, uncoveredTrace, coveredPad, uncoveredCorner],
    })

    const readout = page.locator(".pcb-local-skew-readout")
    const expectedReadout =
      "PAIR: in step with its partner (measured) · max 0.000 mm"
    // The start width controls the painted trace. A rounded pad's empty
    // corner leaves the lower overlay visible even inside the pad's bounds.
    for (const [index, covered, point] of [
      [1, false, uncoveredTrace],
      [0, true, coveredPoint],
      [3, false, uncoveredCorner],
      [2, true, coveredPad],
    ] as const) {
      const [red, green, blue] = pixels[index]
      await page.mouse.move(point.x, point.y)
      if (covered) {
        expect(red).toBeGreaterThan(2 * Math.max(green, blue))
        await readout.waitFor({ state: "detached", timeout: 2000 })
      } else {
        expect(Math.min(red, green, blue)).toBeGreaterThan(90)
        await readout.waitFor({ timeout: 2000 })
        expect(await readout.textContent()).toBe(expectedReadout)
      }
    }

    // Selecting the bottom layer puts the bottom overlay in front of top copper.
    await page.mouse.move(OFF_BOARD_POINT.x, OFF_BOARD_POINT.y)
    await page.keyboard.press("2")
    await page
      .locator('.pcb-local-skew-overlay svg[data-layer="bottom"][opacity="1"]')
      .waitFor()
    const [[bottomFrontR, bottomFrontG, bottomFrontB]] =
      await screenshotPixelsAt({
        page,
        points: [coveredPoint],
      })
    expect(Math.min(bottomFrontR, bottomFrontG, bottomFrontB)).toBeGreaterThan(
      180,
    )
    await page.mouse.move(coveredPoint.x, coveredPoint.y)
    await readout.waitFor()
    expect(await readout.textContent()).toBe(expectedReadout)
    expect(errors).toEqual([])
  } finally {
    await close()
  }
}, 60000)
