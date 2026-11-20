import { expect, test } from "bun:test"
import {
  openOverlayPage,
  screenPointOf,
} from "./local-skew-overlay/open-overlay-page"

/** Where the trace is panned to, in pixels from the viewer's top: just below the toolbar. */
const PANNED_Y = 60

test("near the top edge the readout opens below the pointer, clear of the toolbar", async () => {
  const { page, errors, close } = await openOverlayPage({
    initialState: {
      is_showing_local_skew: true,
    },
  })
  try {
    await page.locator(".pcb-local-skew-overlay svg").waitFor()
    // Drag the board up so USB_DP sits just below the toolbar.
    const start = await screenPointOf({ page, x: -6, y: 0.3 })
    await page.mouse.move(start.x, start.y)
    await page.mouse.down()
    await page.mouse.move(start.x, PANNED_Y, { steps: 10 })
    await page.mouse.up()
    const point = await screenPointOf({ page, x: -6, y: 0.3 })
    expect(Math.abs(point.y - PANNED_Y)).toBeLessThan(2)
    await page.mouse.move(point.x + 1, point.y)

    const readout = page.locator(".pcb-local-skew-readout")
    await readout.waitFor()
    const box = (await readout.boundingBox())!
    expect(box.y).toBeGreaterThan(point.y)
    // Nothing, the toolbar included, covers it. The readout ignores the
    // pointer, so let it be hit for this check only.
    const onTop = await page.evaluate(
      ({ x, y }) => {
        const element = document.querySelector(
          ".pcb-local-skew-readout",
        ) as HTMLElement
        element.style.pointerEvents = "auto"
        const hit = document.elementFromPoint(x, y)
        element.style.pointerEvents = "none"
        return hit === element
      },
      { x: box.x + box.width / 2, y: box.y + box.height / 2 },
    )
    expect(onTop).toBe(true)
    expect(errors).toEqual([])
  } finally {
    await close()
  }
}, 60000)
