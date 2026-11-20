import { fileURLToPath } from "node:url"
import type { CircuitJson } from "circuit-json"
import {
  type Browser,
  type LaunchOptions,
  type Page,
  chromium,
} from "playwright"
import { type ViteDevServer, createServer } from "vite"
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

/** Opens a board in Chromium with the given viewer state; by default the compensated differential pair. */
export async function openOverlayPage({
  initialState,
  circuitJson = renderDifferentialPairBoard({ compensated: true }),
}: {
  initialState: OverlayInitialState
  /** Rendered from a TSX fixture through core. */
  circuitJson?: CircuitJson
}): Promise<OverlayPage> {
  let server: ViteDevServer | undefined
  let browser: Browser | undefined
  try {
    // Port 0 lets the operating system pick a free port when Vite binds.
    server = await createServer({
      root: fileURLToPath(new URL("../../", import.meta.url)),
      server: { host: "127.0.0.1", port: 0, strictPort: true },
      logLevel: "error",
    })
    await server.listen()
    const [baseUrl] = server.resolvedUrls?.local ?? []
    const launchOptions: LaunchOptions = { headless: true }
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
      ({ circuitJson, state }) => {
        window.localSkewCircuitJson = circuitJson
        window.localSkewInitialState = state
      },
      {
        circuitJson,
        state: initialState,
      },
    )
    await page.goto(`${baseUrl}tests/local-skew-overlay/`)
    await page
      .locator('#root[data-rendered="true"]')
      .waitFor({ state: "attached" })
    await page.waitForFunction(() => {
      const board =
        document.querySelector<HTMLCanvasElement>(".pcb-layer-board")
      return board?.width === 600
    })
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
