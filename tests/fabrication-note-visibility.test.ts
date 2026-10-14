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
    const shown = await page.screenshot({ animations: "disabled" })
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
    const hidden = await page.screenshot({ animations: "disabled" })
    expect(shown.toString("base64")).not.toBe(hidden.toString("base64"))
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="425"><rect width="1200" height="425" fill="#222"/><text x="10" y="18" fill="white">Default: polarity notes visible</text><text x="610" y="18" fill="white">Explicitly hidden</text><image y="25" width="600" height="400" href="data:image/png;base64,${shown.toString("base64")}"/><image x="600" y="25" width="600" height="400" href="data:image/png;base64,${hidden.toString("base64")}"/></svg>`
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
