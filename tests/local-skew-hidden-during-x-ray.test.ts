import { expect, test } from "bun:test"
import {
  openOverlayPage,
  screenPointOf,
} from "./local-skew-overlay/open-overlay-page"

test("the overlay hides during X-ray and returns when X-ray ends", async () => {
  const { page, errors, close } = await openOverlayPage({
    initialState: {
      is_showing_local_skew: true,
    },
  })
  try {
    const overlay = page.locator(".pcb-local-skew-overlay")
    await overlay.waitFor()
    const point = await screenPointOf({ page, x: -6, y: 0.3 })
    await page.mouse.click(point.x, point.y)
    await page
      .locator('[role="menuitem"]')
      .filter({ hasText: "X-Ray" })
      .first()
      .click()
    await overlay.waitFor({ state: "detached" })

    await page.keyboard.press("Escape")
    await overlay.waitFor()
    expect(errors).toEqual([])
  } finally {
    await close()
  }
}, 60000)
