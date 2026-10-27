import assert from "node:assert/strict"
import { mkdir, rm, writeFile } from "node:fs/promises"
import { fileURLToPath } from "node:url"
import { type Page, chromium } from "playwright"
import { createServer as createViteServer, transformWithEsbuild } from "vite"

// Bounded UI/transport checks. The injected client never executes a solver or
// produces simulation fields. --reopen-existing reads a separately completed,
// real job from the configured service and explicitly forbids new submissions.
const root = fileURLToPath(new URL("../../", import.meta.url))
const args = process.argv.slice(2)
const existingRequestId = args[0] === "--reopen-existing" ? args[1] : undefined
if (args.length && (!existingRequestId || args.length !== 2)) {
  throw new Error(
    "Usage: bun tests/return-current-dev/lifecycle.ts [--reopen-existing REQUEST_ID]",
  )
}
const harnessPath = "/__return-current-lifecycle__"
const modulePath = "/@return-current-lifecycle.tsx"
const moduleId = "\0return-current-lifecycle.tsx"
const harnessSource = `
import React from "react"
import { createRoot } from "react-dom/client"
import { PCBViewer } from "/src/PCBViewer.tsx"
import { returnCurrentDemoBoard } from "/src/assets/return-current-board.ts"
import { VisibilityContextMenu } from "/src/components/VisibilityContextMenu.tsx"
import { RenderingEngineContext } from "/src/components/RenderingEngineContext.tsx"
import { ContextProviders } from "/src/components/ContextProviders.tsx"
import type { ReturnCurrentSimulationClient, ReturnCurrentSimulationRequest } from "/src/lib/return-current/client.ts"
const state = { available: false, checks: 0, submissions: [] as ReturnCurrentSimulationRequest[], polls: 0, submitError: false, status: "running" as "running" | "failed", requestIds: [] as string[], menuActions: 0 }
const client: ReturnCurrentSimulationClient = {
  async checkAvailability() {
    state.checks++
    return { available: state.available, message: state.available ? "Transport fixture ready; no EM solver" : "Transport fixture backend unavailable" }
  },
  async submit(request) {
    state.submissions.push(request)
    if (state.submitError) throw new Error("Transport fixture rejected submission")
    state.status = "running"
    return { requestId: request.requestId, status: "running", message: "Transport fixture job running" }
  },
  async getJob(requestId) {
    state.polls++
    return { requestId, status: state.status, message: state.status === "failed" ? "Transport fixture job failed" : "Transport fixture job running" }
  },
  async loadResult() { throw new Error("This transport fixture never generates EM results") }
}
window.__returnCurrentLifecycle = state
function CompleteMenuHarness() {
  const [open, setOpen] = React.useState(false)
  return <main><button type="button" onClick={() => setOpen(true)}>Open complete context menu</button>
    {open && <ContextProviders><RenderingEngineContext.Provider value={{ renderer: "canvas", setRenderer: () => {} }}>
      <VisibilityContextMenu position={{ x: window.innerWidth - 8, y: window.innerHeight - 8 }}
        component={{ refdes: "U1", pcb_component_id: "pcb_component_u1", source_component_id: "source_component_u1", manufacturer_part_number: "EXAMPLE-LONG-MANUFACTURER-PART-NUMBER" }}
        onViewSchematicComponent={() => {}} onXRayNet={() => {}} onExitXRayNet={() => {}}
        xRayGroups={Array.from({ length: 4 }, (_, index) => ({ id: String(index), name: "Example group " + index, netIds: [] }))}
        onXRayGroup={() => {}} onClose={() => setOpen(false)} onSimulateReturnCurrent={() => { state.menuActions++ }} />
    </RenderingEngineContext.Provider></ContextProviders>}
  </main>
}
createRoot(document.getElementById("root")!).render(new URLSearchParams(window.location.search).has("am3352")
  ? React.createElement((await import("/src/examples/2026/repros/am3352-dev-board/am3352-dev-board.fixture.tsx")).default)
  : new URLSearchParams(window.location.search).has("menu_geometry") ? <CompleteMenuHarness /> :
  <main>
    <h1>UI lifecycle test · injected transport · no EM solver</h1>
    <button type="button" data-testid="host-style-sentinel">Host style sentinel</button>
    <PCBViewer circuitJson={returnCurrentDemoBoard} renderer="canvas" height={650} allowEditing={false}
      returnCurrentSimulationDialog={{ client, onRequestIdChange: id => state.requestIds.push(id) }} />
  </main>
)
`

