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
const browser = await chromium.launch({
  headless: true,
  ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
    ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE }
    : {}),
})
try {
  const page = await browser.newPage({ viewport: { width: 800, height: 600 } })
  const errors: string[] = []
  page.on("pageerror", (error) => errors.push(error.message))
  const gpu = process.env.XRAY_TEST_GPU === "1"
  const activeXRay = '.pcb-x-ray-net, [data-x-ray-net-active="true"]'
  const load = async (query = "") => {
    await page.goto(
      `${server.resolvedUrls!.local[0]}tests/copper-pour-x-ray/?${query}${gpu ? "&gpu" : ""}`,
    )
    await page.waitForSelector(gpu ? ".pcb-webgpu-canvas" : ".pcb-layer-top")
  }
  const menuAt = async (x: number, y: number, name?: string) => {
    await page.mouse.click(400 + 15 * x, 300 - 15 * y, { button: "right" })
    await page
      .getByRole("menu", { name: "PCB context menu", exact: true })
      .waitFor()
    const items = page.getByRole("menuitem").filter({ hasText: /^X-Ray / })
    if (name) assert.equal(await items.first().textContent(), `X-Ray ${name}`)
    else assert.equal(await items.count(), 0)
  }
  const alphaAt = (x: number, y: number) =>
    page.locator(activeXRay).evaluate(
      (canvas, point) => {
        const original =
          canvas instanceof HTMLCanvasElement
            ? canvas
            : canvas.querySelector<HTMLCanvasElement>("canvas")!
        const scratch = document.createElement("canvas")
        scratch.width = original.width
        scratch.height = original.height
        const ctx = scratch.getContext("2d")!
        ctx.drawImage(original, 0, 0)
        return ctx.getImageData(400 + 15 * point.x, 300 - 15 * point.y, 1, 1)
          .data[3]
      },
      { x, y },
    )
  await load()
  await menuAt(-10, 6, "GND")
  await page.getByRole("menuitem", { name: "X-Ray GND", exact: true }).click()
  await page.waitForSelector(activeXRay)
  assert((await alphaAt(-10, 6)) > 0, "connected pours appear in X-Ray")
  assert(
    (await alphaAt(-10, -2)) > 0,
    "connected bottom pour appears even when other layers are hidden",
  )
  assert((await alphaAt(7, 5)) > 0, "connected polygon appears in X-Ray")
  assert.equal(await alphaAt(0, 0), 0, "BRep holes remain clear in X-Ray")
  await page.keyboard.press("Escape")
  await menuAt(7, 5, "GND")
  await page.keyboard.press("Escape")
  await menuAt(11, 7)
  await page.keyboard.press("Escape")
  await menuAt(0, 0)
  await page.keyboard.press("Escape")
  await menuAt(2, 0, "GND")
  await page.keyboard.press("Escape")
  await menuAt(10, -11, "GND")
  await page.keyboard.press("Escape")
  await menuAt(13, -8)
  await page.keyboard.press("Escape")
  await menuAt(0, 10, "GND")
  await load()
  await menuAt(-10, -8, "GND")
  await page.getByRole("menuitem", { name: "X-Ray GND", exact: true }).click()
  await page.waitForSelector(activeXRay)
  assert(
    (await alphaAt(-10, 6)) > 0,
    "X-Ray from a trace also includes connected pours",
  )
  await page.keyboard.press("Escape")
  await load()
  await page.mouse.move(650, 180)
  await page.keyboard.press("2")
  await menuAt(-10, 6, "VCC")
  await page.getByRole("menuitem", { name: "X-Ray VCC", exact: true }).click()
  await page.waitForSelector(activeXRay)
  assert(
    (await alphaAt(-10, 6)) > 0,
    "selected inner-layer pour appears in X-Ray",
  )
  assert.equal(await alphaAt(7, 5), 0, "unrelated pours excluded")
  await page.keyboard.press("Escape")
  await menuAt(7, 5)
  for (const query of ["hidden", "transparent"]) {
    await load(query)
    await menuAt(-10, 6)
    await page.keyboard.press("Escape")
    await menuAt(-10, -8, "GND")
    await page.getByRole("menuitem", { name: "X-Ray GND", exact: true }).click()
    await page.waitForSelector(activeXRay)
    assert.equal(
      await alphaAt(-10, 6),
      0,
      "hidden pours stay hidden during X-Ray",
    )
  }
  assert.deepEqual(errors, [])
  console.log("Copper pour X-Ray browser checks passed")
} finally {
  await browser.close()
  await server.close()
}
