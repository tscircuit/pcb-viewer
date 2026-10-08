import assert from "node:assert/strict"
import { fileURLToPath } from "node:url"
import { chromium } from "playwright"
import { createServer } from "vite"

const root = fileURLToPath(new URL("../../", import.meta.url))
const key = "pcb_viewer_rendering_engine"
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
  const page = await browser.newPage({ viewport: { width: 800, height: 600 } })
  const errors: string[] = []
  page.on("pageerror", (error) => errors.push(error.message))
  const load = async () => {
    await page.goto(`${server.resolvedUrls!.local[0]}tests/webgpu/`)
    await page.waitForFunction(() => window.gpuViewerTest)
  }
  const mount = async (renderer: "canvas" | "webgpu" | null = null) => {
    await page.evaluate(
      (engine) => window.gpuViewerTest.mount(false, engine),
      renderer,
    )
  }
  const openMenu = async () => {
    await page.mouse.click(400, 300, { button: "right" })
    await page.getByRole("menuitem", { name: "Rendering Engine" }).click()
  }
  const name = (engine: "canvas" | "webgpu") =>
    engine === "canvas" ? "Canvas" : "WebGPU (experimental)"
  const expectEngine = async (engine: "canvas" | "webgpu") => {
    await openMenu()
    assert.equal(
      await page
        .getByRole("menuitemradio", { name: name(engine), exact: true })
        .getAttribute("aria-checked"),
      "true",
      `${engine} must remain selected`,
    )
    await page.keyboard.press("Escape")
    await page
      .getByRole("menu", { name: "PCB context menu", exact: true })
      .waitFor({ state: "detached" })
  }
  const choose = async (engine: "canvas" | "webgpu") => {
    await openMenu()
    await page
      .getByRole("menuitemradio", { name: name(engine), exact: true })
      .click()
  }
  const stored = () => page.evaluate((key) => localStorage.getItem(key), key)

  await load()
  await mount()
  await expectEngine("webgpu")

  // Exercise both directions through the real menu and a fresh page/viewer.
  for (const engine of ["canvas", "webgpu"] as const) {
    await choose(engine)
    assert.equal(await stored(), JSON.stringify(engine))
    await load()
    await mount()
    await expectEngine(engine)
    assert.equal(await stored(), JSON.stringify(engine))
  }

  await choose("canvas")
  await load()
  await mount("webgpu")
  await expectEngine("webgpu")
  assert.equal(
    await stored(),
    '"canvas"',
    "props must not overwrite preferences",
  )
  await mount("canvas")
  await expectEngine("canvas")
  await choose("webgpu")
  await mount("canvas")
  await expectEngine("webgpu") // A stable prop must not undo a user selection.
  await mount("webgpu")
  await expectEngine("webgpu")
  await mount("canvas")
  await expectEngine("canvas") // Changing the prop still resets the engine.
  assert.equal(await stored(), '"webgpu"')
  await mount()
  await expectEngine("webgpu") // Removing the override restores the preference.

  for (const invalid of ["invalid JSON", '"pixi"', "null", "true", "1", "{}"]) {
    await load()
    await page.evaluate(({ key, value }) => localStorage.setItem(key, value), {
      key,
      value: invalid,
    })
    await mount()
    await expectEngine("webgpu")
  }

  await load()
  await page.evaluate(() => {
    Storage.prototype.getItem = () => {
      throw new Error("Storage unavailable")
    }
    Storage.prototype.setItem = () => {
      throw new Error("Storage unavailable")
    }
  })
  await mount()
  await expectEngine("webgpu")
  await choose("canvas")
  await expectEngine("canvas")
  await page.waitForSelector(".pcb-layer-top")
  await choose("webgpu")
  await expectEngine("webgpu")
  assert.deepEqual(errors, [])
  console.log(
    "Rendering engine preference: both directions, reloads, prop overrides, invalid values, and unavailable storage passed.",
  )
} finally {
  await browser?.close()
  await server.close()
}
