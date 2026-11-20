import { expect, test } from "bun:test"
import "bun-match-svg"
import {
  MENU_CLICK_DELAY_MS,
  OFF_BOARD_POINT,
  openOverlayPage,
  screenPointOf,
  screenshotPixelsAt,
} from "./local-skew-overlay/open-overlay-page"

/** Minimum dominant channel on an opaque overlay stroke after anti-aliasing. */
const MIN_OVERLAY_CHANNEL = 180

test("Show Local Skew colours the out-of-phase stretch without remounting the board", async () => {
  const { page, errors, close } = await openOverlayPage({ initialState: {} })
  try {
    const viewMenu = page.locator("[data-view-menu] > div > div").first()
    await page.evaluate(() => {
      ;(
        document.querySelector(".pcb-layer-top") as HTMLElement
      ).dataset.marker = "before-toggle"
    })
    const overlay = page.locator(".pcb-local-skew-overlay")
    expect(await overlay.count()).toBe(0)

    await viewMenu.click({ delay: MENU_CLICK_DELAY_MS })
    await page.getByText("Show Local Skew", { exact: true }).click()
    await overlay.waitFor()
    await viewMenu.click({ delay: MENU_CLICK_DELAY_MS })
    await page.mouse.move(OFF_BOARD_POINT.x, OFF_BOARD_POINT.y)
    expect(
      await page.evaluate(() =>
        localStorage.getItem("pcb_viewer_is_showing_local_skew"),
      ),
    ).toBe("true")
    // The board canvases were not replaced when the overlay appeared.
    expect(
      await page.evaluate(
        () =>
          (document.querySelector(".pcb-layer-top") as HTMLElement).dataset
            .marker,
      ),
    ).toBe("before-toggle")
    // Like KiCad, known skew is opaque and full brightness, blending
    // linearly from white to blue or red with no darkening.
    const estimates = await page
      .locator(
        '.pcb-local-skew-overlay line:not([stroke="rgb(128, 128, 128)"])',
      )
      .evaluateAll((lines) =>
        lines.map((line) => ({
          stroke: line.getAttribute("stroke"),
          opacity: getComputedStyle(line).opacity,
        })),
      )
    expect(estimates.length).toBeGreaterThan(0)
    let hasBlendedEstimate = false
    for (const { stroke, opacity } of estimates) {
      expect(opacity).toBe("1")
      const channels = (stroke?.match(/\d+/g) ?? []).map(Number)
      expect(Math.max(...channels)).toBe(255)
      const minChannel = Math.min(...channels)
      if (minChannel > 0 && minChannel < 255) hasBlendedEstimate = true
    }
    expect(hasBlendedEstimate).toBe(true)

    // Read the real rendered pixels, so a hidden or covered overlay fails.
    const inStep = await screenPointOf({ page, x: -11, y: 0.3 })
    const positive = await screenPointOf({ page, x: 0, y: 0.3 })
    const negative = await screenPointOf({ page, x: 0, y: -0.3 })
    const [
      [red0, green0, blue0],
      [red1, green1, blue1],
      [red2, green2, blue2],
    ] = await screenshotPixelsAt({
      page,
      points: [inStep, positive, negative],
    })
    // Thin lines blend at their edges, so check which colour dominates:
    // white in step, blue where longer (+), red where shorter (-).
    expect(Math.min(red0, green0, blue0)).toBeGreaterThan(MIN_OVERLAY_CHANNEL)
    expect(blue1).toBeGreaterThan(MIN_OVERLAY_CHANNEL)
    expect(blue1).toBeGreaterThan(2 * Math.max(red1, green1))
    expect(red2).toBeGreaterThan(MIN_OVERLAY_CHANNEL)
    expect(red2).toBeGreaterThan(2 * Math.max(green2, blue2))

    // Snapshot the board canvases plus the live overlay, leaving out the
    // toolbar and labels drawn with OS fonts that differ between machines.
    const board = await page.evaluate(async () => {
      const composite = document.createElement("canvas")
      composite.width = 600
      composite.height = 400
      const ctx = composite.getContext("2d")!
      ctx.fillStyle = "#111"
      ctx.fillRect(0, 0, 600, 400)
      // Each layer's canvas (with its live opacity), then that layer's overlay above it.
      for (const name of ["board", "top"]) {
        const canvas = document.querySelector(
          `.pcb-layer-${name}`,
        ) as HTMLCanvasElement
        const style = getComputedStyle(canvas)
        ctx.save()
        ctx.globalAlpha = Number(style.opacity)
        ctx.drawImage(canvas, 0, 0)
        ctx.restore()
        const overlay = document.querySelector(
          `.pcb-local-skew-overlay svg[data-layer="${name}"]`,
        )
        if (!overlay) continue
        const markup = new XMLSerializer().serializeToString(overlay)
        const image = new Image()
        image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
          markup.replace("<svg ", '<svg width="600" height="400" '),
        )}`
        await image.decode()
        ctx.drawImage(image, 0, 0)
      }
      return composite.toDataURL()
    })
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400"><title>Local skew overlay on a differential pair that matches end to end</title><image width="600" height="400" href="${board}"/></svg>`
    await expect(svg).toMatchSvgSnapshot(import.meta.path, "local-skew-overlay")

    await viewMenu.click({ delay: MENU_CLICK_DELAY_MS })
    await page.getByText("Show Local Skew", { exact: true }).click()
    await overlay.waitFor({ state: "detached" })
    expect(errors).toEqual([])
  } finally {
    await close()
  }
}, 60000)
