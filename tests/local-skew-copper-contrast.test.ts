import { expect, test } from "bun:test"
import {
  NEIGHBOUR_Y,
  renderCopperContrastBoard,
} from "./local-skew-overlay/copper-contrast-board"
import {
  MENU_CLICK_DELAY_MS,
  openOverlayPage,
  screenPointOf,
  screenshotPixelsAt,
} from "./local-skew-overlay/open-overlay-page"

test("the dark casing leaves nearby 0.15 mm copper visible at fit zoom", async () => {
  const { page, errors, close } = await openOverlayPage({
    initialState: { is_showing_local_skew: true },
    circuitJson: renderCopperContrastBoard(),
  })
  try {
    const overlay = page.locator(".pcb-local-skew-overlay")
    await overlay.waitFor()
    const skewPoint = await screenPointOf({ page, x: 0, y: -0.3 })
    const neighbour = await screenPointOf({ page, x: 0, y: NEIGHBOUR_Y })
    const points = [skewPoint, neighbour]
    const [skew, copper] = await screenshotPixelsAt({ page, points })
    expect(skew[0]).toBeGreaterThan(220)
    expect(Math.max(skew[1], skew[2])).toBeLessThan(40)

    const viewMenu = page.locator("[data-view-menu] > div > div").first()
    await viewMenu.click({ delay: MENU_CLICK_DELAY_MS })
    await page.getByText("Show Local Skew", { exact: true }).click()
    await overlay.waitFor({ state: "detached" })
    await viewMenu.click({ delay: MENU_CLICK_DELAY_MS })
    const [, plainCopper] = await screenshotPixelsAt({ page, points })
    expect(plainCopper[0]).toBeGreaterThan(100)
    expect(copper).toEqual(plainCopper)
    expect(errors).toEqual([])
  } finally {
    await close()
  }
}, 60000)
