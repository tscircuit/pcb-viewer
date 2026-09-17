import assert from "node:assert/strict"
import { createServer } from "vite"
import { chromium } from "playwright"
import { fileURLToPath } from "node:url"
import { writeFile, mkdir } from "node:fs/promises"
const root = fileURLToPath(new URL("../../", import.meta.url))
const server = await createServer({
  root,
  server: { host: "127.0.0.1", port: 0 },
  logLevel: "error",
})
await server.listen()
let browser
try {
  browser = await chromium.launch({
    headless: true,
    args: ["--enable-unsafe-webgpu"],
    ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE }
      : {}),
  })
  const errors: string[] = []
  const page = await browser.newPage({ viewport: { width: 800, height: 600 } })
  page.on("pageerror", (e) => {
    errors.push(e.message)
    console.error(e.message)
  })
  const open = async () => {
    await page.goto(`${server.resolvedUrls!.local[0]}tests/webgpu/`)
    await page.waitForFunction(() => window.gpuViewerTest)
  }
  await open()
  await page.evaluate(() => window.gpuViewerTest.mount(false, "webgpu", true))
  await page.waitForFunction(
    () => window.gpuViewerTest.stats.frames > 0,
    null,
    { timeout: 30000 },
  )
  assert.equal(await page.locator(".pcb-webgpu-canvas").count(), 1)
  assert.equal(await page.locator("[data-webgpu-fallback]").count(), 0)
  assert.deepEqual(
    await page.evaluate(() => window.gpuViewerTest.stats.errors),
    [],
  )
  await page.evaluate(() => window.gpuViewerTest.unmount())
  const disposed = await page.evaluate(() => window.gpuViewerTest.stats)
  assert.equal(
    disposed.created,
    disposed.terminated,
    "StrictMode/unmount must release every worker",
  )

  await open()
  await page.evaluate(() => window.gpuViewerTest.mount(true))
  await page.waitForFunction(
    () => window.gpuViewerTest.stats.frames > 0,
    null,
    { timeout: 60000 },
  )
  const initial = await page.evaluate(() => window.gpuViewerTest.stats)
  assert.equal(initial.geometryUploads, 1)
  assert.deepEqual(initial.errors, [])
  assert.equal(await page.locator("[data-webgpu-fallback]").count(), 0)
  const metadata = await page.evaluate(() =>
    window.gpuViewerTest.metadataBenchmark(),
  )
  await page.mouse.move(400, 300)
  const navigation = await page.evaluate(async () => {
    const target = document.querySelector(".pcb-webgpu-canvas")!,
      samples = [],
      startFrames = window.gpuViewerTest.stats.frames
    let previous = performance.now()
    for (let i = 0; i < 60; i++) {
      await new Promise(requestAnimationFrame)
      const now = performance.now()
      samples.push(now - previous)
      previous = now
      target.dispatchEvent(
        new WheelEvent("wheel", {
          deltaY: -2,
          clientX: 400,
          clientY: 300,
          bubbles: true,
          cancelable: true,
        }),
      )
    }
    samples.sort((a, b) => a - b)
    return {
      p95FrameMs: samples[57],
      maxFrameMs: samples.at(-1),
      gpuFramesDuringZoom: window.gpuViewerTest.stats.frames - startFrames,
    }
  })
  await page.waitForTimeout(200)
  const after = await page.evaluate(() => window.gpuViewerTest.stats)
  assert.equal(
    after.geometryUploads,
    1,
    "navigation must not recompile/upload geometry",
  )
  assert(
    navigation.gpuFramesDuringZoom > 10,
    "GPU should render sharp geometry during zoom, not wait for a settled snapshot",
  )
  await mkdir(new URL("./actual/", import.meta.url), { recursive: true })
  await page.screenshot({
    path: fileURLToPath(new URL("./actual/am3352-webgpu.png", import.meta.url)),
  })
  await page.setViewportSize({ width: 1000, height: 700 })
  await page.evaluate(() => {
    document.getElementById("root")!.style.width = "950px"
  })
  await page.waitForFunction(
    (before) => window.gpuViewerTest.stats.frames > before,
    after.frames,
  )
  assert.equal(
    (await page.evaluate(() => window.gpuViewerTest.stats)).created,
    1,
    "resize must reuse the worker",
  )

  await open()
  await page.evaluate(() =>
    window.gpuViewerTest.mount(false, "webgpu", false, true),
  )
  await page.waitForSelector("[data-webgpu-fallback]", { timeout: 30000 })
  assert.equal(await page.locator(".pcb-webgpu-canvas").count(), 0)
  assert(await page.locator(".pcb-layer-top").count())
  await open()
  await page.evaluate(() => {
    Object.defineProperty(navigator, "gpu", {
      configurable: true,
      value: undefined,
    })
    return window.gpuViewerTest.mount()
  })
  await page.waitForSelector("[data-webgpu-fallback]")
  assert(await page.locator(".pcb-layer-top").count())
  await open()
  await page.evaluate(() => window.gpuViewerTest.mount(false, "canvas"))
  await page.waitForSelector(".pcb-layer-top")
  assert.equal(
    (await page.evaluate(() => window.gpuViewerTest.stats)).created,
    0,
  )
  assert.deepEqual(errors, [])
  const report = { initial, metadata, navigation, after }
  await writeFile(
    new URL("./actual/report.json", import.meta.url),
    JSON.stringify(report, null, 2),
  )
  console.log(JSON.stringify(report, null, 2))
} finally {
  await browser?.close()
  await server.close()
}
