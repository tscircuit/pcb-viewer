import { fileURLToPath } from "node:url"
import type { Point } from "@tscircuit/math-utils"
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

/** A point off the board, for moving the pointer out of the way. */
export const OFF_BOARD_POINT: Point = { x: 590, y: 390 }

/** Opens a board in Chromium with the given viewer state; by default the compensated differential pair. */
export async function openOverlayPage({
  initialState,
  circuitJson = renderDifferentialPairBoard({ compensated: true }),
}: {
  initialState: OverlayInitialState
  /** Rendered from a TSX fixture through core. */
  circuitJson?: CircuitJson
}): Promise<OverlayPage> {
  const server: ViteDevServer = await createServer({
    root: fileURLToPath(new URL("../../", import.meta.url)),
    server: { host: "127.0.0.1", port: 0 },
    logLevel: "error",
  })
  await server.listen()
  const launchOptions: LaunchOptions = { headless: true }
  if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE) {
    launchOptions.executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
  }
  const browser: Browser = await chromium.launch(launchOptions)
  const page = await browser.newPage({ viewport: { width: 600, height: 400 } })
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
  await page.goto(`${server.resolvedUrls!.local[0]}tests/local-skew-overlay/`)
  await page.waitForSelector(".pcb-layer-top", { state: "attached" })
  return {
    page,
    errors,
    close: async () => {
      await browser.close()
      await server.close()
    },
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
