import assert from "node:assert/strict"
import { fileURLToPath } from "node:url"
import { chromium } from "playwright"
import { createServer } from "vite"
import { CHECK_SHORTS_MODULE_URL } from "../../src/lib/check-shorts/load-check-shorts-module"

// Stands in for the CDN module so the test doesn't depend on the network.
const checkShortsModuleStub = `
  window.checkShortsCalls = []
  export const findBitmapShorts = async (circuitJson, options) => {
    window.checkShortsCalls.push(options)
    if (options.layer !== "top") return []
    return [{
      mode: options.mode,
      layer: "top",
      firstConnectivityKey: "connectivity_net0",
      secondConnectivityKey: "connectivity_net1",
      pixelCount: 12,
      center: { x: -10, y: -4 },
      firstOwnerLabels: ["U1.CLK"],
      secondOwnerLabels: ["U2.DATA"],
    }]
  }
`

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
  const checkForShorts = async () => {
    await page.mouse.click(650, 180, { button: "right" })
    await page
      .getByRole("menuitem", { name: "Check for Shorts", exact: true })
      .click()
  }
  const url = `${server.resolvedUrls!.local[0]}tests/check-shorts/`

  // The checker is loaded from the CDN on demand and its shorts become errors.
  await page.route(CHECK_SHORTS_MODULE_URL, (route) =>
    route.fulfill({
      contentType: "application/javascript",
      headers: { "access-control-allow-origin": "*" },
      body: checkShortsModuleStub,
    }),
  )
  await page.goto(url)
  await page.waitForSelector("canvas")
  await page.getByText("0 errors", { exact: true }).waitFor()
  await checkForShorts()
  await page.getByText("1 short detected", { exact: true }).waitFor()
  await page.getByText("1 errors", { exact: true }).click()
  await page
    .getByText("Short on top layer: U1.CLK is touching U2.DATA")
    .first()
    .waitFor()
  assert.deepEqual(
    await page.evaluate(() => (window as any).checkShortsCalls),
    ["top", "inner1", "inner2", "bottom"].map((layer) => ({
      mode: "pcb",
      layer,
    })),
  )

  // A checker that can't be loaded is reported without breaking the viewer.
  await page.unroute(CHECK_SHORTS_MODULE_URL)
  await page.route(CHECK_SHORTS_MODULE_URL, (route) =>
    route.fulfill({ status: 500, body: "Internal server error" }),
  )
  await page.goto(url)
  await page.waitForSelector("canvas")
  await checkForShorts()
  await page.getByText(/^Couldn't check for shorts: /).waitFor()
  await page.getByText("0 errors", { exact: true }).waitFor()

  assert.deepEqual(errors, [])
  console.log(
    "Check for Shorts loads the checker on demand and lists its shorts.",
  )
} finally {
  await browser.close()
  await server.close()
}