type HarnessState = {
  available: boolean
  checks: number
  submissions: Array<{ requestId: string; frequencyHz: number }>
  polls: number
  submitError: boolean
  status: "running" | "failed"
  requestIds: string[]
  menuActions: number
}
declare global {
  interface Window {
    __returnCurrentLifecycle: HarnessState
  }
}

let vite: Awaited<ReturnType<typeof createViteServer>> | undefined
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined
let activePage: Page | undefined
const fixtureCache = `${root}node_modules/.cache/return-current-lifecycle-${process.pid}`
const output = `${root}tests/return-current-dev/actual`
await mkdir(output, { recursive: true })

const openFromTrace = async (page: Page) => {
  const canvas = page.locator("canvas").first()
  await canvas.waitFor()
  await page.waitForLoadState("networkidle")
  const bounds = await canvas.boundingBox()
  assert(bounds)
  await page.mouse.click(
    bounds.x + bounds.width / 2,
    bounds.y + bounds.height / 2,
    { button: "right" },
  )
  const menu = page.getByRole("menu", { name: "PCB context menu", exact: true })
  const labels = await menu.evaluate((element) =>
    Array.from(element.querySelectorAll<HTMLButtonElement>("button"))
      .filter((button) => button.closest('[role="menu"]') === element)
      .map((button) => button.textContent?.trim()),
  )
  assert.match(
    labels.at(-1) ?? "",
    /^Simulate/,
    "Simulate must be the last context-menu entry",
  )
  const simulate = menu.getByRole("menuitem", { name: /^Simulate/ })
  await menu.focus()
  await page.keyboard.press("ArrowUp")
  assert(
    await simulate.evaluate((element) => element === document.activeElement),
  )
  await page.keyboard.press("ArrowDown")
  assert.equal(
    await page.evaluate(() => document.activeElement?.textContent?.trim()),
    labels[0],
  )
  await page.keyboard.press("ArrowUp")
  await page.keyboard.press("ArrowRight")
  await page.waitForFunction(
    () =>
      document.activeElement?.textContent?.trim() ===
      "Return Current Simulation",
  )
  await page.keyboard.press("ArrowLeft")
  assert(
    await simulate.evaluate((element) => element === document.activeElement),
  )
  assert.equal(await simulate.getAttribute("aria-expanded"), "false")
  await page.keyboard.press("ArrowRight")
  await page.waitForFunction(
    () =>
      document.activeElement?.textContent?.trim() ===
      "Return Current Simulation",
  )
  await page.keyboard.press("Enter")
  await menu.waitFor({ state: "hidden" })
}

const assertNoOutsideForm = async (page: Page) => {
  assert.equal(
    await page
      .locator("input, select, textarea")
      .evaluateAll(
        (elements) =>
          elements.filter(
            (element) =>
              element.getClientRects().length > 0 &&
              !element.closest('[role="dialog"]'),
          ).length,
      ),
    0,
    "Configuration inputs must be inside the dialog",
  )
}

const tailwindCdnUrl = "https://cdn.tailwindcss.com/3.4.17"
const hostStyleState = (page: Page) =>
  page.getByTestId("host-style-sentinel").evaluate((element) => {
    const style = getComputedStyle(element)
    return {
      color: style.color,
      backgroundColor: style.backgroundColor,
      fontFamily: style.fontFamily,
      fontSize: style.fontSize,
      borderTopWidth: style.borderTopWidth,
      paddingTop: style.paddingTop,
      paddingLeft: style.paddingLeft,
      tailwind: JSON.stringify(Reflect.get(window, "tailwind")),
    }
  })

const seedHostTailwindConfig = (page: Page) =>
  page.addInitScript(() => {
    if (window === window.top)
      Reflect.set(window, "tailwind", { config: { prefix: "host-test-" } })
  })

