import { fileURLToPath } from "node:url"
import type { CircuitJson, Point } from "circuit-json"
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
  // Port 0 lets the operating system pick a free port when Vite binds.
  const server = await createServer({
    root: fileURLToPath(new URL("../../../", import.meta.url)),
    server: { host: "127.0.0.1", port: 0, strictPort: true },
    logLevel: "error",
  })
  await server.listen()
  const launchOptions: LaunchOptions = {
    headless: true,
    args: SOFTWARE_WEBGPU_ARGS,
  }
  if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE !== undefined) {
    launchOptions.executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
  }
  const browser = await chromium.launch(launchOptions)
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
  await page.goto(`${server.resolvedUrls?.local[0]}tests/fixtures/phase-skew/`)
  await page
    .locator('#root[data-rendered="true"]')
    .waitFor({ state: "attached" })
  await page.mouse.move(OFF_BOARD_POINT.x, OFF_BOARD_POINT.y)
  return {
    page,
    errors,
    close: () => closePhaseSkewPage({ browser, server }),
  }
}

/** Closes the browser, then the Vite server. */
async function closePhaseSkewPage({
  browser,
  server,
}: {
  browser: Browser
  server: ViteDevServer
}): Promise<void> {
  await browser.close()
  await server.close()
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
