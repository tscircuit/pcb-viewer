import assert from "node:assert/strict"
import { fileURLToPath } from "node:url"
import { chromium } from "playwright"
import { createServer } from "vite"

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
  const page = await browser.newPage({ viewport: { width: 800, height: 700 } })
  const errors: string[] = []
  page.on("pageerror", (error) => errors.push(error.message))
  await page.goto(`${server.resolvedUrls!.local[0]}tests/component-focus/`)
  const assertFocused = async (id: string) => {
    const outline = page.locator(`[data-focused-pcb-component-id="${id}"]`)
    await outline.waitFor()
    await page.waitForSelector('[data-pending="false"]', { state: "attached" })
    const box = (await outline.boundingBox())!
    assert(
      Math.abs(box.x + box.width / 2 - 400) < 1,
      "focus is horizontally centered",
    )
    const canvas = (await page.locator("canvas").first().boundingBox())!
    assert(
      Math.abs(box.y + box.height / 2 - (canvas.y + 300)) < 1,
      "focus is vertically centered",
    )
  }
  await page.getByRole("button", { name: "Mount and focus U1" }).click()
  await assertFocused("component_0")
  await page.getByRole("button", { name: "Focus U2" }).click()
  await assertFocused("component_1")
  assert.equal(
    await page
      .locator("[data-toolbar-overlay]")
      .getByText("bottom", { exact: true })
      .count(),
    1,
  )
  await page.getByRole("button", { name: "Focus U2" }).click()
  await assertFocused("component_1")
  await page.getByRole("button", { name: "Unmount", exact: true }).click()
  await page.getByRole("button", { name: "Focus U2" }).click()
  await page.waitForSelector('[data-pending="true"]', { state: "attached" })
  await page.getByRole("button", { name: "Mount and focus U1" }).click()
  await assertFocused("component_0")
  await page.clock.install()
  const search = page.getByRole("button", { name: "Search components" })
  const input = page.getByRole("textbox", { name: "Component name" })
  await search.click()
  await input.waitFor()
  assert.equal(
    await input.evaluate((element) => element === document.activeElement),
    true,
  )
  await input.fill(" u ")
  const results = page.getByRole("list", { name: "Matching components" })
  assert.equal(await results.getByRole("button").count(), 2)
  await search.click()
  assert.equal(await input.count(), 0)
  await search.click()
  await input.fill("missing")
  await page.getByText("No matching components.").waitFor()
  await input.fill("u2")
  assert.equal(await results.getByRole("button").count(), 1)
  await results.getByRole("button", { name: "U2 bottom" }).click()
  await assertFocused("component_1")
  assert.equal(await input.count(), 0)
  const focused = page.locator('[data-focused-pcb-component-id="component_1"]')
  const bounds = (await focused.boundingBox())!
  assert(
    bounds.width < 800 * 0.5 && bounds.height < 600 * 0.5,
    "search leaves surrounding context",
  )
  await page.clock.fastForward(2000)
  assert.equal(await focused.count(), 1)
  await search.click()
  await input.fill("u2")
  await input.press("Enter")
  await page.clock.fastForward(2900)
  assert.equal(
    await focused.count(),
    1,
    "reselection restarts highlight duration",
  )
  await page.clock.fastForward(200)
  assert.equal(await focused.count(), 0, "highlight clears after three seconds")
  await search.click()
  await input.press("Escape")
  assert.equal(await input.count(), 0)
  await search.click()
  await page
    .locator("canvas")
    .first()
    .click({ position: { x: 700, y: 500 } })
  assert.equal(await input.count(), 0, "outside click closes search")
  assert.deepEqual(errors, [])
  console.log(
    "PCB focus queues across mounting, changes targets, and acknowledges requests.",
  )
} finally {
  await browser.close()
  await server.close()
}
