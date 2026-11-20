import { expect, test } from "bun:test"
import { renderCopperContrastBoard } from "./local-skew-overlay/copper-contrast-board"
import {
  MENU_CLICK_DELAY_MS,
  OFF_BOARD_POINT,
  type RgbPixel,
  openOverlayPage,
  screenPointOf,
  screenshotPixelsAt,
} from "./local-skew-overlay/open-overlay-page"

/** WCAG 2.x relative luminance of an sRGB pixel. */
function relativeLuminance([red, green, blue]: RgbPixel): number {
  const linear = (channel: number) => {
    const s = channel / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * linear(red) + 0.7152 * linear(green) + 0.0722 * linear(blue)
}

/** WCAG contrast ratio between two sRGB pixels. */
function contrastRatio(first: RgbPixel, second: RgbPixel): number {
  const l1 = relativeLuminance(first)
  const l2 = relativeLuminance(second)
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)
}

test("copper canvases dim while Show Local Skew is on so red skew stands out from top copper", async () => {
  const { page, errors, close } = await openOverlayPage({
    initialState: {
      is_showing_local_skew: true,
    },
    circuitJson: renderCopperContrastBoard(),
  })
  try {
    const overlay = page.locator(".pcb-local-skew-overlay")
    await overlay.waitFor()
    const redOverlayPoint = await screenPointOf({ page, x: 0, y: -0.3 })
    const plainCopperPoint = await screenPointOf({ page, x: 0, y: -2.5 })

    await page.mouse.move(OFF_BOARD_POINT.x, OFF_BOARD_POINT.y)
    const [redPixel, dimmedCopperPixel] = await screenshotPixelsAt({
      page,
      points: [redOverlayPoint, plainCopperPoint],
    })
    // Full-red negative skew keeps KiCad's colour while top copper dims behind it.
    expect(redPixel[0]).toBeGreaterThan(220)
    expect(Math.max(redPixel[1], redPixel[2])).toBeLessThan(40)
    expect(dimmedCopperPixel[0]).toBeLessThan(100)
    // Pure red against undimmed top copper is 1.31:1; dimming clears WCAG 3:1.
    expect(contrastRatio(redPixel, dimmedCopperPixel)).toBeGreaterThan(3)

    // Turning Show Local Skew off restores full-brightness top copper.
    const viewMenu = page.locator("[data-view-menu] > div > div").first()
    await viewMenu.click({ delay: MENU_CLICK_DELAY_MS })
    await page.getByText("Show Local Skew", { exact: true }).click()
    await overlay.waitFor({ state: "detached" })
    await viewMenu.click({ delay: MENU_CLICK_DELAY_MS })
    await page.mouse.move(OFF_BOARD_POINT.x, OFF_BOARD_POINT.y)

    const [restoredCopperPixel] = await screenshotPixelsAt({
      page,
      points: [plainCopperPoint],
    })
    expect(restoredCopperPixel[0]).toBeGreaterThan(180)
    expect(errors).toEqual([])
  } finally {
    await close()
  }
}, 60000)
