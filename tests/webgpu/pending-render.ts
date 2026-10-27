import assert from "node:assert/strict"
import { fileURLToPath } from "node:url"
import { chromium } from "playwright"
import { createServer } from "vite"
import { createPendingCircuit } from "./pending-circuit"

const root = fileURLToPath(new URL("../../", import.meta.url))
const scenes = await Promise.all([
  createPendingCircuit(),
  createPendingCircuit(true),
])
assert(
  scenes.every((scene) =>
    scene.some((element) => element.type === "pcb_smtpad"),
  ),
)
const server = await createServer({
  root,
  resolve: {
    alias: [{ find: "../../src/index", replacement: `${root}dist/index.js` }],
  },
  plugins: [
    {
      name: "pending-circuit",
      configureServer(server) {
        server.middlewares.use((request, response, next) => {
          const index =
            request.url === "/pending-first"
              ? 0
              : request.url === "/pending-second"
                ? 1
                : -1
          if (index < 0) return next()
          response.setHeader("Content-Type", "application/json")
          response.end(JSON.stringify(scenes[index]))
        })
      },
    },
  ],
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
  await page.goto(
    `${server.resolvedUrls!.local[0]}tests/webgpu/?scenario=pending-render&circuitJsonUrl=/pending-first`,
  )
  await page.waitForFunction(() => window.gpuViewerTest.stats.ready === 1)
  assert.equal(await page.locator(".pcb-webgpu-canvas").count(), 1)
  assert.equal(await page.evaluate(() => window.gpuViewerTest.stats.frames), 0)
  await page
    .getByRole("status")
    .getByText("Rendering PCB", { exact: false })
    .waitFor({ timeout: 3000 })
  await page.evaluate(() => window.gpuViewerTest.finishPendingRender())
  await page.waitForFunction(
    () => window.gpuViewerTest.stats.renderCompletions === 1,
  )
  assert.equal(await page.getByRole("status").count(), 0)

  await page.evaluate(() =>
    window.gpuViewerTest.mount(
      false,
      "webgpu",
      false,
      false,
      "/pending-second",
    ),
  )
  await page.waitForFunction(
    () => window.gpuViewerTest.stats.latestSubmittedSceneGeneration > 1,
  )
  await page
    .getByRole("status")
    .getByText("Rendering PCB", { exact: false })
    .waitFor({ timeout: 3000 })
  await page.mouse.click(400, 300, { button: "right" })
  await page.getByRole("menuitem", { name: "Rendering Engine" }).click()
  await page.getByRole("menuitemradio", { name: "Canvas", exact: true }).click()
  await page.waitForSelector(".pcb-layer-top")
  assert.equal(await page.getByRole("status").count(), 0)
  const { created, terminated } = await page.evaluate(
    () => window.gpuViewerTest.stats,
  )
  assert.equal(
    created,
    terminated,
    "switching to Canvas releases the pending worker",
  )
  console.log(
    "Pending WebGPU render status, completion, scene changes and Canvas selection passed",
  )
} finally {
  await browser?.close()
  await server.close()
}
