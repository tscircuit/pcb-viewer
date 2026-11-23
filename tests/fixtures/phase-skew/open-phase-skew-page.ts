import { type Server, createServer as createHttpServer } from "node:http"
import type { AddressInfo } from "node:net"
import { fileURLToPath } from "node:url"
import type { CircuitJson, LayerRef, Point } from "circuit-json"
import {
  type Browser,
  type LaunchOptions,
  type Page,
  chromium,
} from "playwright"
import { type ViteDevServer, createServer } from "vite"

/** Viewer size in CSS pixels, matching the page's root width and the viewer height. */
const VIEWER_WIDTH = 600
const VIEWER_HEIGHT = 400

/** Delay for clicks that open the View menu, which opens on a held press. */
const MENU_CLICK_DELAY_MS = 350

/** A pointer position outside the board, so no hover overlay is drawn. */
const OFF_BOARD_POINT = { x: 590, y: 390 }

/** Chromium flags for software WebGPU (SwiftShader), so the tests run without a GPU. */
const SOFTWARE_WEBGPU_ARGS = [
  "--enable-unsafe-webgpu",
  "--enable-gpu",
  "--use-angle=swiftshader",
  "--use-vulkan=swiftshader",
  "--enable-features=Vulkan",
  "--enable-unsafe-swiftshader",
  "--ignore-gpu-blocklist",
]

/** The viewer fits the 30 mm board to 75% of its 600 px width. */
const FIT_PIXELS_PER_MM = 15

/** Screenshots taken while waiting for a frame the WebGPU worker paints later. */
const SCREENSHOT_ATTEMPTS = 10
const SCREENSHOT_RETRY_MS = 100

/** A colour read from a page screenshot. */
export type RgbPixel = [red: number, green: number, blue: number]

/** Vite's middleware, served on a port the operating system picked. */
type PhaseSkewServer = {
  vite: ViteDevServer
  httpServer: Server
  url: string
}

/** A browser page showing a board in the viewer, and how to shut it down. */
export type PhaseSkewPage = {
  page: Page
  /** Uncaught page errors seen so far. */
  errors: string[]
  close: () => Promise<void>
}

/** Opens `circuitJson`, rendered from a TSX fixture through core, in the viewer in Chromium. */
export async function openPhaseSkewPage({
  circuitJson,
  renderer,
}: {
  circuitJson: CircuitJson
  renderer: "canvas" | "webgpu"
}): Promise<PhaseSkewPage> {
  const server = await startPhaseSkewServer()
  let browser: Browser | undefined
  try {
    const launchOptions: LaunchOptions = { headless: true }
    // Canvas runs keep Chromium's default rasteriser, which the snapshot was
    // recorded with.
    if (renderer === "webgpu") launchOptions.args = SOFTWARE_WEBGPU_ARGS
    if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE !== undefined) {
      launchOptions.executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
    }
    browser = await chromium.launch(launchOptions)
    const page = await browser.newPage({
      viewport: { width: VIEWER_WIDTH, height: VIEWER_HEIGHT },
    })
    const errors: string[] = []
    page.on("pageerror", (error) => errors.push(error.message))
    await page.addInitScript(
      (pageSetup) => {
        window.phaseSkewCircuitJson = pageSetup.circuitJson
        window.phaseSkewRenderer = pageSetup.renderer
      },
      { circuitJson, renderer },
    )
    await page.goto(`${server.url}tests/fixtures/phase-skew/`)
    await page
      .locator('#root[data-rendered="true"]')
      .waitFor({ state: "attached" })
    await page.mouse.move(OFF_BOARD_POINT.x, OFF_BOARD_POINT.y)
    const openBrowser = browser
    return {
      page,
      errors,
      close: () => closePhaseSkewPage({ browser: openBrowser, server }),
    }
  } catch (error) {
    await closePhaseSkewPage({ browser, server })
    throw error
  }
}

/**
 * Serves the repository through Vite's middleware on port 0, which the
 * operating system replaces with a free port. Vite's own `listen()` treats
 * port 0 as unset and tries 5173 first.
 */
async function startPhaseSkewServer(): Promise<PhaseSkewServer> {
  const httpServer = createHttpServer()
  const vite = await createServer({
    root: fileURLToPath(new URL("../../../", import.meta.url)),
    // The HMR WebSocket shares the HTTP server's port. On its own default
    // port it would clash with another test's server.
    server: { middlewareMode: true, hmr: { server: httpServer } },
    logLevel: "error",
  })
  httpServer.on("request", vite.middlewares)
  try {
    await new Promise<void>((resolve, reject) => {
      httpServer.once("error", reject)
      httpServer.listen(0, "127.0.0.1", resolve)
    })
  } catch (error) {
    await vite.close()
    throw error
  }
  const { port } = httpServer.address() as AddressInfo
  return { vite, httpServer, url: `http://127.0.0.1:${port}/` }
}

/** Closes the browser if one was launched, then the server. */
async function closePhaseSkewPage({
  browser,
  server,
}: {
  browser: Browser | undefined
  server: PhaseSkewServer
}): Promise<void> {
  try {
    await browser?.close()
  } finally {
    server.httpServer.close()
    await server.vite.close()
  }
}

/** CSS selector present while X-ray inspects a net, in either renderer. */
const ACTIVE_X_RAY_SELECTOR = '.pcb-x-ray-net, [data-x-ray-net-active="true"]'

