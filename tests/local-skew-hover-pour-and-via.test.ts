import { expect, test } from "bun:test"
import { renderCopperCrossingBoard } from "./local-skew-overlay/copper-crossing-board"
import {
  MENU_CLICK_DELAY_MS,
  OFF_BOARD_POINT,
  openOverlayPage,
  screenPointOf,
  screenshotPixelsAt,
} from "./local-skew-overlay/open-overlay-page"

test("hover sees lower skew through a top trace clipped by a translucent pour", async () => {
  const { page, errors, close } = await openOverlayPage({
    initialState: {
      is_showing_local_skew: true,
      selected_layer: "top",
      hidden_layer_opacity: 0.5,
    },
    circuitJson: await renderCopperCrossingBoard(),
  })
  try {
    const via = await screenPointOf({ page, x: 4.5, y: 0.3 })
    const outsideVia = await screenPointOf({ page, x: 4.93, y: 0.3 })
    const pour = await screenPointOf({ page, x: 5.5, y: 0.3 })
    const trace = await screenPointOf({ page, x: -4, y: 0.3 })
    const readout = page.locator(".pcb-local-skew-readout")
    const pixels = await screenshotPixelsAt({
      page,
      points: [outsideVia, via, pour],
    })
    const [outside, viaCopper, pourCopper] = pixels
    expect(Math.min(...outside)).toBeGreaterThan(90)
    expect(viaCopper[0]).toBeGreaterThan(
      2 * Math.max(viaCopper[1], viaCopper[2]),
    )
    // The pour is visible, and the white skew underneath still lifts
    // the green and blue channels above the opaque via copper.
    expect(pourCopper[0]).toBeGreaterThan(pourCopper[1])
    expect(pourCopper[1]).toBeGreaterThan(viaCopper[1])

    await page.mouse.move(outsideVia.x, outsideVia.y)
    await readout.waitFor({ timeout: 2000 })
    expect(await readout.textContent()).toStartWith("PAIR: in step")
    await page.mouse.move(via.x, via.y)
    await readout.waitFor({ state: "detached", timeout: 2000 })
    await page.mouse.move(pour.x, pour.y)
    await readout.waitFor({ timeout: 2000 })
    expect(await readout.textContent()).toStartWith("PAIR: in step")

    // Hiding the pour restores the solid trace at the same point.
    const viewMenu = page.locator("[data-view-menu] > div > div").first()
    await viewMenu.click({ delay: MENU_CLICK_DELAY_MS })
    await page.getByText("Show Copper Pours", { exact: true }).click()
    await viewMenu.click({ delay: MENU_CLICK_DELAY_MS })
    await page.mouse.move(pour.x, pour.y)
    await readout.waitFor({ state: "detached", timeout: 2000 })
    await page.mouse.move(OFF_BOARD_POINT.x, OFF_BOARD_POINT.y)
    const [restoredCopper] = await screenshotPixelsAt({ page, points: [pour] })
    expect(restoredCopper[0]).toBeGreaterThan(2 * restoredCopper[1])

    // Inner1 becomes selected. Top copper is now translucent but is still
    // stacked above the bottom overlay.
    await page.mouse.move(OFF_BOARD_POINT.x, OFF_BOARD_POINT.y)
    await page.keyboard.press("2")
    await page.getByText("inner1", { exact: true }).waitFor()
    await page.mouse.move(trace.x, trace.y)
    await readout.waitFor({ timeout: 2000 })
    expect(await readout.textContent()).toStartWith("PAIR: in step")
    expect(errors).toEqual([])
  } finally {
    await close()
  }
}, 60000)
