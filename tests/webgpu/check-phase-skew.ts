import assert from "node:assert/strict"
import { fileURLToPath } from "node:url"
import type { AnyCircuitElement } from "circuit-json"
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
  const isLinux = process.platform === "linux"
  const args = ["--enable-unsafe-webgpu", "--use-angle=swiftshader"]
  // Use software Vulkan for WebGPU canvas compositing on headless Linux.
  // https://issues.chromium.org/issues/575926500
  if (isLinux) args.push("--use-vulkan=swiftshader", "--enable-features=Vulkan")
  browser = await chromium.launch({
    channel: isLinux ? "chromium" : undefined,
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
    args,
  })
  const page = await browser.newPage({
    viewport: { width: 800, height: 600 },
  })
  // Keep unselected copper fully visible so dimming cannot mask overlay pixels.
  await page.addInitScript(() => {
    localStorage.setItem("pcb_viewer_hidden_layer_opacity", "1")
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
  // Keep the actual trace, but start its first zero-skew span a little later
  // so this fixture has known zero and unknown on the same visible copper.
  await page.route("**/tuning-bump.circuit.json", async (route) => {
    const response = await route.fetch()
    const elements: AnyCircuitElement[] = await response.json()
    const skew = elements.find(
      (element) => element.type === "pcb_differential_pair_phase_skew",
    )!
    skew.negative_trace.segments[0]!.start.x += 1.5
    await route.fulfill({ response, json: elements })
  })
  await page.goto(url.href)
  await page.waitForFunction(
    () => window.gpuViewerTest.stats.renderCompletions === 1,
  )

  const viewMenu = page.locator("[data-view-menu] > div > div").first()
  const toggle = page.getByText("Show Accumulated Local Length Skew", {
    exact: true,
  })
  const checkbox = toggle.locator("..").locator("input")
  const canvasLayer = page.locator(".pcb-layer-top")
  const xRayCanvas = page.locator(".pcb-x-ray-net")
  const webGpuCanvas = page.locator(".pcb-webgpu-canvas")
  const viewport = { x: 400, y: 450 }
  const lowerTrace = { x: 400, y: 313 }
  const xRayMenuItem = page.getByRole("menuitem", {
    name: "X-Ray Net",
    exact: true,
  })
  const tracePixel = (point: { x: number; y: number }) =>
    canvasLayer.evaluate(
      (canvas: HTMLCanvasElement, { x, y }) =>
        Array.from(canvas.getContext("2d")!.getImageData(x, y, 1, 1).data),
      point,
    )
  const lowerTracePixel = () => tracePixel(lowerTrace)
  const hoverLowerTrace = async () => {
    await page.mouse.move(lowerTrace.x, lowerTrace.y)
    await page.evaluate(
      () =>
        new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(resolve)),
        ),
    )
    return lowerTracePixel()
  }

  assert.equal(await countBluePixels({ page, renderer: canvasLayer }), 0)
  const copper = await lowerTracePixel()
  const highlight = await hoverLowerTrace()
  assert.notDeepEqual(highlight, copper, "Canvas should highlight the trace")
  await page.mouse.move(viewport.x, viewport.y)
  await viewMenu.click()
  assert.equal(await checkbox.isChecked(), false)
  await toggle.click()
  assert.equal(await checkbox.isChecked(), true)
  await page.mouse.click(viewport.x, viewport.y)
  await toggle.waitFor({ state: "detached" })
  const bluePixels = await countBluePixels({ page, renderer: canvasLayer })
  assert(bluePixels > 0, "Canvas should render the skew overlay")
  const unknownPoint = { x: 161, y: lowerTrace.y }
  const zeroPoint = { x: 177, y: lowerTrace.y }
  const unknownPixel = await tracePixel(unknownPoint)
  const zeroPixel = await tracePixel(zeroPoint)
  assert.deepEqual(unknownPixel, [128, 128, 128, 255], "Unknown skew is gray")
  assert.deepEqual(zeroPixel, [255, 255, 255, 255], "Known zero skew is white")
  await page.mouse.move(unknownPoint.x, unknownPoint.y)
  await page.getByText("Local skew: unknown", { exact: true }).first().waitFor()
  assert.deepEqual(await tracePixel(unknownPoint), unknownPixel)
  await page.mouse.move(viewport.x, viewport.y)
  const localSkewPixel = await lowerTracePixel()
  assert.notDeepEqual(localSkewPixel, highlight)
  assert.deepEqual(
    await hoverLowerTrace(),
    localSkewPixel,
    "Trace hover should keep the accumulated skew color visible",
  )
  await page
    .getByText(/^Local skew: -?1\.82/)
    .first()
    .waitFor()
  assert.equal(
    await countBluePixels({ page, renderer: canvasLayer }),
    bluePixels,
  )

  // X-ray the lower trace, leaving the upper trace outside the selected net.
  await page.mouse.click(lowerTrace.x, lowerTrace.y, { button: "right" })
  await xRayMenuItem.click()
  await xRayCanvas.waitFor()
  assert.equal(await countBluePixels({ page, renderer: canvasLayer }), 0)
  await page.keyboard.press("Escape")
  await xRayCanvas.waitFor({ state: "detached" })
  assert((await countBluePixels({ page, renderer: canvasLayer })) > 0)

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
    await page.evaluate(() =>
      Boolean(
        window.gpuViewerTest.stats.lastView?.options.phaseSkewUnknownTraceIds
          ?.length,
      ),
    ),
    "The Viewer should forward its identified pair traces to WebGPU",
  )
  // The Viewer still ships the established package until the renderer support
  // is released. Exercise the actual pixels when using an integrated build.
  if (process.env.EXPECT_WEBGPU_UNKNOWN_SKEW === "1") {
    const encoded = (await webGpuCanvas.screenshot()).toString("base64")
    const pixels = await page.evaluate(
      async ({ encoded, points }) => {
        const image = new Image()
        image.src = `data:image/png;base64,${encoded}`
        await image.decode()
        const bitmap = document.createElement("canvas")
        bitmap.width = image.width
        bitmap.height = image.height
        const context = bitmap.getContext("2d")!
        context.drawImage(image, 0, 0)
        return points.map(({ x, y }) => [
          ...context.getImageData(x, y, 1, 1).data,
        ])
      },
      { encoded, points: [unknownPoint, zeroPoint] },
    )
    assert.deepEqual(pixels, [
      [128, 128, 128, 255],
      [255, 255, 255, 255],
    ])
  }
  assert(
    (await countBluePixels({ page, renderer: webGpuCanvas })) > 0,
    "webGpuCanvas should render the skew overlay",
  )

  await page.mouse.click(lowerTrace.x, lowerTrace.y, { button: "right" })
  await xRayMenuItem.click()
  await page.waitForSelector('[data-x-ray-net-active="true"]')
  assert.equal(await countBluePixels({ page, renderer: webGpuCanvas }), 0)
  assert.equal(
    await page.evaluate(
      () =>
        window.gpuViewerTest.stats.lastView?.options
          .showDifferentialPairPhaseSkew,
    ),
    false,
    "WebGPU should receive the suppressed flag while X-Ray is active",
  )
  await page.keyboard.press("Escape")
  await page.waitForSelector('[data-x-ray-net-active="false"]')
  assert((await countBluePixels({ page, renderer: webGpuCanvas })) > 0)

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
