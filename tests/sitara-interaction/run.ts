import assert from "node:assert/strict"
import { fileURLToPath } from "node:url"
import { chromium } from "playwright"
import { createServer } from "vite"

const root = fileURLToPath(new URL("../../", import.meta.url))
const server = await createServer({
  root,
  resolve: {
    alias: [{ find: "../../src", replacement: `${root}dist/index.js` }],
  },
  server: { host: "127.0.0.1", port: 41739 },
  logLevel: "error",
})

await server.listen()
const browser = await chromium.launch({
  headless: true,
  args: ["--enable-unsafe-webgpu"],
  ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
    ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE }
    : {}),
})

try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 800 } })
  const testUrl = new URL(
    "tests/sitara-interaction/",
    server.resolvedUrls!.local[0],
  )
  await page.goto(testUrl.href)
  await page.waitForFunction(() => window.sitaraInteractionTest)
  await page.evaluate(() => window.sitaraInteractionTest.mount())
  await page.waitForFunction(
    () => window.sitaraInteractionTest.stats.firstPaintMs !== null,
    null,
    { timeout: 60_000 },
  )

  const viewer = page.locator("[data-pcb-viewer]")
  const bounds = await viewer.boundingBox()
  assert(bounds, "PCB viewer must be visible")
  const centerX = bounds.x + bounds.width / 2
  const centerY = bounds.y + bounds.height / 2
  const hoverStartedAt = performance.now()
  await page.mouse.move(centerX, centerY)
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  )
  const hoverMs = performance.now() - hoverStartedAt
  const hoverStats = await page.evaluate(
    () => window.sitaraInteractionTest.stats,
  )
  await page.evaluate(() => {
    window.sitaraInteractionTest.stats.interactionCommitCount = 0
    window.sitaraInteractionTest.stats.interactionRenderMs = 0
    window.sitaraInteractionTest.stats.maxInteractionRenderMs = 0
  })

  const zoomStartedAt = performance.now()
  for (let index = 0; index < 20; index++) {
    await page.mouse.wheel(0, -10)
  }
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  )
  const zoomMs = performance.now() - zoomStartedAt

  const panStartedAt = performance.now()
  await page.mouse.move(centerX, centerY)
  await page.mouse.down()
  await page.mouse.move(centerX + 200, centerY + 100, { steps: 20 })
  await page.mouse.up()
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  )
  const panMs = performance.now() - panStartedAt

  const stats = await page.evaluate(() => window.sitaraInteractionTest.stats)
  assert.equal(stats.elementCount, 100_548)
  assert(stats.frames > 0)
  console.log(
    JSON.stringify(
      {
        firstPaintMs: Math.round(stats.firstPaintMs!),
        hoverMs: Math.round(hoverMs),
        hoverRenderMs: Math.round(hoverStats.interactionRenderMs),
        maxHoverRenderMs: Math.round(hoverStats.maxInteractionRenderMs),
        interactionCommitCount: stats.interactionCommitCount,
        interactionRenderMs: Math.round(stats.interactionRenderMs),
        maxInteractionRenderMs: Math.round(stats.maxInteractionRenderMs),
        zoomMs: Math.round(zoomMs),
        panMs: Math.round(panMs),
      },
      null,
      2,
    ),
  )
} finally {
  await browser.close()
  await server.close()
}
