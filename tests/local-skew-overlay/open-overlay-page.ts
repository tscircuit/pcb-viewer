import { createServer as createTcpServer } from "node:net"
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
  const host = "127.0.0.1"
  const port = await new Promise<number>((resolve, reject) => {
    const probe = createTcpServer().once("error", reject)
    probe.listen(0, host, () => {
      const { port } = probe.address() as { port: number }
      probe.close((error) => (error ? reject(error) : resolve(port)))
    })
  })

  let server: ViteDevServer | undefined
  let browser: Browser | undefined
  const close = async () => {
    try {
      await browser?.close()
    } finally {
      await server?.close()
    }
  }

  try {
    server = await createServer({
      root: fileURLToPath(new URL("../../", import.meta.url)),
      server: { host, port, strictPort: true },
      logLevel: "error",
    })
    await server.listen()
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
    await page.goto(`http://${host}:${port}/tests/local-skew-overlay/`)
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
    return { page, errors, close }
  } catch (error) {
    await close().catch(() => {})
    throw error
  }
}
