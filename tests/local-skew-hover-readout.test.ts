import { expect, test } from "bun:test"
import {
  openOverlayPage,
  screenPointOf,
} from "./local-skew-overlay/open-overlay-page"

/** Width of the test viewer, in pixels. */
const VIEWER_WIDTH = 600

test("the hover readout follows the pointer, stays inside the viewer and is on top", async () => {
  const { page, errors, close } = await openOverlayPage({
    initialState: {
      is_showing_local_skew: true,
    },
  })
  try {
    await page.locator(".pcb-local-skew-overlay").waitFor()
    const readout = page.locator(".pcb-local-skew-readout")
    for (const x of [-6, 8]) {
      const point = await screenPointOf({ page, x, y: 0.3 })
      await page.mouse.move(point.x, point.y)
      await readout.waitFor()
      expect(await readout.textContent()).toBe(
        "USB: 1.236 mm longer than its partner (measured) · max 1.236 mm · limit 0.100 mm",
      )
      const box = (await readout.boundingBox())!
      // Inside the viewer, and above the pointer, clear of the trace tooltip.
      expect(box.x).toBeGreaterThanOrEqual(0)
      expect(box.x + box.width).toBeLessThanOrEqual(VIEWER_WIDTH)
      // Wide enough to read: it opens toward the roomier side, not squashed
      // against the edge.
      expect(box.width).toBeGreaterThan(VIEWER_WIDTH / 2)
      expect(box.y + box.height).toBeLessThanOrEqual(point.y)
      // Nothing covers it. The readout ignores the pointer, so let it be hit
      // for this check only.
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
    }
    expect(errors).toEqual([])
  } finally {
    await close()
  }
}, 60000)
