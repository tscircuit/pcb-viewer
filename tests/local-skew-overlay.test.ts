import { expect, test } from "bun:test"
import "bun-match-svg"
import { fileURLToPath } from "node:url"
import { type Browser, chromium } from "playwright"
import { createServer } from "vite"
import { renderDifferentialPairBoard } from "./fixtures/local-skew/differential-pair-board"

/** Overlay colour where USB_DP is ahead by at least the pair's 0.1 mm limit. */
const FULLY_AHEAD_COLOR = "rgb(255, 77, 77)"

test("Show Local Skew colours the out-of-phase stretch of a differential pair", async () => {
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
    const page = await browser.newPage({
      viewport: { width: 600, height: 400 },
    })
    const errors: string[] = []
    page.on("pageerror", (error) => errors.push(error.message))
    await page.addInitScript((circuitJson) => {
      window.localSkewCircuitJson = circuitJson
    }, renderDifferentialPairBoard())
    await page.goto(`${server.resolvedUrls!.local[0]}tests/local-skew-overlay/`)
    await page.waitForSelector(".pcb-layer-top")
    const overlay = page.getByTestId("local-skew-overlay")
    expect(await overlay.count()).toBe(0)

    await page.locator("[data-view-menu] > div > div").first().click({
      delay: 350,
    })
    await page.getByText("Show Local Skew", { exact: true }).click()
    await overlay.waitFor()
    expect(
      await page.evaluate(() =>
        localStorage.getItem("pcb_viewer_is_showing_local_skew"),
      ),
    ).toBe("true")

    const strokes = await overlay
      .locator("line")
      .evaluateAll((lines) => lines.map((line) => line.getAttribute("stroke")))
    expect(strokes).toContain(FULLY_AHEAD_COLOR)

    await page.mouse.move(590, 390)
    // Board artwork plus the overlay lines, excluding menus and OS UI fonts.
    const svg = await page.evaluate(() => {
      const composite = document.createElement("canvas")
      const board = document.querySelector(
        ".pcb-layer-board",
      ) as HTMLCanvasElement
      composite.width = board.width
      composite.height = board.height
      const ctx = composite.getContext("2d")!
      ctx.fillStyle = "#111"
      ctx.fillRect(0, 0, composite.width, composite.height)
      for (const name of ["board", "top"]) {
        const canvas = document.querySelector(
          `.pcb-layer-${name}`,
        ) as HTMLCanvasElement
        ctx.drawImage(canvas, 0, 0)
      }
      const lines = document.querySelector(
        "[data-testid=local-skew-overlay]",
      )!.innerHTML
      return `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400"><title>Local skew overlay on a differential pair that matches end to end</title><image width="600" height="400" href="${composite.toDataURL()}"/>${lines}</svg>`
    })
    await expect(svg).toMatchSvgSnapshot(import.meta.path, "local-skew-overlay")
    expect(errors).toEqual([])
  } finally {
    await browser?.close()
    await server.close()
  }
}, 60000)
