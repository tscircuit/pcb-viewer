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
const browser = await chromium.launch({ headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 800, height: 600 } })
  const errors: string[] = []
  page.on("pageerror", (error) => errors.push(error.message))
  const menu = page.getByRole("menu", { name: "PCB context menu", exact: true })
  const action = page.getByRole("menuitem", {
    name: "↗️ U1 on Schematic",
    exact: true,
  })
  const mpn = page.getByRole("menuitem", {
    name: "Manufacturer part number: ATMEGA328P-AU",
    exact: true,
  })
  for (const query of ["", "no-handler", "no-mpn"]) {
    await page.goto(
      `${server.resolvedUrls!.local[0]}tests/pad-context-menu/?${query}`,
    )
    await page.waitForSelector("canvas")
    // Board fit: 15 px/mm, origin (400, 300). Also test an unconnected pad.
    for (const [x, y] of [
      [250, 300],
      [250, 180],
      [430, 300],
    ]) {
      for (const button of ["left", "right"] as const) {
        await page.mouse.click(x, y, { button })
        await menu.waitFor()
        assert.equal(await action.count(), query === "no-handler" ? 0 : 1)
        assert.equal(await mpn.count(), query === "no-mpn" ? 0 : 1)
        if (query !== "no-mpn") {
          assert(await mpn.isDisabled())
          assert.equal(
            await menu
              .locator(":scope > :last-child")
              .getAttribute("aria-label"),
            "Manufacturer part number: ATMEGA328P-AU",
          )
        }
        if (query !== "no-handler") {
          const count = await page.evaluate(() =>
            Number(document.body.dataset.callbackCount ?? 0),
          )
          await action.click()
          assert.deepEqual(
            await page.evaluate(() =>
              JSON.parse(document.body.dataset.schematicEvent!),
            ),
            {
              source_component_id: "source_u1",
              pcb_component_id: "shared_component",
              refdes: "U1",
            },
          )
          assert.equal(
            await page.evaluate(() =>
              Number(document.body.dataset.callbackCount),
            ),
            count + 1,
          )
          assert.equal(await menu.count(), 0)
        } else {
          // Keyboard navigation must skip the disabled part number and wrap.
          await page.keyboard.press("ArrowUp")
          assert.equal(
            await page.evaluate(() => document.activeElement?.textContent),
            "Rendering Engine ▸",
          )
          await page.keyboard.press("Escape")
        }
      }
    }
    await page.mouse.click(650, 180, { button: "right" })
    await menu.waitFor()
    assert.equal(await action.count(), 0)
    assert.equal(await mpn.count(), 0)
  }
  assert.deepEqual(errors, [])
  console.log("Pad context menu browser tests passed")
} finally {
  await browser.close()
  await server.close()
}
