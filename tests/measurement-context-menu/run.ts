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
  const page = await browser.newPage({ viewport: { width: 800, height: 600 } })
  const errors: string[] = []
  page.on("pageerror", (error) => errors.push(error.message))
  const assertNoMenu = async () => {
    assert.equal(await page.getByRole("menu").count(), 0)
  }
  for (const activation of ["d", "button"]) {
    for (const button of ["left", "right"] as const) {
      await page.goto(`${server.resolvedUrls!.local[0]}tests/x-ray-net/`)
      await page.waitForSelector("canvas")
      // Confirm the point hits a net that normally opens the context menu.
      await page.mouse.click(250, 300)
      await page.getByRole("menu").waitFor()
      await page.keyboard.press("Escape")
      await page.getByRole("menu").waitFor({ state: "hidden" })
      if (activation === "d") {
        await page.mouse.move(250, 300)
        await page.keyboard.press("d")
      } else {
        await page.getByText("📏", { exact: true }).click()
        // The first click starts a measurement and disarms the toolbar button.
        await page.mouse.click(250, 300, { button })
        await assertNoMenu()
      }
      // Finish, then dismiss the measurement without opening a menu.
      await page.mouse.click(295, 300, { button })
      await assertNoMenu()
      await page.mouse.click(295, 300, { button })
      await assertNoMenu()
      // Once the measurement is dismissed, ordinary menu behavior resumes.
      await page.mouse.click(250, 300, { button })
      await page.getByRole("menu").waitFor()
    }
  }
  assert.deepEqual(errors, [])
  console.log(
    "Measurement clicks do not open context menus; normal clicks still do.",
  )
} finally {
  await browser.close()
  await server.close()
}
