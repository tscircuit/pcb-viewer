import assert from "node:assert/strict"
import { mkdir, rm, writeFile } from "node:fs/promises"
import { fileURLToPath } from "node:url"
import { type Page, chromium } from "playwright"
import { createServer as createViteServer, transformWithEsbuild } from "vite"
import { createReturnCurrentDevServer } from "../../scripts/return-current-dev-server"

// Bounded UI/transport checks. The injected client never executes a solver or
// produces simulation fields. --reopen-existing reads a separately completed,
// real job from the development server and explicitly forbids new submissions.
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
import type { ReturnCurrentSimulationClient, ReturnCurrentSimulationRequest } from "/src/lib/return-current-client.ts"
const state = { available: false, checks: 0, submissions: [] as ReturnCurrentSimulationRequest[], polls: 0, submitError: false, status: "running" as "running" | "failed", requestIds: [] as string[] }
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
createRoot(document.getElementById("root")!).render(
  <main>
    <h1>UI lifecycle test · injected transport · no EM solver</h1>
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
}
declare global {
  interface Window {
    __returnCurrentLifecycle: HarnessState
  }
}

let api: Awaited<ReturnType<typeof createReturnCurrentDevServer>> | undefined
let vite: Awaited<ReturnType<typeof createViteServer>> | undefined
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined
let activePage: Page | undefined
const fixtureCache = `${root}node_modules/.cache/return-current-lifecycle-${process.pid}`
const output = `${root}tests/return-current-dev/actual`
await mkdir(output, { recursive: true })

const openFromTrace = async (page: Page) => {
  const canvas = page.locator("canvas").first()
  await canvas.waitFor()
  const bounds = await canvas.boundingBox()
  assert(bounds)
  await page.mouse.click(
    bounds.x + bounds.width / 2,
    bounds.y + bounds.height / 2,
    { button: "right" },
  )
  await page.getByRole("menuitem", { name: /^Simulate/ }).hover()
  await page
    .getByRole("menuitem", { name: "Return Current Simulation", exact: true })
    .click()
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

try {
  if (existingRequestId && !process.env.RETURN_CURRENT_BROWSER_URL) {
    api = await createReturnCurrentDevServer({ projectDirectory: root })
    await new Promise<void>((resolve) => api!.listen(0, "127.0.0.1", resolve))
  }
  const address = api?.address()
  const apiOrigin =
    address && typeof address === "object"
      ? `http://127.0.0.1:${address.port}`
      : undefined
  if (!existingRequestId || !process.env.RETURN_CURRENT_BROWSER_URL) {
    console.log("Starting bounded lifecycle fixture server")
    vite = await createViteServer({
      root,
      cacheDir: fixtureCache,
      optimizeDeps: { entries: ["tests/return-current-dev/main.tsx"] },
      server: {
        host: "127.0.0.1",
        port: 0,
        ...(apiOrigin ? { proxy: { "/api": apiOrigin } } : {}),
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
  page.on("pageerror", (error) => errors.push(error.message))
  page.on("request", (request) => {
    if (
      request.method() === "POST" &&
      new URL(request.url()).pathname === "/api/events/create"
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
    const url = new URL("tests/return-current-dev/", baseUrl)
    url.searchParams.set("return_current_request_id", existingRequestId)
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
    assert.equal(
      await dialog.getByTestId("simulation-status").getAttribute("data-status"),
      "completed",
    )
    assert.equal(
      await dialog.getByLabel("Driver-side ground pad").inputValue(),
      "pcb_port_u1_gnd",
    )
    assert.equal(
      await dialog.getByLabel("Load-side ground pad").inputValue(),
      "pcb_port_u2_gnd",
    )
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
    assert.equal(
      await overlay
        .locator('image[data-type="simulation_pcb_return_current_heatmap"]')
        .count(),
      0,
    )
    await dialog
      .getByRole("checkbox", { name: "EM heatmap", exact: true })
      .check()
    await dialog
      .getByRole("checkbox", { name: "Current direction arrows", exact: true })
      .uncheck()
    assert.equal(
      await overlay
        .locator('[data-type="simulation_pcb_return_current_vector"]')
        .count(),
      0,
    )
    await dialog
      .getByRole("checkbox", { name: "Current direction arrows", exact: true })
      .check()
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
    await page.goto(new URL(harnessPath, baseUrl).toString())
    await page.locator("canvas").first().waitFor()
    assert.equal(await dialog.count(), 0)
    await assertNoOutsideForm(page)
    await openFromTrace(page)
    await dialog.waitFor()
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
      .filter({ hasText: "Local CLI event server available" })
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
  if (api) await new Promise<void>((resolve) => api!.close(() => resolve()))
}
