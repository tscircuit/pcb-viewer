import { expect, test } from "bun:test"
import {
  openOverlayPage,
  screenPointOf,
} from "./local-skew-overlay/open-overlay-page"

test("switching layers clears the readout when its trace is hidden", async () => {
  const { page, errors, close } = await openOverlayPage({
    initialState: {
      is_showing_local_skew: true,
      hidden_layer_opacity: 0,
    },
  })
  try {
    await page.locator(".pcb-local-skew-overlay").waitFor()
    const point = await screenPointOf({ page, x: -6, y: 0.3 })
    await page.mouse.move(point.x, point.y)
    const readout = page.locator(".pcb-local-skew-readout")
    await readout.waitFor()

    // "2" selects the bottom layer without moving the pointer.
    await page.keyboard.press("2")
    await readout.waitFor({ state: "detached" })
    expect(await page.locator(".pcb-local-skew-overlay line").count()).toBe(0)
    expect(errors).toEqual([])
  } finally {
    await close()
  }
}, 60000)
