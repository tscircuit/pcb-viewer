import { expect, test } from "bun:test"
import {
  openOverlayPage,
  screenPointOf,
} from "./local-skew-overlay/open-overlay-page"

test("hovering the overlay shows the local skew next to the pointer", async () => {
  const { page, errors, close } = await openOverlayPage({
    is_showing_local_skew: true,
  })
  try {
    await page.locator(".pcb-local-skew-overlay").waitFor()
    const point = await screenPointOf({ page, x: 0, y: 0.3 })
    await page.mouse.move(point.x, point.y)

    const readout = page.getByText("USB: 1.236 mm longer than its partner", {
      exact: false,
    })
    await readout.waitFor()
    expect(await readout.textContent()).toBe(
      "USB: 1.236 mm longer than its partner (measured), max 1.236 mm, limit 0.100 mm",
    )
    const box = await readout.boundingBox()
    expect(Math.abs((box?.x ?? 0) - point.x)).toBeLessThan(30)
    expect(Math.abs((box?.y ?? 0) - point.y)).toBeLessThan(30)
    expect(errors).toEqual([])
  } finally {
    await close()
  }
}, 60000)
