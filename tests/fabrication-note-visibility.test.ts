import { expect, test } from "bun:test"
import "bun-match-svg"
import { fileURLToPath } from "node:url"
import { type Browser, chromium } from "playwright"
import { createServer } from "vite"

test("fabrication notes are opt-in and only paint their assigned board side", async () => {
  const server = await createServer({
    root: fileURLToPath(new URL("../", import.meta.url)),
    server: { host: "127.0.0.1", port: 0 },
    logLevel: "error",
  })
  await server.listen()
  let browser: Browser | undefined
  try {
    browser = await chromium.launch({
      headless: true,
      ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
        ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE }
        : {}),
    })
    for (const layer of ["top", "bottom"] as const) {
      const page = await browser.newPage({
        viewport: { width: 600, height: 400 },
      })
      const errors: string[] = []
      page.on("pageerror", (error) => errors.push(error.message))
      const key = "pcb_viewer_is_showing_fabrication_notes"
      await page.goto(
        `${server.resolvedUrls!.local[0]}tests/fabrication-note-visibility/?layer=${layer}`,
      )
      await page.waitForSelector(".pcb-layer-top")
      const menu = page.locator("[data-view-menu] > div > div").first()
      const label = page.getByText("Show Fabrication Notes", { exact: true })
      const checkbox = label.locator("..").locator("input")
      const paintedPixels = (side: string) =>
        page.locator(`.pcb-layer-${side}_fabrication`).evaluate((element) => {
          const canvas = element as HTMLCanvasElement
          const data = canvas
            .getContext("2d")!
            .getImageData(0, 0, canvas.width, canvas.height).data
          return data.filter((value, index) => index % 4 === 3 && value > 0)
            .length
        })
      await menu.click({ delay: 350 })
      expect(await checkbox.isChecked()).toBe(false)
      expect(await paintedPixels("top")).toBe(0)
      expect(await paintedPixels("bottom")).toBe(0)
      await label.click()
      expect(await checkbox.isChecked()).toBe(true)
      expect(await page.evaluate((key) => localStorage.getItem(key), key)).toBe(
        "true",
      )
      await menu.click({ delay: 350 })
      await checkbox.waitFor({ state: "hidden" })
      await page.waitForFunction((side) => {
        const canvas = document.querySelector(
          `.pcb-layer-${side}_fabrication`,
        ) as HTMLCanvasElement
        return canvas
          .getContext("2d")!
          .getImageData(0, 0, canvas.width, canvas.height)
          .data.some((value, index) => index % 4 === 3 && value > 0)
      }, layer)
      expect(await paintedPixels(layer)).toBeGreaterThan(0)
      // Dimensions previously leaked onto both FAB canvases, unlike text/path/rect.
      expect(await paintedPixels(layer === "top" ? "bottom" : "top")).toBe(0)
      await page.mouse.move(590, 390)
      // Snapshot board artwork only, excluding hover overlays and OS UI fonts.
      const image = await page.evaluate(() => {
        const board = document.querySelector(
          ".pcb-layer-board",
        ) as HTMLCanvasElement
        const composite = document.createElement("canvas")
        composite.width = board.width
        composite.height = board.height
        const ctx = composite.getContext("2d")!
        ctx.fillStyle = "#111"
        ctx.fillRect(0, 0, composite.width, composite.height)
        for (const name of [
          "board",
          "bottom",
          "top",
          "bottom_fabrication",
          "top_fabrication",
        ]) {
          const canvas = document.querySelector(
            `.pcb-layer-${name}`,
          ) as HTMLCanvasElement
          ctx.drawImage(canvas, 0, 0)
        }
        return composite.toDataURL()
      })
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400"><title>${layer} fabrication artwork enabled on a two-pad component</title><image width="600" height="400" href="${image}"/></svg>`
      await expect(svg).toMatchSvgSnapshot(
        import.meta.path,
        `fabrication-note-${layer}`,
      )
      await page.reload()
      await page.waitForSelector(".pcb-layer-top")
      await menu.click({ delay: 350 })
      expect(await checkbox.isChecked()).toBe(true)
      await label.click()
      expect(await checkbox.isChecked()).toBe(false)
      await page.reload()
      await page.waitForSelector(".pcb-layer-top")
      await menu.click({ delay: 350 })
      expect(await checkbox.isChecked()).toBe(false)
      expect(await paintedPixels(layer)).toBe(0)
      expect(errors).toEqual([])
      await page.close()
    }
  } finally {
    await browser?.close()
    await server.close()
  }
}, 60000)
