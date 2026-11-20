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

test("dark casing separates red and blue skew strokes while plain copper keeps its colour", async () => {
  const { page, errors, close } = await openOverlayPage({
    initialState: {
      is_showing_local_skew: true,
    },
    circuitJson: renderCopperContrastBoard(),
  })
  try {
    const overlay = page.locator(".pcb-local-skew-overlay")
    await overlay.waitFor()
    const redPoint = await screenPointOf({ page, x: 0, y: -0.3 })
    const bluePoint = await screenPointOf({ page, x: 0, y: 0.3 })
    const copperPoint = await screenPointOf({ page, x: 0, y: -2.5 })
    const boardPoint = await screenPointOf({ page, x: 0, y: 1 })
    const redEdge = { x: redPoint.x, y: redPoint.y + 2.5 }
    const blueEdge = { x: bluePoint.x, y: bluePoint.y - 2.5 }

    await page.mouse.move(OFF_BOARD_POINT.x, OFF_BOARD_POINT.y)
    const [red, redCasing, blue, blueCasing, copper, board] =
      await screenshotPixelsAt({
        page,
        points: [
          redPoint,
          redEdge,
          bluePoint,
          blueEdge,
          copperPoint,
          boardPoint,
        ],
      })
    expect(red[0]).toBeGreaterThan(220)
    expect(Math.max(red[1], red[2])).toBeLessThan(40)
    expect(blue[2]).toBeGreaterThan(220)
    expect(Math.max(blue[0], blue[1])).toBeLessThan(40)
    expect(contrastRatio(red, redCasing)).toBeGreaterThan(3)
    expect(contrastRatio(blue, blueCasing)).toBeGreaterThan(2.25)
    expect(relativeLuminance(redCasing)).toBeLessThan(0.005)
    expect(relativeLuminance(blueCasing)).toBeLessThan(relativeLuminance(board))
    expect(copper[0]).toBeGreaterThan(180)

    const viewMenu = page.locator("[data-view-menu] > div > div").first()
    await viewMenu.click({ delay: MENU_CLICK_DELAY_MS })
    await page.getByText("Show Local Skew", { exact: true }).click()
    await overlay.waitFor({ state: "detached" })
    await viewMenu.click({ delay: MENU_CLICK_DELAY_MS })
    await page.mouse.move(OFF_BOARD_POINT.x, OFF_BOARD_POINT.y)

    const [plainCopper, plainBoard] = await screenshotPixelsAt({
      page,
      points: [copperPoint, boardPoint],
    })
    expect(copper).toEqual(plainCopper)
    expect(board).toEqual(plainBoard)
    expect(errors).toEqual([])
  } finally {
    await close()
  }
}, 60000)
