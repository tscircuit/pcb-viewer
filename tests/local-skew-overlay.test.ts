import { expect, test } from "bun:test"
import "bun-match-svg"
import {
  openOverlayPage,
  screenPointOf,
} from "./local-skew-overlay/open-overlay-page"

test("Show Local Skew colours the out-of-phase stretch without remounting the board", async () => {
  const { page, errors, close } = await openOverlayPage({})
  try {
    await page.evaluate(() => {
      ;(
        document.querySelector(".pcb-layer-top") as HTMLElement
      ).dataset.marker = "before-toggle"
    })
    const overlay = page.locator(".pcb-local-skew-overlay")
    expect(await overlay.count()).toBe(0)

    await page.locator("[data-view-menu] > div > div").first().click({
      delay: 350,
    })
    await page.getByText("Show Local Skew", { exact: true }).click()
    await overlay.waitFor()
    await page.locator("[data-view-menu] > div > div").first().click({
      delay: 350,
    })
    await page.mouse.move(590, 390)
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

    // Read the real rendered pixels, so a hidden or covered overlay fails.
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
      { png: screenshot, points: [positive, negative] },
    )
    // Thin lines blend at their edges, so check which colour dominates.
    const [[red1, green1, blue1], [red2, green2, blue2]] = pixels
    expect(red1).toBeGreaterThan(2 * Math.max(green1, blue1))
    expect(blue2).toBeGreaterThan(1.5 * Math.max(red2, green2))

    // Snapshot the board canvases plus the live overlay, leaving out the
    // toolbar and labels drawn with OS fonts that differ between machines.
    const board = await page.evaluate(async () => {
      const composite = document.createElement("canvas")
      composite.width = 600
      composite.height = 400
      const ctx = composite.getContext("2d")!
      ctx.fillStyle = "#111"
      ctx.fillRect(0, 0, 600, 400)
      for (const name of ["board", "top"]) {
        ctx.drawImage(
          document.querySelector(`.pcb-layer-${name}`) as HTMLCanvasElement,
          0,
          0,
        )
      }
      const overlay = document.querySelector(
        ".pcb-local-skew-overlay",
      ) as SVGSVGElement
      const markup = new XMLSerializer().serializeToString(overlay)
      const image = new Image()
      image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
        markup.replace("<svg ", '<svg width="600" height="400" '),
      )}`
      await image.decode()
      ctx.drawImage(image, 0, 0)
      return composite.toDataURL()
    })
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400"><title>Local skew overlay on a differential pair that matches end to end</title><image width="600" height="400" href="${board}"/></svg>`
    await expect(svg).toMatchSvgSnapshot(import.meta.path, "local-skew-overlay")

    await page.locator("[data-view-menu] > div > div").first().click({
      delay: 350,
    })
    await page.getByText("Show Local Skew", { exact: true }).click()
    await overlay.waitFor({ state: "detached" })
    expect(errors).toEqual([])
  } finally {
    await close()
  }
}, 60000)
