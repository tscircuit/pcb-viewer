import { expect, test } from "bun:test"
import { renderCopperCrossingBoard } from "./local-skew-overlay/copper-crossing-board"
import {
  MENU_CLICK_DELAY_MS,
  openOverlayPage,
  screenPointOf,
  screenshotPixelsAt,
} from "./local-skew-overlay/open-overlay-page"

test("local skew temporarily switches the default renderer to layered Canvas", async () => {
  const { page, errors, close } = await openOverlayPage({
    initialState: { hidden_layer_opacity: 0.5 },
    circuitJson: await renderCopperCrossingBoard(),
    renderer: "webgpu",
  })
  try {
    const webgpu = page.locator(
      '[data-pcb-renderer="webgpu"][data-x-ray-net-active="false"]',
    )
    const viewMenu = page.locator("[data-view-menu] > div > div").first()
    const toggle = page.getByText("Show Local Skew", { exact: true })
    const overlay = page.locator(".pcb-local-skew-overlay")
    const canvas = page.locator(".pcb-layer-top")
    await webgpu.waitFor()
    expect(await canvas.count()).toBe(0)

    await viewMenu.click({ delay: MENU_CLICK_DELAY_MS })
    await toggle.click()
    await viewMenu.click({ delay: MENU_CLICK_DELAY_MS })
    await webgpu.waitFor({ state: "detached" })
    await canvas.waitFor()
    const bottomOverlay = overlay.locator('svg[data-layer="bottom"]')
    await bottomOverlay.waitFor()
    const layers = await bottomOverlay.evaluate((svg) => {
      const bottom = document.querySelector(".pcb-layer-bottom")!
      const top = document.querySelector(".pcb-layer-top")!
      return {
        bottom: Number(getComputedStyle(bottom).zIndex),
        skew: Number(getComputedStyle(svg).zIndex),
        top: Number(getComputedStyle(top).zIndex),
        followsBottom: Boolean(
          bottom.compareDocumentPosition(svg) &
            Node.DOCUMENT_POSITION_FOLLOWING,
        ),
      }
    })
    expect(layers.skew).toBe(layers.bottom)
    expect(layers.followsBottom).toBe(true)
    expect(layers.skew).toBeLessThan(layers.top)

    const points = [
      await screenPointOf({ page, x: -4, y: 0.3 }),
      await screenPointOf({ page, x: 1, y: 0.3 }),
    ]
    const [coveredByTop, visibleBottom] = await screenshotPixelsAt({
      page,
      points,
    })
    expect(coveredByTop[0]).toBeGreaterThan(2 * coveredByTop[1])
    expect(Math.min(...visibleBottom)).toBeGreaterThan(90)

    await viewMenu.click({ delay: MENU_CLICK_DELAY_MS })
    await toggle.click()
    await overlay.waitFor({ state: "detached" })
    await webgpu.waitFor()
    expect(await canvas.count()).toBe(0)
    expect(
      await page.evaluate(() =>
        localStorage.getItem("pcb_viewer_rendering_engine"),
      ),
    ).toBeNull()
    expect(errors).toEqual([])
  } finally {
    await close()
  }
}, 60000)