/** X-rays the net of the trace at `point` from its click menu, then moves the pointer off the board. */
export async function xRayNetAt({
  page,
  point,
}: {
  page: Page
  point: Point
}): Promise<void> {
  await page.mouse.click(point.x, point.y)
  await page
    .getByRole("menuitem", { name: /^X-Ray / })
    .first()
    .click()
  await page.waitForSelector(ACTIVE_X_RAY_SELECTOR)
  await page.mouse.move(OFF_BOARD_POINT.x, OFF_BOARD_POINT.y)
}

/** Leaves X-ray with Escape. */
export async function exitXRay({ page }: { page: Page }): Promise<void> {
  await page.keyboard.press("Escape")
  await page.waitForSelector(ACTIVE_X_RAY_SELECTOR, { state: "detached" })
}

/** Brings `layer` to the front from the toolbar's layer menu. */
export async function selectLayer({
  page,
  layer,
}: {
  page: Page
  layer: LayerRef
}): Promise<void> {
  await page.getByText("layer:").click()
  await page.getByText(layer, { exact: true }).first().click()
  await page.mouse.move(OFF_BOARD_POINT.x, OFF_BOARD_POINT.y)
}

/** Opens or closes the toolbar's View menu. */
export async function toggleViewMenu({ page }: { page: Page }): Promise<void> {
  await page.locator("[data-view-menu] > div > div").first().click({
    delay: MENU_CLICK_DELAY_MS,
  })
}

/** Turns View → Show Differential Pair Phase Skew on or off and closes the menu again. */
export async function togglePhaseSkew({ page }: { page: Page }): Promise<void> {
  await toggleViewMenu({ page })
  await page
    .getByText("Show Differential Pair Phase Skew", { exact: true })
    .click()
  await toggleViewMenu({ page })
}

/**
 * The board and top copper canvases composited into an SVG image, leaving
 * out the toolbar and labels drawn with fonts that differ between machines.
 */
export async function snapshotTopCopper({
  page,
  title,
}: {
  page: Page
  title: string
}): Promise<string> {
  const pngUrl = await page.evaluate(
    ({ width, height }) => {
      const composite = document.createElement("canvas")
      composite.width = width
      composite.height = height
      const context = composite.getContext("2d")
      if (context === null) throw new Error("No 2D canvas context")
      context.fillStyle = "#111"
      context.fillRect(0, 0, width, height)
      for (const layer of ["board", "top"]) {
        const canvas = document.querySelector<HTMLCanvasElement>(
          `.pcb-layer-${layer}`,
        )
        if (canvas === null) throw new Error(`No ${layer} canvas`)
        context.globalAlpha = Number(getComputedStyle(canvas).opacity)
        context.drawImage(canvas, 0, 0)
      }
      return composite.toDataURL()
    },
    { width: VIEWER_WIDTH, height: VIEWER_HEIGHT },
  )
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${VIEWER_WIDTH}" height="${VIEWER_HEIGHT}"><title>${title}</title><image width="${VIEWER_WIDTH}" height="${VIEWER_HEIGHT}" href="${pngUrl}"/></svg>`
}

/** Where a board point appears in the viewer once it has fit the USB pair board. */
export function boardPointToScreen(boardPoint: Point): Point {
  return {
    x: VIEWER_WIDTH / 2 + boardPoint.x * FIT_PIXELS_PER_MM,
    y: VIEWER_HEIGHT / 2 - boardPoint.y * FIT_PIXELS_PER_MM,
  }
}

/** The colours a page screenshot shows at `points`, whichever renderer painted them. */
export async function screenshotPixelsAt({
  page,
  points,
}: {
  page: Page
  points: Point[]
}): Promise<RgbPixel[]> {
  const pngBase64 = (await page.screenshot()).toString("base64")
  return page.evaluate(
    async (screenshot) => {
      const image = new Image()
      image.src = `data:image/png;base64,${screenshot.pngBase64}`
      await image.decode()
      const canvas = document.createElement("canvas")
      canvas.width = image.width
      canvas.height = image.height
      const context = canvas.getContext("2d")
      if (context === null) throw new Error("No 2D canvas context")
      context.drawImage(image, 0, 0)
      return screenshot.points.map((point): RgbPixel => {
        const [red, green, blue] = context.getImageData(
          Math.floor(point.x),
          Math.floor(point.y),
          1,
          1,
        ).data
        return [red, green, blue]
      })
    },
    { pngBase64, points },
  )
}

/** The colours at `points` once two screenshots in a row agree, since the WebGPU worker paints in a later frame. */
export async function screenshotSettledPixelsAt({
  page,
  points,
}: {
  page: Page
  points: Point[]
}): Promise<RgbPixel[]> {
  let previousPixels = await screenshotPixelsAt({ page, points })
  for (let attempt = 1; attempt < SCREENSHOT_ATTEMPTS; attempt++) {
    await page.waitForTimeout(SCREENSHOT_RETRY_MS)
    const pixels = await screenshotPixelsAt({ page, points })
    if (Bun.deepEquals(pixels, previousPixels)) return pixels
    previousPixels = pixels
  }
  return previousPixels
}

/** The colours at `points`, retried until they match `expected`, since the WebGPU worker paints in a later frame. */
export async function waitForScreenshotPixels({
  page,
  points,
  expected,
}: {
  page: Page
  points: Point[]
  expected: RgbPixel[]
}): Promise<RgbPixel[]> {
  for (let attempt = 1; attempt < SCREENSHOT_ATTEMPTS; attempt++) {
    const pixels = await screenshotPixelsAt({ page, points })
    if (Bun.deepEquals(pixels, expected)) return pixels
    await page.waitForTimeout(SCREENSHOT_RETRY_MS)
  }
  return screenshotPixelsAt({ page, points })
}
