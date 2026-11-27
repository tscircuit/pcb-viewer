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

function readCanvasPixel({
  renderer,
  point,
}: {
  renderer: Locator
  point: { x: number; y: number }
}) {
  return renderer.evaluate(
    (canvas: HTMLCanvasElement, { x, y }) =>
      Array.from(canvas.getContext("2d")!.getImageData(x, y, 1, 1).data),
    point,
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
  await page.route("**/tuning-bump.circuit.json", async (route) => {
    const response = await route.fetch()
    const elements: AnyCircuitElement[] = await response.json()
    // Widen the lower trace so its hit area extends past the old tooltip cutoff.
    for (const element of elements) {
      if (
        element.type === "pcb_trace" &&
        element.pcb_trace_id === "pcb_trace_1"
      ) {
        for (const point of element.route) {
          if (point.route_type === "wire") point.width = 1.4
        }
      } else if (element.type === "pcb_differential_pair_phase_skew") {
        for (const segment of element.negative_trace.segments) {
          segment.width = 1.4
        }
      }
    }
    await route.fulfill({ response, json: elements })
  })
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
  const xRayCanvas = page.locator(".pcb-x-ray-net")
  const webGpuCanvas = page.locator(".pcb-webgpu-canvas")
  const viewport = { x: 400, y: 450 }
  const lowerTrace = { x: 400, y: 313 }
  const xRayMenuItem = page.getByRole("menuitem", {
    name: "X-Ray Net",
    exact: true,
  })
  const upperLoadPad = { x: 657, y: 287 }
  const hoverLowerTrace = async () => {
    await page.mouse.move(lowerTrace.x, lowerTrace.y)
    await page.evaluate(
      () =>
        new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(resolve)),
        ),
    )
    return readCanvasPixel({ renderer: canvasLayer, point: lowerTrace })
  }

  assert.equal(await countBluePixels({ page, renderer: canvasLayer }), 0)
  const loadPadCopper = await readCanvasPixel({
    renderer: canvasLayer,
    point: upperLoadPad,
  })
  const copper = await readCanvasPixel({
    renderer: canvasLayer,
    point: lowerTrace,
  })
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
  const loadPadWithSkew = await readCanvasPixel({
    renderer: canvasLayer,
    point: upperLoadPad,
  })
  assert(
    loadPadWithSkew[2] > loadPadCopper[2] + 100,
    `Canvas should paint the leading skew over the load pad (off ${loadPadCopper}, on ${loadPadWithSkew})`,
  )
  assert.notDeepEqual(
    await readCanvasPixel({ renderer: canvasLayer, point: lowerTrace }),
    highlight,
  )
  assert.deepEqual(
    await hoverLowerTrace(),
    highlight,
    "Canvas should show the same hover colour with the skew overlay on",
  )
  assert.equal(
    await page.locator("[data-phase-skew-hover]").textContent(),
    "Lagging 1.823 mm",
    "Hovering the shorter trace should show how far it lags",
  )
  assert.equal(
    await countBluePixels({ page, renderer: canvasLayer }),
    bluePixels,
  )

  const skewTooltips = page.locator("[data-phase-skew-hover]")
  const hoveredSkew: string[][] = []
  for (const { x, y } of [
    { x: 233, y: 240 }, // Bend shared by two primitives of the upper trace.
    { x: 400, y: 291 }, // Upper trace, within the hit areas of both traces.
    { x: 400, y: 339 }, // Lower trace, beyond the previous tooltip cutoff.
  ]) {
    await page.mouse.move(x, y)
    hoveredSkew.push(await skewTooltips.allTextContents())
  }
  assert.deepEqual(hoveredSkew, [
    ["Leading 0.809 mm"],
    ["Leading 1.823 mm"],
    ["Lagging 1.823 mm"],
  ])

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
    true,
    "WebGPU should receive the chosen flag and suppress skew while X-Ray is active",
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
  url.searchParams.set("scenario", "xray-unsupported")
  await page.goto(url.href)
  await page.waitForFunction(() => window.gpuViewerTest.stats.frames > 0)
  await viewMenu.click()
  await toggle.click()
  await page.mouse.click(viewport.x, viewport.y)
  await toggle.waitFor({ state: "detached" })
  assert((await countBluePixels({ page, renderer: webGpuCanvas })) > 0)
  await page.mouse.click(lowerTrace.x, lowerTrace.y, { button: "right" })
  const framesBeforeUnavailableXRay = await page.evaluate(
    () => window.gpuViewerTest.stats.frames,
  )
  await xRayMenuItem.click()
  await page.getByRole("status").waitFor()
  await page.waitForFunction((frames) => {
    const { stats } = window.gpuViewerTest
    return (
      stats.frames > frames &&
      stats.lastView?.options.xRayElementIds?.length === 0
    )
  }, framesBeforeUnavailableXRay)
  assert(
    (await countBluePixels({ page, renderer: webGpuCanvas })) > 0,
    "WebGPU skew should remain visible when X-Ray is unavailable",
  )

  assert.deepEqual(errors, [])
} finally {
  await browser?.close()
  await server.close()
}
