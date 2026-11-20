import { expect, test } from "bun:test"
import "bun-match-svg"
import {
  MENU_CLICK_DELAY_MS,
  OFF_BOARD_POINT,
  openOverlayPage,
  screenPointOf,
} from "./local-skew-overlay/open-overlay-page"

/**
 * Plain top copper is rgb(200, 52, 52) and its edges blend darker; KiCad's
 * negative (shorter) overlay is rgb(255, 0, 0), so even blended it is
 * brighter than copper, while blue/white channels exceed copper's 52 by far.
 */
const MIN_OVERLAY_RED = 215
const MIN_NON_RED_OVERLAY_CHANNEL = 180

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
    // Like KiCad, interpolated stretches are opaque and full brightness,
    // blending linearly from white to blue or red with no darkening.
    const estimates = await page
      .locator('line[data-coupling="interpolated"]')
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
    const screenshot = (await page.screenshot()).toString("base64")
    const pixels = await page.evaluate(
      async ({ png, points }) => {
        const image = new Image()
        image.src = `data:image/png;base64,${png}`
        await image.decode()
        const canvas = document.createElement("canvas")
        canvas.width = image.width
        canvas.height = image.height
        const ctx = canvas.getContext("2d")!
        ctx.drawImage(image, 0, 0)
        return points.map((point) =>
          Array.from(
            ctx.getImageData(Math.round(point.x), Math.round(point.y), 1, 1)
              .data,
          ).slice(0, 3),
        )
      },
      { png: screenshot, points: [inStep, positive, negative] },
    )
    // Thin lines blend at their edges, so check which colour dominates:
    // white in step, blue where longer (+), red where shorter (-).
    const [
      [red0, green0, blue0],
      [red1, green1, blue1],
      [red2, green2, blue2],
    ] = pixels
    expect(Math.min(red0, green0, blue0)).toBeGreaterThan(
      MIN_NON_RED_OVERLAY_CHANNEL,
    )
    expect(blue1).toBeGreaterThan(MIN_NON_RED_OVERLAY_CHANNEL)
    expect(blue1).toBeGreaterThan(2 * Math.max(red1, green1))
    expect(red2).toBeGreaterThan(MIN_OVERLAY_RED)
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
      // Each layer's canvas, then that layer's overlay above it.
      for (const name of ["board", "top"]) {
        ctx.drawImage(
          document.querySelector(`.pcb-layer-${name}`) as HTMLCanvasElement,
          0,
          0,
        )
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