const verifyMenuGeometry = async (page: Page, baseUrl: string) => {
  for (const viewport of [
    { width: 900, height: 480 },
    { width: 390, height: 300 },
    { width: 740, height: 300 },
  ]) {
    console.log(
      `Checking complete menu at ${viewport.width}×${viewport.height}`,
    )
    await page.setViewportSize(viewport)
    const url = new URL(harnessPath, baseUrl)
    url.searchParams.set("menu_geometry", "1")
    await page.goto(url.toString())
    await page
      .getByRole("button", { name: "Open complete context menu", exact: true })
      .click()
    const menu = page.getByRole("menu", {
      name: "PCB context menu",
      exact: true,
    })
    const bounds = await menu.boundingBox()
    assert(bounds)
    assert(
      bounds.x >= 0 &&
        bounds.y >= 0 &&
        bounds.x + bounds.width <= viewport.width &&
        bounds.y + bounds.height <= viewport.height,
      `The complete context menu must fit ${viewport.width}×${viewport.height}: ${JSON.stringify(bounds)}`,
    )
    const lastLabel = await menu.evaluate((element) =>
      Array.from(element.querySelectorAll("button"))
        .filter((button) => button.closest('[role="menu"]') === element)
        .at(-1)
        ?.textContent?.trim(),
    )
    assert.match(
      lastLabel ?? "",
      /^Simulate/,
      "Simulate follows schematic, MPN and every optional entry",
    )
    await menu.focus()
    await page.keyboard.press("ArrowUp")
    await page.keyboard.press("ArrowRight")
    const action = page.getByRole("menuitem", {
      name: "Return Current Simulation",
      exact: true,
    })
    await action.waitFor()
    await page.waitForFunction(
      () =>
        document.activeElement?.textContent?.trim() ===
        "Return Current Simulation",
    )
    const actionBounds = await action.boundingBox()
    assert(actionBounds)
    assert(
      actionBounds.x >= 0 &&
        actionBounds.y >= 0 &&
        actionBounds.x + actionBounds.width <= viewport.width &&
        actionBounds.y + actionBounds.height <= viewport.height,
      `The final submenu must fit ${viewport.width}×${viewport.height}: ${JSON.stringify(actionBounds)}`,
    )
    await page.keyboard.press("Enter")
    await menu.waitFor({ state: "hidden" })
    assert.equal(
      await page.evaluate(() => window.__returnCurrentLifecycle.menuActions),
      1,
    )
  }
}

const verifyAm3352 = async (page: Page, baseUrl: string) => {
  console.log("Checking simulation entry point on the actual AM3352 fixture")
  let submissions = 0
  page.on("request", (request) => {
    if (request.method() === "POST" && request.url().endsWith("/jobs"))
      submissions++
  })
  await page.route("**/api/simulations/v1/return-current/health", (route) =>
    route.fulfill({ json: { available: true, message: "Test service ready" } }),
  )
  await page.route(tailwindCdnUrl, (route) => route.abort())
  await page.setViewportSize({ width: 1440, height: 1050 })
  await page.addInitScript(() =>
    localStorage.setItem(
      "pcb_viewer_rendering_engine",
      JSON.stringify("canvas"),
    ),
  )
  await page.goto(new URL(`${harnessPath}?am3352=1`, baseUrl).toString())
  const canvas = page.locator("canvas").first()
  await canvas.waitFor()
  await page.waitForLoadState("networkidle")
  const bounds = await canvas.boundingBox()
  assert(bounds)
  // Midpoint of the top-layer DDR_BYTE0 segment fr_source_net_106_0.
  // The snapshot's fitted PCB bounds are 72.66 x 60 mm, centered at (1.33, 0).
  const scale = Math.min(bounds.width / 72.66, bounds.height / 60, 100) * 0.75
  await canvas.click({
    button: "right",
    position: {
      x: bounds.width / 2 + (3.6 - 1.33) * scale,
      y: bounds.height / 2 + 8.6625 * scale,
    },
  })
  await page.getByRole("menuitem", { name: /^Simulate/ }).hover()
  await page
    .getByRole("menuitem", { name: "Return Current Simulation", exact: true })
    .click()
  const dialog = page.getByRole("dialog", {
    name: "Return current simulation",
    exact: true,
  })
  await dialog.waitFor()
  await dialog
    .getByTestId("cli-health")
    .filter({ hasText: "Simulation service available" })
    .waitFor()
  assert.equal(
    JSON.parse(
      await dialog
        .getByLabel("Stackup dimensions and materials (JSON, mm)")
        .inputValue(),
    ).nominalBoardThicknessMm,
    1.2,
  )
  assert.match(
    await dialog.getByRole("alert").innerText(),
    /complete two-pin connection; split or branched routes/,
  )
  assert(
    await dialog
      .getByRole("button", { name: "Run simulation", exact: true })
      .isDisabled(),
  )
  assert.equal(
    submissions,
    0,
    "Unresolved split routes must not submit a paid job",
  )
  await page.screenshot({
    path: `${output}/am3352-simulation-limitation.png`,
    fullPage: true,
  })
}

