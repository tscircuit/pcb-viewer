import { fileURLToPath } from "node:url"
import type { Point } from "@tscircuit/math-utils"
import type { CircuitJson } from "circuit-json"
import {
  type Browser,
  type LaunchOptions,
  type Page,
  chromium,
} from "playwright"
import { type InlineConfig, type ViteDevServer, createServer } from "vite"
import type { State } from "../../src/global-store"
import { renderDifferentialPairBoard } from "../fixtures/local-skew/differential-pair-board"

/** A browser page showing the compensated differential pair, and how to shut it down. */
export type OverlayPage = {
  page: Page
  /** Uncaught page errors seen so far. */
  errors: string[]
  close: () => Promise<void>
}

/** Viewer store fields to start from, e.g. `{ selected_layer: "bottom" }`. */
export type OverlayInitialState = Partial<State>

/** Delay for clicks that open the View menu, which opens on a held press. */
export const MENU_CLICK_DELAY_MS = 350

/** A point off the board, for moving the pointer out of the way. */
export const OFF_BOARD_POINT: Point = { x: 590, y: 390 }

/** Opens a board in Chromium with the given viewer state; by default the compensated differential pair. */
export async function openOverlayPage({
  initialState,
  renderer = "canvas",
  circuitJson = renderDifferentialPairBoard({ compensated: true }),
}: {
  initialState: OverlayInitialState
  renderer?: "canvas" | "webgpu"
  /** Rendered from a TSX fixture through core. */
  circuitJson?: CircuitJson
}): Promise<OverlayPage> {
  let server: ViteDevServer | undefined
  let browser: Browser | undefined
  try {
    const useRealWebGpu =
      renderer === "webgpu" && process.env.PCB_VIEWER_REAL_WEBGPU === "1"
    // Port 0 lets the operating system pick a free port when Vite binds.
    const viteConfig: InlineConfig = {
      root: fileURLToPath(new URL("../../", import.meta.url)),
      server: { host: "127.0.0.1", port: 0, strictPort: true },
      logLevel: "error",
    }
    if (renderer === "webgpu" && !useRealWebGpu) {
      viteConfig.resolve = {
        alias: {
          "@tscircuit/circuit-json-webgpu": fileURLToPath(
            new URL("./controlled-webgpu-drawer.ts", import.meta.url),
          ),
        },
      }
    }
    server = await createServer(viteConfig)
    await server.listen()
    const [baseUrl] = server.resolvedUrls?.local ?? []
    const launchOptions: LaunchOptions = { headless: true }
    if (useRealWebGpu) {
      launchOptions.args = ["--enable-unsafe-webgpu", "--use-angle=swiftshader"]
    }
    if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE) {
      launchOptions.executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
    }
    browser = await chromium.launch(launchOptions)
    const page = await browser.newPage({
      viewport: { width: 600, height: 400 },
    })
    const errors: string[] = []
    page.on("pageerror", (error) => errors.push(error.message))
    await page.addInitScript(
      ({ circuitJson, renderer, state }) => {
        window.localSkewCircuitJson = circuitJson
        window.localSkewInitialState = state
        window.localSkewRenderer = renderer
      },
      {
        circuitJson,
        renderer,
        state: initialState,
      },
    )
    await page.goto(`${baseUrl}tests/local-skew-overlay/`)
    await page.waitForFunction(() =>
      document.querySelector(
        '#root[data-rendered="true"], [data-webgpu-error]',
      ),
    )
    const gpuError = await page.evaluate(
      () =>
        document
          .querySelector("[data-webgpu-error]")
          ?.getAttribute("data-webgpu-error") ?? null,
    )
    if (gpuError) throw new Error(gpuError)
    if (renderer === "canvas") {
      await page.waitForFunction(
        () =>
          document.querySelector<HTMLCanvasElement>(".pcb-layer-board")
            ?.width === 600,
      )
    }
    // The initial fit is scheduled on an animation frame after measuring the viewer.
    await page.evaluate(
      () =>
        new Promise<void>((resolve) => {
          requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
        }),
    )
    const openBrowser = browser
    const openServer = server
    return {
      page,
      errors,
      close: () => closeOverlay({ browser: openBrowser, server: openServer }),
    }
  } catch (error) {
    await closeOverlay({ browser, server }).catch(() => {})
    throw error
  }
}

/** Closes the browser, then the Vite server, whichever were started. */
async function closeOverlay({
  browser,
  server,
}: {
  browser: Browser | undefined
  server: ViteDevServer | undefined
}): Promise<void> {
  try {
    await browser?.close()
  } finally {
    await server?.close()
  }
}

/** Where a board point is on screen, in page pixels. */
export async function screenPointOf({
  page,
  x,
  y,
}: {
  page: Page
  x: number
  y: number
}): Promise<Point> {
  return page.evaluate(
    ({ x, y }) => {
      const group = document.querySelector(
        ".pcb-local-skew-overlay g",
      ) as SVGGElement
      const point = new DOMPoint(x, y).matrixTransform(group.getScreenCTM()!)
      return { x: point.x, y: point.y }
    },
    { x, y },
  )
}

/** RGB colour `[red, green, blue]` read from a page screenshot. */
export type RgbPixel = [red: number, green: number, blue: number]

/** Samples rendered screenshot pixels at the given page coordinates. */
export async function screenshotPixelsAt({
  page,
  points,
}: {
  page: Page
  points: Point[]
}): Promise<RgbPixel[]> {
  const png = (await page.screenshot()).toString("base64")
  return page.evaluate(
    async ({ png, points }) => {
      const image = new Image()
      image.src = `data:image/png;base64,${png}`
      await image.decode()
      const canvas = document.createElement("canvas")
      canvas.width = image.width
      canvas.height = image.height
      const ctx = canvas.getContext("2d")!
      ctx.drawImage(image, 0, 0)
      return points.map((point) =>
        Array.from(
          ctx.getImageData(Math.floor(point.x), Math.floor(point.y), 1, 1).data,
        ).slice(0, 3),
      ) as [number, number, number][]
    },
    { png, points },
  )
}
