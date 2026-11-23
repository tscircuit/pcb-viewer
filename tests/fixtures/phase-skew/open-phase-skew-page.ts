import { fileURLToPath } from "node:url"
import type { CircuitJson } from "circuit-json"
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
}: {
  circuitJson: CircuitJson
}): Promise<PhaseSkewPage> {
  // Port 0 lets the operating system pick a free port when Vite binds.
  const server = await createServer({
    root: fileURLToPath(new URL("../../../", import.meta.url)),
    server: { host: "127.0.0.1", port: 0, strictPort: true },
    logLevel: "error",
  })
  await server.listen()
  const launchOptions: LaunchOptions = { headless: true }
  if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE !== undefined) {
    launchOptions.executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
  }
  const browser = await chromium.launch(launchOptions)
  const page = await browser.newPage({
    viewport: { width: VIEWER_WIDTH, height: VIEWER_HEIGHT },
  })
  const errors: string[] = []
  page.on("pageerror", (error) => errors.push(error.message))
  await page.addInitScript((renderedCircuitJson) => {
    window.phaseSkewCircuitJson = renderedCircuitJson
  }, circuitJson)
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
