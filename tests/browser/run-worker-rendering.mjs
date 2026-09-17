import assert from "node:assert/strict"
import { fileURLToPath } from "node:url"
import { resolve } from "node:path"
import { chromium } from "playwright"
import { createServer } from "vite"

const root = fileURLToPath(new URL("../../", import.meta.url))
const server = await createServer({
  root,
  configFile: resolve(root, "vite.config.ts"),
  server: { host: "127.0.0.1", port: 0 },
  logLevel: "error",
})
await server.listen()
const url = `http://127.0.0.1:${server.httpServer.address().port}`
let browser
try {
  browser = await chromium.launch({
    headless: true,
    ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE }
      : {}),
  })
  const page = await browser.newPage({ viewport: { width: 800, height: 600 } })
  const errors = []
  page.on("pageerror", (error) => {
    errors.push(error.message)
    console.error(error.message)
  })
  await page.goto(`${url}/tests/browser/worker-rendering.html`)
  await page.waitForFunction(() => window.validation)
  const waitForImages = (count) =>
    page.waitForFunction(
      (count) => window.validation.stats.images >= count,
      count,
      { timeout: 60000 },
    )

  await page.evaluate(() => window.validation.setup())
  await waitForImages(12)
  let stats = await page.evaluate(() => window.validation.stats)
  assert.equal(stats.workers, 4)
  assert(
    stats.scenes >= 1 && stats.scenes <= 4,
    "send the scene at most once per worker",
  )
  assert.equal(
    stats.rasterCalls,
    0,
    "PCB geometry must never draw on the main thread in worker mode",
  )
  assert(
    stats.drawImages <= stats.images,
    "only repaint layers whose images have changed",
  )
  assert.deepEqual(stats.errors, [])
  assert.equal(
    (await page.evaluate(() => window.validation.parity())).compared,
    16,
  )

  for (const failure of [undefined, "constructor", "runtime", "unsupported"]) {
    await page.evaluate(
      (failure) =>
        window.validation.setup("small", failure ? 4 : 0, 2, failure),
      failure,
    )
    await page.waitForFunction(() => window.validation.pixelCount("top") > 0)
    stats = await page.evaluate(() => window.validation.stats)
    assert(
      stats.rasterCalls > 0,
      `fallback must produce images (${failure ?? "workerCount: 0"})`,
    )
  }
  // The worker runtime exception is expected and does not escape onto the page.
  assert.deepEqual(errors, [])

  const setup = await page.evaluate(() => window.validation.setup("am3352"))
  await waitForImages(16)
  await page.waitForTimeout(300)
  const navigation = await page.evaluate(async () => {
    const v = window.validation,
      startRenders = v.stats.renders,
      startRaster = v.stats.rasterCalls
    const frames = []
    let previous = performance.now()
    for (let i = 0; i < 90; i++) {
      await new Promise(requestAnimationFrame)
      const now = performance.now()
      frames.push(now - previous)
      previous = now
      const zoom = 4 * (1 + i / 60)
      v.setView({ a: zoom, b: 0, c: 0, d: -zoom, e: 400 + i, f: 300 })
    }
    frames.sort((a, b) => a - b)
    return {
      newRequests: v.stats.renders - startRenders,
      rasterCalls: v.stats.rasterCalls - startRaster,
      p95FrameMs: frames[Math.floor(frames.length * 0.95)],
      maxFrameMs: frames.at(-1),
      initialImages: v.stats.images,
    }
  })
  assert.equal(
    navigation.newRequests,
    0,
    "wait for zoom to settle before requesting images",
  )
  assert.equal(navigation.rasterCalls, 0)
  await waitForImages(navigation.initialImages + 16)
  const parity = await page.evaluate(() => window.validation.parity())
  assert.equal(parity.compared, 20)
  assert.deepEqual(
    await page.evaluate(() => window.validation.stats.errors),
    [],
  )
  console.log(JSON.stringify({ setup, navigation, parity }, null, 2))
  await page.evaluate(() => window.validation.dispose())

  await page.goto(`${url}/tests/browser/worker-component.html`)
  await page.waitForFunction(() => window.componentValidation)
  await page.evaluate(() => window.componentValidation.mount())
  await page.waitForFunction(
    () => window.componentValidation.stats.images >= 1,
    null,
    { timeout: 60000 },
  )
  stats = await page.evaluate(() => window.componentValidation.stats)
  assert.equal(stats.created, 4, "public PCBViewer defaults to four workers")
  await page.evaluate(() => window.componentValidation.mount(2))
  await page.waitForFunction(
    () => window.componentValidation.stats.created === 6,
  )
  assert.equal(
    (await page.evaluate(() => window.componentValidation.stats)).terminated,
    4,
  )
  await page.evaluate(() => window.componentValidation.mount(0))
  await page.waitForFunction(
    () => window.componentValidation.stats.terminated === 6,
  )
  await page.evaluate(() => window.componentValidation.unmount())
  assert.deepEqual(errors, [])
  console.log(
    "Worker rendering browser checks passed (including the published bundle).",
  )
} finally {
  await browser?.close()
  await server.close()
}