try {
  if (!existingRequestId || !process.env.RETURN_CURRENT_BROWSER_URL) {
    console.log("Starting bounded lifecycle fixture server")
    vite = await createViteServer({
      root,
      cacheDir: fixtureCache,
      optimizeDeps: {
        entries: [
          "tests/return-current-dev/main.tsx",
          "src/examples/2026/repros/am3352-dev-board/am3352-dev-board.fixture.tsx",
          "src/examples/2026/return-current-four-layer.fixture.tsx",
        ],
      },
      server: {
        host: "127.0.0.1",
        port: existingRequestId ? 3000 : 0,
        strictPort: true,
      },
      logLevel: "error",
      plugins: [
        {
          name: "return-current-lifecycle-harness",
          configureServer(server) {
            server.middlewares.use(async (request, response, next) => {
              if (request.url?.split("?")[0] !== harnessPath) return next()
              const html = await server.transformIndexHtml(
                harnessPath,
                `<!doctype html><html><body style="margin:0"><div id="root"></div><script type="module" src="${modulePath}"></script></body></html>`,
              )
              response.setHeader("Content-Type", "text/html")
              response.end(html)
            })
          },
          resolveId(id) {
            if (id === modulePath) return moduleId
          },
          async load(id) {
            if (id !== moduleId) return
            return (
              await transformWithEsbuild(
                harnessSource,
                "return-current-lifecycle.tsx",
                { loader: "tsx", jsx: "automatic" },
              )
            ).code
          },
        },
      ],
    })
    await vite.listen()
  }
  const baseUrl =
    existingRequestId && process.env.RETURN_CURRENT_BROWSER_URL
      ? process.env.RETURN_CURRENT_BROWSER_URL
      : vite!.resolvedUrls!.local[0]
  console.log(
    existingRequestId
      ? "Opening an existing real result without submitting a solve"
      : "Opening injected-client UI/transport fixture",
  )
  browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
    ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE }
      : {}),
  })
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1050 },
  })
  activePage = page
  page.setDefaultTimeout(15_000)
  const errors: string[] = []
  let httpSubmissions = 0
  let tailwindRequests = 0
  const tailwindFailures: string[] = []
  // Fetch the actual public CDN bytes using the runtime's proxy/CA trust.
  // Chromium's trust store need not contain the managed environment CA.
  await page.route(tailwindCdnUrl, async (route) => {
    tailwindRequests++
    try {
      const response = await fetch(route.request().url(), {
        signal: AbortSignal.timeout(20_000),
      })
      if (!response.ok)
        throw new Error(`Tailwind CDN returned HTTP ${response.status}`)
      const headers = Object.fromEntries(
        [...response.headers].filter(
          ([name]) =>
            ![
              "content-encoding",
              "content-length",
              "transfer-encoding",
            ].includes(name),
        ),
      )
      await route.fulfill({
        status: response.status,
        headers,
        body: Buffer.from(await response.arrayBuffer()),
      })
    } catch (error) {
      tailwindFailures.push(
        error instanceof Error ? error.message : String(error),
      )
      await route.abort("failed")
    }
  })
  if (!existingRequestId) await seedHostTailwindConfig(page)
  page.on("pageerror", (error) => errors.push(error.message))
  page.on("request", (request) => {
    if (
      request.method() === "POST" &&
      new URL(request.url()).pathname ===
        "/api/simulations/v1/return-current/jobs"
    )
      httpSubmissions++
  })
  const dialog = page.getByRole("dialog", {
    name: "Return current simulation",
    exact: true,
  })
  const launcher = page.getByRole("button", {
    name: "Return current simulation",
    exact: true,
  })
  if (existingRequestId) {
    const fourLayer = process.env.RETURN_CURRENT_FOUR_LAYER === "1"
    const url = new URL("tests/return-current-dev/", baseUrl)
    url.searchParams.set("return_current_request_id", existingRequestId)
    if (fourLayer) url.searchParams.set("four_layer", "1")
    await page.goto(url.toString())
    const overlay = page.locator(
      "[data-return-current-overlay][data-state=ready]",
    )
    await overlay.waitFor({ timeout: 60_000 })
    await page.waitForFunction(
      () =>
        document.querySelectorAll(
          '[data-type="simulation_pcb_return_current_vector"]',
        ).length > 0,
      null,
      { timeout: 60_000 },
    )
    if (!(await dialog.isVisible())) await launcher.click()
    await page
      .locator('[data-return-current-dialog][data-style-state="ready"]')
      .waitFor({ state: "attached", timeout: 30_000 })
    assert.deepEqual(tailwindFailures, [])
    assert.equal(
      await dialog.getByTestId("simulation-status").getAttribute("data-status"),
      "completed",
    )
    assert.equal(
      await dialog.getByLabel("Driver-side ground pad").inputValue(),
      fourLayer ? "pcb_port_1" : "pcb_port_u1_gnd",
    )
    assert.equal(
      await dialog.getByLabel("Load-side ground pad").inputValue(),
      fourLayer ? "pcb_port_3" : "pcb_port_u2_gnd",
    )
    if (fourLayer) {
      assert.equal(await overlay.getAttribute("data-return-layer"), "inner2")
      const job = await (
        await fetch(
          `https://simulate.tscircuit.com/api/simulations/v1/return-current/jobs/${existingRequestId}`,
        )
      ).json()
      assert.deepEqual(
        JSON.parse(
          await dialog
            .getByLabel("Stackup dimensions and materials (JSON, mm)")
            .inputValue(),
        ),
        job.job.stackup,
      )
    }
    await assertNoOutsideForm(page)
    const resultId = await overlay.getAttribute("data-result-id")
    assert.equal(
      resultId,
      `simulation_pcb_return_current_result_${existingRequestId}`,
    )
    await page.screenshot({
      path: `${output}/existing-real-dialog.png`,
      fullPage: true,
    })
    await dialog
      .getByRole("button", { name: "View result on PCB", exact: true })
      .click()
    await dialog.waitFor({ state: "hidden" })
    await overlay.waitFor()
    await assertNoOutsideForm(page)
    await page.screenshot({
      path: `${output}/existing-real-pcb.png`,
      fullPage: true,
    })
    await launcher.click()
    await dialog
      .getByRole("checkbox", { name: "EM heatmap", exact: true })
      .uncheck()
    await page.waitForFunction(
      () =>
        !document.querySelector(
          '[data-return-current-overlay] image[data-type="simulation_pcb_return_current_heatmap"]',
        ),
    )
    await dialog
      .getByRole("checkbox", { name: "EM heatmap", exact: true })
      .check()
    await overlay
      .locator('image[data-type="simulation_pcb_return_current_heatmap"]')
      .first()
      .waitFor({ state: "attached" })
    await dialog
      .getByRole("checkbox", { name: "Current direction arrows", exact: true })
      .uncheck()
    await page.waitForFunction(
      () =>
        !document.querySelector(
          '[data-return-current-overlay] [data-type="simulation_pcb_return_current_vector"]',
        ),
    )
    await dialog
      .getByRole("checkbox", { name: "Current direction arrows", exact: true })
      .check()
    await overlay
      .locator('[data-type="simulation_pcb_return_current_vector"]')
      .first()
      .waitFor({ state: "attached" })
    await dialog.getByLabel("Frequency (MHz)", { exact: true }).fill("450")
    console.log(
      "Existing result: preserving edited settings across Escape/reopen",
    )
    await page.keyboard.press("Escape")
    await dialog.waitFor({ state: "hidden" })
    await launcher.click()
    assert.equal(
      await dialog.getByLabel("Frequency (MHz)", { exact: true }).inputValue(),
      "450",
    )
    assert.match(
      await overlay.locator("[data-return-current-legend]").innerText(),
      /400 MHz/,
    )
    await page.reload()
    await overlay.waitFor({ timeout: 60_000 })
    assert.equal(await overlay.getAttribute("data-result-id"), resultId)
    assert.equal(
      httpSubmissions,
      0,
      "Reopening an existing real result must never submit a solve",
    )
    assert.deepEqual(errors, [])
    await writeFile(
      `${output}/existing-real-reopen-receipt.json`,
      `${JSON.stringify(
        {
          test_kind: "existing-real-result-ui",
          request_id: existingRequestId,
          result_id: resultId,
          new_em_submissions: httpSubmissions,
          passed: true,
        },
        null,
        2,
      )}\n`,
    )
    console.log(
      "Existing real Palace result reopened in the dialog and on the PCB; zero new solves submitted",
    )
  } else {
    const geometryPage = await browser.newPage()
    geometryPage.on("pageerror", (error) =>
      console.error("Menu fixture error:", error.message),
    )
    geometryPage.on("response", (response) => {
      if (response.status() >= 400)
        console.error(
          "Menu fixture response:",
          response.status(),
          response.url(),
        )
    })
    geometryPage.setDefaultTimeout(15_000)
    activePage = geometryPage
    await verifyMenuGeometry(geometryPage, baseUrl)
    await verifyAm3352(geometryPage, baseUrl)
    await geometryPage.close()
    activePage = page
    await page.goto(new URL(harnessPath, baseUrl).toString())
    await page.locator("canvas").first().waitFor()
    assert.equal(await dialog.count(), 0)
    assert.equal(
      tailwindRequests,
      0,
      "The CDN must not load before the dialog is used",
    )
    assert.equal(
      await page
        .locator("iframe[data-return-current-tailwind-compiler]")
        .count(),
      0,
    )
    const hostBefore = await hostStyleState(page)
    await assertNoOutsideForm(page)
    await openFromTrace(page)
    await dialog.waitFor()
    await page
      .locator('[data-return-current-dialog][data-style-state="ready"]')
      .waitFor({ state: "attached", timeout: 30_000 })
    assert.deepEqual(tailwindFailures, [])
    assert.equal(tailwindRequests, 1, "Use the actual pinned Tailwind CDN once")
    assert.deepEqual(
      await hostStyleState(page),
      hostBefore,
      "Widget styling must preserve host styles and Tailwind config",
    )
    await dialog
      .getByTestId("cli-health")
      .filter({ hasText: "backend unavailable" })
      .waitFor()
    assert.equal(
      await dialog
        .getByRole("button", { name: "Run simulation", exact: true })
        .isDisabled(),
      true,
    )
    await assertNoOutsideForm(page)
    await page.evaluate(() => {
      window.__returnCurrentLifecycle.available = true
    })
    await dialog
      .getByRole("button", { name: "Retry backend connection", exact: true })
      .click()
    await dialog
      .getByTestId("cli-health")
      .filter({ hasText: "Simulation service available" })
      .waitFor()
    await dialog.getByLabel("Frequency (MHz)", { exact: true }).fill("875")
    await dialog.getByLabel("Peak current (mA)", { exact: true }).fill("6.5")
    // Exercise both trap boundaries using visible, enabled controls only.
    const focusBoundary = async (edge: "first" | "last") =>
      dialog.evaluate((element, selected) => {
        const controls = Array.from(
          element.querySelectorAll<HTMLElement>(
            "button,input,select,textarea,summary,a[href],[tabindex]",
          ),
        ).filter(
          (control) =>
            control.tabIndex >= 0 &&
            !control.matches(":disabled") &&
            control.getClientRects().length > 0,
        )
        controls[selected === "first" ? 0 : controls.length - 1]!.focus()
      }, edge)
    const atBoundary = async (edge: "first" | "last") =>
      dialog.evaluate((element, selected) => {
        const controls = Array.from(
          element.querySelectorAll<HTMLElement>(
            "button,input,select,textarea,summary,a[href],[tabindex]",
          ),
        ).filter(
          (control) =>
            control.tabIndex >= 0 &&
            !control.matches(":disabled") &&
            control.getClientRects().length > 0,
        )
        return (
          document.activeElement ===
          controls[selected === "first" ? 0 : controls.length - 1]
        )
      }, edge)
    await focusBoundary("last")
    await page.keyboard.press("Tab")
    assert(await atBoundary("first"), "Tab must wrap inside the dialog")
    await page.keyboard.press("Shift+Tab")
    assert(await atBoundary("last"), "Shift+Tab must wrap inside the dialog")
    console.log("Transport lifecycle: closing the edited dialog")
    await page.keyboard.press("Escape")
    await dialog.waitFor({ state: "hidden" })
    await page.waitForFunction(
      () =>
        document.activeElement ===
        document.querySelector("[data-return-current-launcher]"),
    )
    await launcher.click()
    await page
      .locator('[data-return-current-dialog][data-style-state="ready"]')
      .waitFor({ state: "attached" })
    assert.equal(
      tailwindRequests,
      1,
      "Reopening must reuse the loaded compiler",
    )
    assert.equal(
      await page
        .locator("iframe[data-return-current-tailwind-compiler]")
        .count(),
      1,
    )
    assert.equal(
      await page.locator("style[data-return-current-tailwind]").count(),
      1,
    )
    assert.equal(
      await dialog.getByLabel("Frequency (MHz)", { exact: true }).inputValue(),
      "875",
    )
    assert.equal(
      await dialog
        .getByLabel("Peak current (mA)", { exact: true })
        .inputValue(),
      "6.5",
    )
    await page.evaluate(() => {
      window.__returnCurrentLifecycle.submitError = true
    })
    await dialog
      .getByRole("button", { name: "Run simulation", exact: true })
      .click()
    await dialog
      .getByTestId("simulation-status")
      .filter({ hasText: "rejected submission" })
      .waitFor()
    await page.evaluate(() => {
      window.__returnCurrentLifecycle.submitError = false
    })
    await dialog
      .getByRole("button", { name: "Retry simulation", exact: true })
      .click()
    await dialog
      .getByTestId("simulation-status")
      .filter({ hasText: "job running" })
      .waitFor()
    const beforeClose = await page.evaluate(() => ({
      count: window.__returnCurrentLifecycle.submissions.length,
      polls: window.__returnCurrentLifecycle.polls,
      id: window.__returnCurrentLifecycle.submissions.at(-1)!.requestId,
    }))
    assert.equal(beforeClose.count, 2, "Only explicit run and retry may submit")
    await page.waitForFunction(
      () =>
        document
          .querySelector('[role="dialog"]')
          ?.contains(document.activeElement),
      null,
      { timeout: 2_000 },
    )
    console.log("Transport lifecycle: closing the running dialog")
    await page.keyboard.press("Escape")
    await dialog.waitFor({ state: "hidden" })
    await page.waitForFunction(
      (polls) => window.__returnCurrentLifecycle.polls > polls,
      beforeClose.polls,
    )
    await launcher.click()
    assert.equal(
      await dialog.getByTestId("simulation-status").getAttribute("data-status"),
      "running",
    )
    assert.equal(
      await dialog.getByLabel("Frequency (MHz)", { exact: true }).isDisabled(),
      true,
    )
    const state = await page.evaluate(() => window.__returnCurrentLifecycle)
    assert.equal(state.submissions.length, 2)
    assert.equal(state.submissions.at(-1)!.requestId, beforeClose.id)
    assert.equal(state.submissions.at(-1)!.frequencyHz, 875_000_000)
    assert.equal(
      state.submissions[0]!.requestId,
      state.submissions[1]!.requestId,
      "A submission retry must reuse its ID so an ambiguous acknowledgment cannot duplicate a native job",
    )
    await page.evaluate(() => {
      window.__returnCurrentLifecycle.status = "failed"
    })
    await dialog
      .getByTestId("simulation-status")
      .filter({ hasText: "job failed" })
      .waitFor()
    await dialog
      .getByRole("button", { name: "Retry simulation", exact: true })
      .click()
    await dialog
      .getByTestId("simulation-status")
      .filter({ hasText: "job running" })
      .waitFor()
    assert.equal(
      await page.evaluate(
        () => window.__returnCurrentLifecycle.submissions.length,
      ),
      3,
    )
    assert.notEqual(
      await page.evaluate(
        () => window.__returnCurrentLifecycle.submissions.at(-1)!.requestId,
      ),
      beforeClose.id,
      "Retrying a confirmed failed job creates a new request",
    )
    assert.equal(
      await page.locator("[data-return-current-overlay]").count(),
      0,
      "Transport fixtures must not create fake EM fields",
    )
    assert.equal(httpSubmissions, 0)
    assert.deepEqual(errors, [])
    await page.screenshot({
      path: `${output}/transport-lifecycle.png`,
      fullPage: true,
    })
    const fallbackPage = await browser.newPage({
      viewport: { width: 1440, height: 1050 },
    })
    await seedHostTailwindConfig(fallbackPage)
    let blockedAttempts = 0
    const fallbackErrors: string[] = []
    fallbackPage.on("pageerror", (error) => fallbackErrors.push(error.message))
    await fallbackPage.route(tailwindCdnUrl, async (route) => {
      blockedAttempts++
      await route.abort("failed")
    })
    await fallbackPage.goto(new URL(harnessPath, baseUrl).toString())
    await fallbackPage.locator("canvas").first().waitFor()
    const fallbackHostBefore = await hostStyleState(fallbackPage)
    await openFromTrace(fallbackPage)
    const fallbackDialog = fallbackPage.getByRole("dialog", {
      name: "Return current simulation",
      exact: true,
    })
    await fallbackPage
      .locator('[data-return-current-dialog][data-style-state="fallback"]')
      .waitFor({ state: "attached", timeout: 20_000 })
    assert.equal(blockedAttempts, 1)
    assert.equal(
      await fallbackDialog.evaluate(
        (element) => getComputedStyle(element).backgroundColor,
      ),
      "rgb(255, 255, 255)",
    )
    assert.deepEqual(await hostStyleState(fallbackPage), fallbackHostBefore)
    await fallbackDialog
      .getByLabel("Frequency (MHz)", { exact: true })
      .fill("450")
    assert.equal(
      await fallbackDialog
        .getByLabel("Frequency (MHz)", { exact: true })
        .inputValue(),
      "450",
    )
    await fallbackPage.evaluate(() => {
      window.__returnCurrentLifecycle.available = true
    })
    await fallbackDialog
      .getByRole("button", { name: "Retry backend connection", exact: true })
      .click()
    await fallbackDialog
      .getByTestId("cli-health")
      .filter({ hasText: "Simulation service available" })
      .waitFor()
    assert.equal(
      await fallbackDialog
        .getByRole("button", { name: "Run simulation", exact: true })
        .isEnabled(),
      true,
    )
    assert.equal(
      await fallbackPage.locator("[data-return-current-overlay]").count(),
      0,
    )
    assert.deepEqual(fallbackErrors, [])
    await fallbackPage.screenshot({
      path: `${output}/transport-fallback.png`,
      fullPage: true,
    })
    await fallbackPage.close()
    await writeFile(
      `${output}/transport-lifecycle-receipt.json`,
      `${JSON.stringify(
        {
          test_kind: "injected-client-ui-transport",
          em_solve: false,
          em_result: false,
          explicit_submissions: 3,
          polling_continued_while_closed: true,
          focus_trap_escape_restore: true,
          simulate_is_last_with_keyboard_navigation: true,
          actual_tailwind_cdn_requests: tailwindRequests,
          host_styles_preserved: true,
          blocked_cdn_fallback: true,
          passed: true,
        },
        null,
        2,
      )}\n`,
    )
    console.log(
      "Injected-client dialog lifecycle passed; no EM solver or simulation result was used",
    )
  }
} catch (error) {
  await activePage
    ?.screenshot({ path: `${output}/lifecycle-failure.png`, fullPage: true })
    .catch(() => {})
  if (activePage) {
    console.error(
      "Focused element on failure:",
      await activePage.evaluate(() =>
        document.activeElement?.outerHTML.slice(0, 400),
      ),
    )
    console.error(
      "Dialog state on failure:",
      await activePage
        .getByRole("dialog", { name: "Return current simulation", exact: true })
        .innerText()
        .catch(() => "Dialog is closed"),
    )
  }
  throw error
} finally {
  await browser?.close()
  await vite?.close()
  await rm(fixtureCache, { recursive: true, force: true })
}
