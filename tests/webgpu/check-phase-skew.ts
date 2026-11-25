import assert from "node:assert/strict"
import { fileURLToPath } from "node:url"
import { type Browser, type Locator, type Page, chromium } from "playwright"
import { createServer } from "vite"

const STRONG_BLUE = 180
const MAX_RED_OR_GREEN = 100

async function countBluePixels({
  page,
  renderer,
}: { page: Page; renderer: Locator }) {
  const screenshot = await renderer.screenshot()
  return page.evaluate(
    async ({ encodedScreenshot, strongBlue, maxRedOrGreen }) => {
      const image = new Image()
      image.src = `data:image/png;base64,${encodedScreenshot}`
      await image.decode()
      const canvas = document.createElement("canvas")
      canvas.width = image.width
      canvas.height = image.height
      const ctx = canvas.getContext("2d")!
      ctx.drawImage(image, 0, 0)
      const { data: pixels } = ctx.getImageData(
        0,
        0,
        canvas.width,
        canvas.height,
      )
      let count = 0
      for (let i = 0; i < pixels.length; i += 4) {
        if (
          pixels[i] < maxRedOrGreen &&
          pixels[i + 1] < maxRedOrGreen &&
          pixels[i + 2] > strongBlue
        )
          count++
      }
      return count
    },
    {
      encodedScreenshot: screenshot.toString("base64"),
      strongBlue: STRONG_BLUE,
      maxRedOrGreen: MAX_RED_OR_GREEN,
    },
  )
}

const server = await createServer({
  root: fileURLToPath(new URL("../../", import.meta.url)),
  cacheDir: "node_modules/.vite-phase-skew-test",
  // Prebundle the lazy worker dependency so switching engines cannot reload the page.
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
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
    args: ["--enable-unsafe-webgpu", "--use-angle=swiftshader"],
  })
  const page = await browser.newPage({
    viewport: { width: 800, height: 600 },
  })
  page.setDefaultTimeout(15_000)
  const errors: string[] = []
  page.on("pageerror", (error) => errors.push(error.message))
  const url = new URL("tests/webgpu/", server.resolvedUrls!.local[0])
  url.searchParams.set("scenario", "canvas")
  url.searchParams.set(
    "circuitJsonUrl",
    "/src/examples/2026/differential-pair-phase-skew/tuning-bump.circuit.json",
  )
  await page.goto(url.href)
  await page.waitForFunction(
    () => window.gpuViewerTest.stats.renderCompletions === 1,
  )

  const viewMenu = page.locator("[data-view-menu] > div > div").first()
  const toggle = page.getByText("Show Differential Pair Phase Skew", {
    exact: true,
  })
  const checkbox = toggle.locator("..").locator("input")
  const canvasLayer = page.locator(".pcb-layer-top")
  const webGpuCanvas = page.locator(".pcb-webgpu-canvas")
  const viewport = { x: 400, y: 450 }

  assert.equal(await countBluePixels({ page, renderer: canvasLayer }), 0)
  await viewMenu.click()
  assert.equal(await checkbox.isChecked(), false)
  await toggle.click()
  assert.equal(await checkbox.isChecked(), true)
  await viewMenu.click()
  assert(
    (await countBluePixels({ page, renderer: canvasLayer })) > 0,
    "canvasLayer should render the skew overlay",
  )

  await page.mouse.click(viewport.x, viewport.y, { button: "right" })
  const engine = page.getByRole("menuitem", { name: "Rendering Engine ▸" })
  await engine.hover()
  assert.equal(await toggle.count(), 0)
  await page
    .getByRole("menuitemradio", { name: "WebGPU (experimental)" })
    .click()
  await page.waitForFunction(
    () =>
      window.gpuViewerTest.stats.renderCompletions === 2 ||
      document.querySelector("[data-webgpu-error]") !== null,
  )
  const webGpuError = await page
    .locator('[data-pcb-renderer="webgpu"]')
    .getAttribute("data-webgpu-error")
  assert.equal(webGpuError, null)
  assert(
    (await countBluePixels({ page, renderer: webGpuCanvas })) > 0,
    "webGpuCanvas should render the skew overlay",
  )

  await viewMenu.click()
  assert.equal(await checkbox.isChecked(), true)
  const framesBefore = await page.evaluate(
    () => window.gpuViewerTest.stats.frames,
  )
  await toggle.click()
  assert.equal(await checkbox.isChecked(), false)
  await viewMenu.click()
  await page.waitForFunction(
    (frames) => window.gpuViewerTest.stats.frames > frames,
    framesBefore,
  )
  assert.equal(await countBluePixels({ page, renderer: webGpuCanvas }), 0)
  assert.deepEqual(errors, [])
} finally {
  await browser?.close()
  await server.close()
}
