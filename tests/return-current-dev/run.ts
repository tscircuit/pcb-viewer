import assert from "node:assert/strict"
import { mkdir, writeFile } from "node:fs/promises"
import { fileURLToPath } from "node:url"
import { chromium } from "playwright"
import { createServer as createViteServer } from "vite"
import { createReturnCurrentDevServer } from "../../scripts/return-current-dev-server"

// An opt-in native test: every invocation submits a fresh real Palace job.
const root = fileURLToPath(new URL("../../", import.meta.url))
let baseUrl = process.env.RETURN_CURRENT_BROWSER_URL
let api: Awaited<ReturnType<typeof createReturnCurrentDevServer>> | undefined
let vite: Awaited<ReturnType<typeof createViteServer>> | undefined
if (!baseUrl) {
  api = await createReturnCurrentDevServer({ projectDirectory: root })
  await new Promise<void>((resolve) => api!.listen(0, "127.0.0.1", resolve))
  const address = api.address()
  assert(address && typeof address === "object")
  vite = await createViteServer({
    root,
    server: {
      host: "127.0.0.1",
      port: 0,
      proxy: { "/api": `http://127.0.0.1:${address.port}` },
    },
    logLevel: "error",
  })
  await vite.listen()
  baseUrl = vite.resolvedUrls!.local[0]
}
const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
  ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
    ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE }
    : {}),
})
const page = await browser.newPage({
  viewport: { width: 1440, height: 1050 },
  deviceScaleFactor: 1,
})
const errors: string[] = []
page.on("pageerror", (error) => errors.push(error.message))
const output = `${root}tests/return-current-dev/actual`
await mkdir(output, { recursive: true })
try {
  await page.goto(new URL("tests/return-current-dev/", baseUrl).toString())
  await page
    .getByTestId("cli-health")
    .filter({ hasText: "Palace ready" })
    .waitFor({ timeout: 30_000 })
  const canvas = page.locator("canvas").first()
  await canvas.waitFor()
  const bounds = await canvas.boundingBox()
  assert(bounds)
  const signalPoint = {
    x: bounds.x + bounds.width / 2,
    y: bounds.y + bounds.height / 2,
  }
  await page.mouse.click(signalPoint.x, signalPoint.y, { button: "right" })
  const simulate = page.getByRole("menuitem", { name: /^Simulate/ })
  await simulate.hover()
  await page
    .getByRole("menuitem", { name: "Return Current Simulation", exact: true })
    .click()
  const setup = page.getByRole("region", {
    name: "Return current simulation setup",
    exact: true,
  })
  await setup.getByRole("heading", { name: "DATA0", exact: true }).waitFor()
  assert.match(await setup.innerText(), /U1.DATA0.*U2.DATA0/)
  assert.equal(
    await page.getByLabel("Driver GND return sink").inputValue(),
    "pcb_port_u1_gnd",
  )
  assert.equal(
    await page.getByLabel("Load GND return source").inputValue(),
    "pcb_port_u2_gnd",
  )
  await page.screenshot({ path: `${output}/before-run.png`, fullPage: true })
  const outgoing = page.waitForRequest(
    (request) =>
      request.url().endsWith("/api/events/create") &&
      request.method() === "POST",
  )
  await page
    .getByRole("button", { name: "Run return current simulation", exact: true })
    .click()
  const request = (await outgoing).postDataJSON()
  assert.equal(request.frequency_hz, 400_000_000)
  assert.equal(request.cell_size, 0.01)
  assert.equal(request.order, 2)
  const excitation = request.circuit_json.find(
    (element: { type: string }) =>
      element.type === "simulation_return_current_excitation",
  )
  assert.equal(excitation.pcb_trace_id, "pcb_trace_data0")
  assert.notEqual(
    excitation.source_port.signal_pcb_port_id,
    excitation.source_port.reference_pcb_port_id,
  )
  assert.notEqual(
    excitation.load_port.signal_pcb_port_id,
    excitation.load_port.reference_pcb_port_id,
  )
  assert(
    !request.circuit_json.some(
      (element: { type: string }) =>
        element.type === "simulation_pcb_return_current_result",
    ),
  )
  console.log(
    `Submitted real EM job ${request.request_id}; 400 MHz, 0.01 mm samples, P2`,
  )
  await page.waitForFunction(
    () =>
      ["completed", "failed"].includes(
        document
          .querySelector('[data-testid="simulation-status"]')
          ?.getAttribute("data-status") || "",
      ),
    null,
    { timeout: 900_000 },
  )
  const status = page.getByTestId("simulation-status")
  assert.equal(
    await status.getAttribute("data-status"),
    "completed",
    await status.innerText(),
  )
  const overlay = page.locator("[data-return-current-overlay]")
  await overlay
    .locator('image[data-type="simulation_pcb_return_current_heatmap"]')
    .waitFor({ timeout: 30_000 })
  await page.waitForFunction(
    () =>
      document.querySelectorAll(
        '[data-type="simulation_pcb_return_current_vector"]',
      ).length > 0,
    null,
    { timeout: 30_000 },
  )
  assert.equal(await overlay.getAttribute("data-return-layer"), "bottom")
  assert.equal(
    await overlay
      .locator("[data-return-current-signal]")
      .getAttribute("data-pcb-trace-id"),
    "pcb_trace_data0",
  )
  const groundMarkers = overlay.locator(
    '[data-return-current-terminal][data-role^="return_"]',
  )
  assert.equal(await groundMarkers.count(), 2)
  const groundIds = await groundMarkers.evaluateAll((elements) =>
    elements.map((element) => element.getAttribute("data-target-id")),
  )
  assert.deepEqual(groundIds.sort(), ["pcb_port_u1_gnd", "pcb_port_u2_gnd"])
  await page.screenshot({ path: `${output}/completed.png`, fullPage: true })
  const heat = overlay
    .locator('image[data-type="simulation_pcb_return_current_heatmap"]')
    .first()
  const before = await heat.getAttribute("transform")
  await page.mouse.move(signalPoint.x, signalPoint.y)
  await page.mouse.wheel(0, -180)
  await page.waitForTimeout(250)
  assert.notEqual(
    await heat.getAttribute("transform"),
    before,
    "Heatmap must track PCB zoom",
  )
  await page
    .getByRole("checkbox", { name: "EM heatmap", exact: true })
    .uncheck()
  assert.equal(
    await overlay
      .locator('image[data-type="simulation_pcb_return_current_heatmap"]')
      .count(),
    0,
  )
  await page.getByRole("checkbox", { name: "EM heatmap", exact: true }).check()
  await heat.waitFor()
  await page.screenshot({ path: `${output}/zoomed.png`, fullPage: true })
  const resultId = await overlay.getAttribute("data-result-id")
  assert.equal(
    new URL(page.url()).searchParams.get("return_current_request_id"),
    request.request_id,
  )
  await page.reload()
  await page.waitForFunction(
    () =>
      document
        .querySelector('[data-testid="simulation-status"]')
        ?.getAttribute("data-status") === "completed",
    null,
    { timeout: 30_000 },
  )
  await page.waitForFunction(
    () =>
      document.querySelectorAll(
        '[data-type="simulation_pcb_return_current_vector"]',
      ).length > 0,
    null,
    { timeout: 30_000 },
  )
  assert.equal(
    await overlay.getAttribute("data-result-id"),
    resultId,
    "Refreshing must reopen the completed result without another solve",
  )
  assert.deepEqual(errors, [])
  await writeFile(
    `${output}/receipt.json`,
    JSON.stringify(
      {
        request_id: request.request_id,
        frequency_hz: request.frequency_hz,
        cell_size: request.cell_size,
        order: request.order,
        result_id: await overlay.getAttribute("data-result-id"),
        vectors: await overlay
          .locator('[data-type="simulation_pcb_return_current_vector"]')
          .count(),
        passed: true,
      },
      null,
      2,
    ),
  )
  console.log(
    "Real context-menu → synthetic Circuit JSON → CLI events → Palace → PCB overlay workflow passed",
  )
} catch (error) {
  await page
    .screenshot({ path: `${output}/failure.png`, fullPage: true })
    .catch(() => {})
  throw error
} finally {
  await browser.close()
  await vite?.close()
  if (api) await new Promise<void>((resolve) => api!.close(() => resolve()))
}
