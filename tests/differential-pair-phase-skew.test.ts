import { expect, test } from "bun:test"
import { getTuningBumpCircuit } from "../src/examples/2026/differential-pair-phase-skew/tuning-bump"
import { fileURLToPath } from "node:url"
import { chromium, type Browser, type Page } from "playwright"
import { createServer } from "vite"

async function pixelAt(page: Page, x: number, y: number) {
  const pixel = await page.screenshot({ clip: { x, y, width: 1, height: 1 } })
  return await page.evaluate(async (base64) => {
    const image = new Image()
    image.src = `data:image/png;base64,${base64}`
    await image.decode()
    const ctx = document.createElement("canvas").getContext("2d")!
    ctx.drawImage(image, 0, 0)
    return Array.from(ctx.getImageData(0, 0, 1, 1).data)
  }, pixel.toString("base64"))
}

test("phase skew can be inspected on Canvas and WebGPU from the same View toggle", async () => {
  const server = await createServer({
    root: fileURLToPath(new URL("../", import.meta.url)),
    cacheDir: "node_modules/.vite-phase-skew",
    optimizeDeps: {
      entries: ["tests/webgpu/index.html"],
      include: ["@tscircuit/circuit-json-webgpu"],
    },
    server: { host: "127.0.0.1", port: 0 },
    logLevel: "error",
  })
  await server.listen()
  let browser: Browser | undefined
  try {
    browser = await chromium.launch({
      channel: process.platform === "linux" ? "chromium" : undefined,
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
      args: [
        "--enable-unsafe-webgpu",
        "--use-angle=swiftshader",
        "--use-vulkan=swiftshader",
        "--enable-features=Vulkan",
      ],
    })
    const page = await browser.newPage({
      viewport: { width: 800, height: 600 },
    })
    await page.route(
      (url) => url.pathname === "/phase-skew-board.json",
      (route) => route.fulfill({ json: getTuningBumpCircuit() }),
    )
    await page.goto(
      new URL(
        "tests/webgpu/?scenario=canvas&circuitJsonUrl=/phase-skew-board.json",
        server.resolvedUrls!.local[0],
      ).href,
    )
    await page.waitForFunction(
      () => window.gpuViewerTest?.stats.renderCompletions === 1,
    )
    const view = page.locator("[data-view-menu] > div > div").first()
    const toggle = page.getByText("Show Differential Pair Phase Skew", {
      exact: true,
    })
    const upper = { x: 400, y: 287 }
    const lower = { x: 400, y: 313 }
    await page.mouse.move(400, 450)
    const copper = await pixelAt(page, upper.x, upper.y)
    await view.click()
    expect(await toggle.locator("..").locator("input").isChecked()).toBe(false)
    await toggle.click()
    await page.mouse.click(400, 450)
    await toggle.waitFor({ state: "detached" })
    const canvasColor = await pixelAt(page, upper.x, upper.y)
    expect(canvasColor[2]!).toBeGreaterThan(copper[2]! + 100)
    await page.mouse.move(lower.x, lower.y)
    await page.getByText("Lagging 1.823 mm").waitFor()

    await page.mouse.click(400, 450, { button: "right" })
    await page.getByRole("menuitem", { name: "Rendering Engine ▸" }).hover()
    await page
      .getByRole("menuitemradio", { name: "WebGPU (experimental)" })
      .click()
    await page.waitForFunction(
      () => window.gpuViewerTest?.stats.renderCompletions === 2,
    )
    const gpuColor = await pixelAt(page, upper.x, upper.y)
    expect(gpuColor[2]!).toBeGreaterThan(gpuColor[0]! + 100)
    await page.mouse.move(upper.x, upper.y)
    await page.getByText("Leading 1.823 mm").waitFor()
    await view.click()
    expect(await toggle.locator("..").locator("input").isChecked()).toBe(true)
    await toggle.click()
    await page.mouse.click(400, 450)
    await toggle.waitFor({ state: "detached" })
    await page.mouse.move(upper.x, upper.y)
    expect(await page.getByText("Leading 1.823 mm").count()).toBe(0)
    expect(
      await page.evaluate(() => window.gpuViewerTest.stats.errors),
    ).toEqual([])
  } finally {
    await browser?.close()
    await server.close()
  }
}, 60_000)
