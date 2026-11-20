import { expect, test } from "bun:test"
import { renderCopperCrossingBoard } from "./local-skew-overlay/copper-crossing-board"
import {
  OFF_BOARD_POINT,
  openOverlayPage,
  screenPointOf,
  screenshotPixelsAt,
} from "./local-skew-overlay/open-overlay-page"

test("hover ignores a bottom overlay segment covered by higher-layer copper", async () => {
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
    const coveredPoint = await screenPointOf({ page, x: 0, y: 0.3 })
    const uncoveredDpPoint = await screenPointOf({ page, x: -4, y: 0.3 })
    const uncoveredDnPoint = await screenPointOf({ page, x: 0, y: -0.3 })

    // Move pointer away so tooltips don't obscure the sampled pixels.
    await page.mouse.move(OFF_BOARD_POINT.x, OFF_BOARD_POINT.y)
    const [[coveredR, coveredG, coveredB], [dpR, dpG, dpB]] =
      await screenshotPixelsAt({
        page,
        points: [coveredPoint, uncoveredDpPoint],
      })
    // At (0, 0.3), opaque top copper covers the bottom white overlay.
    expect(coveredR).toBeGreaterThan(2 * Math.max(coveredG, coveredB))
    expect(Math.max(coveredG, coveredB)).toBeLessThan(80)
    // At (-4, 0.3), the 50%-opaque white bottom overlay is visible.
    expect(Math.min(dpR, dpG, dpB)).toBeGreaterThan(90)

    const readout = page.locator(".pcb-local-skew-readout")
    // Uncovered bottom DP reports its skew.
    await page.mouse.move(uncoveredDpPoint.x, uncoveredDpPoint.y)
    await readout.waitFor()
    expect(await readout.textContent()).toBe(
      "PAIR: in step with its partner (measured) · max 0.000 mm",
    )

    // Uncovered bottom DN (0.6 mm from the 0.5 mm top trace) still reports skew.
    await page.mouse.move(uncoveredDnPoint.x, uncoveredDnPoint.y)
    await readout.waitFor()
    expect(await readout.textContent()).toBe(
      "PAIR: in step with its partner (measured) · max 0.000 mm",
    )

    // Moving onto the covering top copper trace hides the skew readout.
    await page.mouse.move(coveredPoint.x, coveredPoint.y)
    await readout.waitFor({ state: "detached", timeout: 2000 })
    expect(await readout.count()).toBe(0)

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
    expect(await readout.textContent()).toBe(
      "PAIR: in step with its partner (measured) · max 0.000 mm",
    )
    expect(errors).toEqual([])
  } finally {
    await close()
  }
}, 60000)
