import assert from "node:assert/strict"
import { createServer } from "vite"
import { chromium } from "playwright"
import { fileURLToPath } from "node:url"

const root = fileURLToPath(new URL("../../", import.meta.url))
const server = await createServer({
  root,
  resolve: {
    alias: [{ find: "../../src/index", replacement: `${root}dist/index.js` }],
  },
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
  const page = await browser.newPage({ viewport: { width: 1000, height: 700 } })
  const errors: string[] = []
  page.on("pageerror", (e) => errors.push(e.message))
  const choose = async (value: string) => {
    await page.mouse.click(300, 300, { button: "right" })
    await page
      .getByRole("menuitem", { name: "Visibility", exact: false })
      .filter({ hasText: /^Visibility/ })
      .click()
    await page.getByRole("menuitem", { name: "Copper Pour Visibility" }).click()
    await page
      .getByRole("menu", { name: "Copper Pour Visibility", exact: true })
      .getByRole("menuitemradio", { name: value, exact: true })
      .click()
  }
  const load = async (renderer: "webgpu" | "canvas") => {
    await page.goto(`${server.resolvedUrls!.local[0]}tests/webgpu/`)
    await page.waitForFunction(() => window.gpuViewerTest)
    await page.evaluate(
      (engine) => window.gpuViewerTest.mount(false, engine),
      renderer,
    )
    if (renderer === "webgpu")
      await page.waitForFunction(() => window.gpuViewerTest.stats.frames > 0)
    else await page.waitForSelector(".pcb-layer-top")
  }
  await load("webgpu")
  await choose("40%")
  await page.waitForFunction(
    () =>
      window.gpuViewerTest.stats.lastView?.options.copperPourOpacity === 0.4,
  )
  const stats = await page.evaluate(() => window.gpuViewerTest.stats)
  assert.equal(stats.geometryUploads, 1)
  assert.equal(stats.created, 1)
  assert.equal(stats.lastView?.options.showCopperPours, true)
  assert.equal(
    await page.evaluate(() =>
      localStorage.getItem("pcb_viewer_copper_pour_opacity"),
    ),
    "0.4",
  )
  await choose("Hide")
  await page.waitForFunction(
    () =>
      window.gpuViewerTest.stats.lastView?.options.showCopperPours === false,
  )
  // Reload and switch engines: both visibility and opacity preferences persist.
  await load("canvas")
  const alphaCounts = () =>
    page.evaluate(() => {
      const canvas =
        document.querySelector<HTMLCanvasElement>(".pcb-layer-top")!
      const data = canvas
        .getContext("2d")!
        .getImageData(0, 0, canvas.width, canvas.height).data
      const counts = new Array<number>(256).fill(0)
      for (let i = 3; i < data.length; i += 4) counts[data[i]]++
      return counts
    })
  assert(
    (await alphaCounts())[51] < 1000,
    "Hidden pours must not leave a filled area",
  )
  await choose("40%")
  await page.waitForFunction(
    () => localStorage.getItem("pcb_viewer_is_showing_copper_pours") === "true",
  )
  await page.waitForFunction(() => {
    const canvas = document.querySelector<HTMLCanvasElement>(".pcb-layer-top")!
    return canvas
      .getContext("2d")!
      .getImageData(0, 0, canvas.width, canvas.height)
      .data.some((value, i) => i % 4 === 3 && value === 51)
  })
  const faded = await alphaCounts()
  assert(
    faded[51] > 1000,
    "Canvas must fade the pour to 40% of its default alpha",
  )
  assert(faded[255] > 1000, "Pads must remain opaque")
  await choose("100%")
  const full = await alphaCounts()
  assert(full[128] > 1000, "100% restores the default Canvas pour alpha")
  assert.equal(full[255], faded[255], "Pour changes must not alter pads")
  await choose("Hide")
  const hidden = await alphaCounts()
  assert(hidden[128] < 1000, "Hiding pours must clear their filled area")
  assert.equal(hidden[255], faded[255])
  assert.deepEqual(errors, [])
  console.log(
    "Copper-pour opacity: WebGPU updates without geometry uploads; Canvas pixels, visibility toggles, and persistence passed.",
  )
} finally {
  await browser?.close()
  await server.close()
}
