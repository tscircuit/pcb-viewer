import { expect, test } from "bun:test"
import "bun-match-svg"
import { createServer } from "vite"
import { chromium } from "playwright"
import { fileURLToPath } from "node:url"

test("fabrication polarity markings are visible on first load and can be hidden", async () => {
  const server = await createServer({
    root: fileURLToPath(new URL("../", import.meta.url)),
    server: { host: "127.0.0.1", port: 0 },
    logLevel: "error",
  })
  await server.listen()
  let browser
  try {
    browser = await chromium.launch({
      headless: true,
      ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
        ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE }
        : {}),
    })
    const page = await browser.newPage({
      viewport: { width: 600, height: 400 },
    })
    const errors: string[] = []
    page.on("pageerror", (error) => errors.push(error.message))
    const url = `${server.resolvedUrls!.local[0]}tests/fabrication-note-visibility/`
    const key = "pcb_viewer_is_showing_fabrication_notes"
    await page.goto(url)
    await page.waitForSelector(".pcb-layer-top")
    await page
      .locator("[data-view-menu] > div > div")
      .first()
      .click({ delay: 350 })
    const checkbox = page
      .getByText("Show Fabrication Notes", { exact: true })
      .locator("..")
      .locator("input")
    await checkbox.waitFor()
    expect(await checkbox.isChecked()).toBe(true)
    await page
      .locator("[data-view-menu] > div > div")
      .first()
      .click({ delay: 350 })
    await checkbox.waitFor({ state: "hidden" })
    const captureFabricationLayer = () =>
      page.locator(".pcb-layer-top_fabrication").evaluate((element) => {
        const canvas = element as HTMLCanvasElement
        const pixels = canvas
          .getContext("2d")!
          .getImageData(0, 0, canvas.width, canvas.height).data
        return {
          image: canvas.toDataURL(),
          paintedPixels: pixels.filter(
            (value, index) => index % 4 === 3 && value > 0,
          ).length,
        }
      })
    // Capture actual fabrication pixels, excluding browser/OS UI font rendering.
    const shown = await captureFabricationLayer()
    expect(shown.paintedPixels).toBeGreaterThan(0)
    await page
      .locator("[data-view-menu] > div > div")
      .first()
      .click({ delay: 350 })
    await page.getByText("Show Fabrication Notes", { exact: true }).click()
    expect(await checkbox.isChecked()).toBe(false)
    expect(await page.evaluate((key) => localStorage.getItem(key), key)).toBe(
      "false",
    )
    await page
      .locator("[data-view-menu] > div > div")
      .first()
      .click({ delay: 350 })
    await checkbox.waitFor({ state: "hidden" })
    const hidden = await captureFabricationLayer()
    expect(hidden.paintedPixels).toBe(0)
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="400"><title>Fabrication notes: default shown at left; explicitly hidden at right.</title><rect width="1200" height="400" fill="#111"/><image width="600" height="400" href="${shown.image}"/><image x="600" width="600" height="400" href="${hidden.image}"/></svg>`
    await expect(svg).toMatchSvgSnapshot(import.meta.path)
    await page.reload()
    await page.waitForSelector(".pcb-layer-top")
    await page
      .locator("[data-view-menu] > div > div")
      .first()
      .click({ delay: 350 })
    expect(await checkbox.isChecked()).toBe(false)
    expect(errors).toEqual([])
  } finally {
    await browser?.close()
    await server.close()
  }
}, 60000)
