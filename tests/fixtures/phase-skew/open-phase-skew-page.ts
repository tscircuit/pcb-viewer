import { type Server, createServer as createHttpServer } from "node:http"
import type { AddressInfo } from "node:net"
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
}: {
  circuitJson: CircuitJson
}): Promise<PhaseSkewPage> {
  const server = await startPhaseSkewServer()
  let browser: Browser | undefined
  try {
    const launchOptions: LaunchOptions = { headless: true }
    if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE !== undefined) {
      launchOptions.executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
    }
    browser = await chromium.launch(launchOptions)
    const page = await browser.newPage({
      viewport: { width: VIEWER_WIDTH, height: VIEWER_HEIGHT },
    })
    const errors: string[] = []
    page.on("pageerror", (error) => errors.push(error.message))
    await page.addInitScript((renderedCircuitJson) => {
      window.phaseSkewCircuitJson = renderedCircuitJson
    }, circuitJson)
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
    // Drop keep-alive connections so close() resolves straight away.
    server.httpServer.closeAllConnections()
    await new Promise<void>((resolve) =>
      server.httpServer.close(() => resolve()),
    )
    await server.vite.close()
  }
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
