import { createHash } from "node:crypto"
import assert from "node:assert/strict"
import { mkdir, writeFile } from "node:fs/promises"
import { fileURLToPath } from "node:url"
import { chromium, type Page } from "playwright"

const root = fileURLToPath(new URL("../../", import.meta.url))
const externalUrl = process.env.PCB_VIEWER_TEST_URL
const renderer =
  process.env.PCB_VIEWER_TEST_RENDERER === "webgpu" ? "webgpu" : "canvas"
const server = externalUrl
  ? undefined
  : await (await import("vite")).createServer({
      root,
      resolve: {
        alias: [
          { find: "../../src/index", replacement: `${root}dist/index.js` },
        ],
      },
      server: {
        host: process.env.PCB_VIEWER_TEST_SERVER_ONLY ? "0.0.0.0" : "127.0.0.1",
        port: process.env.PCB_VIEWER_TEST_SERVER_ONLY ? 5173 : 0,
      },
      logLevel: "error",
    })
if (server) await server.listen()
if (process.env.PCB_VIEWER_TEST_SERVER_ONLY) {
  console.log("Component picking browser fixture server ready")
  await new Promise(() => {})
}
const baseUrl = externalUrl ?? server!.resolvedUrls!.local[0]
const browser = await chromium.launch({
  headless: true,
  ...(renderer === "webgpu" ? { args: ["--enable-unsafe-webgpu"] } : {}),
  ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
    ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE }
    : {}),
})
const results: { name: string; passed: boolean; error?: string }[] = []
const shots = process.env.PCB_VIEWER_SCREENSHOT_DIR
if (shots) await mkdir(shots, { recursive: true })

const readEdits = async (page: Page) =>
  JSON.parse((await page.locator("[data-edit-events]").textContent())!)
const focus = async (page: Page, name: string, id: string) => {
  await page.getByRole("button", { name: `Focus ${name}`, exact: true }).click()
  const outline = page.locator(`[data-focused-pcb-component-id="${id}"]`)
  await outline.waitFor()
  await page.waitForSelector('[data-pending="false"]', { state: "attached" })
  const box = (await outline.boundingBox())!
  const canvas = (await page.locator("canvas").first().boundingBox())!
  assert(Math.abs(box.x + box.width / 2 - (canvas.x + canvas.width / 2)) < 1)
  return { x: box.x + box.width / 2, y: box.y + box.height / 2, clip: box }
}
const bottom = async (page: Page) => {
  const toolbar = page.locator("[data-toolbar-overlay]")
  await toolbar.getByText("top", { exact: true }).click()
  await toolbar.getByText("bottom", { exact: true }).click()
}
const hide = async (page: Page, side: "Top" | "Bottom") => {
  const previousRenderCount = Number(
    await page.locator("[data-render-count]").getAttribute("data-render-count"),
  )
  const toolbar = page.locator("[data-toolbar-overlay]")
  await toolbar
    .locator("[data-view-menu] > div > div")
    .first()
    .click({ delay: 350 })
  await toolbar.getByText(`Show ${side} Components`, { exact: true }).click()
  if (
    await toolbar
      .getByText(`Show ${side} Components`, { exact: true })
      .isVisible()
  ) {
    await toolbar
      .locator("[data-view-menu] > div > div")
      .first()
      .click({ delay: 350 })
  }
  if (renderer === "webgpu") {
    await page.waitForFunction(
      (previous) =>
        document.querySelector("[data-webgpu-error]") ||
        Number(
          document
            .querySelector("[data-render-count]")!
            .getAttribute("data-render-count"),
        ) > previous,
      previousRenderCount,
      { timeout: 5000 },
    )
    assert.equal(
      await page.locator("[data-webgpu-error]").count(),
      0,
      "WebGPU scene must render without device loss",
    )
  }
}
const drag = async (page: Page, point: { x: number; y: number }) => {
  await page.mouse.move(point.x, point.y)
  await page.mouse.down()
  await page.mouse.move(point.x + 20, point.y + 10, { steps: 3 })
  await page.mouse.up()
}
const assertPickingTargets = async (page: Page, expected: string[]) => {
  const ids = await page
    .locator("[data-component-picking-target]")
    .evaluateAll((targets) =>
      targets.map((target) =>
        target.getAttribute("data-component-picking-target"),
      ),
    )
  assert.deepEqual(ids.sort(), expected.sort())
}
const run = async (name: string, test: (page: Page) => Promise<void>) => {
  const context = await browser.newContext({
    viewport: { width: 900, height: 760 },
  })
  const page = await context.newPage()
  const errors: string[] = []
  page.on("pageerror", (e) => errors.push(e.message))
  try {
    await page.goto(
      `${baseUrl}tests/component-visibility-picking/?renderer=${renderer}`,
    )
    await page.waitForSelector('[data-painted="true"]', {
      state: "attached",
      timeout: 20000,
    })
    if (renderer === "webgpu") {
      assert.equal(await page.locator("[data-webgpu-error]").count(), 0)
      await page.locator(".pcb-webgpu-canvas").waitFor()
    }
    await test(page)
    if (renderer === "webgpu") {
      assert.equal(await page.locator("[data-webgpu-error]").count(), 0)
      assert.equal(await page.locator(".pcb-webgpu-canvas").count(), 1)
    }
    assert.deepEqual(errors, [])
    results.push({ name, passed: true })
    if (shots)
      await page.screenshot({
        path: `${shots}/${renderer}-${name}.png`,
        fullPage: true,
      })
  } catch (error) {
    results.push({ name, passed: false, error: String(error) })
    if (shots)
      await page
        .screenshot({
          path: `${shots}/${renderer}-${name}-failure.png`,
          fullPage: true,
        })
        .catch(() => {})
  } finally {
    await context.close()
  }
}
try {
  await run("visible-smt", async (page) => {
    const point = await focus(page, "U_TOP", "component_top")
    await drag(page, point)
    const edits = await readEdits(page)
    assert.equal(edits.length, 1)
    assert.equal(edits[0].pcb_component_id, "component_top")
    assert.equal(edits[0].in_progress, false)
    assert.notDeepEqual(edits[0].new_center, edits[0].original_center)
  })
  await run("off-layer-smt", async (page) => {
    const point = await focus(page, "U_TOP", "component_top")
    await bottom(page)
    await drag(page, point)
    assert.deepEqual(await readEdits(page), [])
    await assertPickingTargets(page, [
      "component_bottom",
      "component_pth_top",
      "component_pth_bottom",
    ])
  })
  await run("hidden-smt", async (page) => {
    const point = await focus(page, "U_TOP", "component_top")
    await hide(page, "Top")
    await drag(page, point)
    assert.deepEqual(await readEdits(page), [])
    await assertPickingTargets(page, [
      "component_pth_top",
      "component_pth_bottom",
    ])
  })
  await run("layer-bearing-through-hole", async (page) => {
    const point = await focus(page, "J_TOP", "component_pth_top")
    await bottom(page)
    await page.mouse.move(1, 1)
    // Locator screenshots include overlapping toolbar UI. Compare the focused
    // component region so menu opacity cannot masquerade as a copper change.
    const copperBox = point.clip
    const captureGpuCopper = () => page.screenshot({ clip: copperBox })
    const copperArtwork = async () =>
      renderer === "canvas"
        ? page.evaluate(() =>
            ["top", "bottom"].map((side) => {
              const canvas = document.querySelector(
                `.pcb-layer-${side}`,
              ) as HTMLCanvasElement
              return canvas.toDataURL()
            }),
          )
        : [(await captureGpuCopper()).toString("base64")]
    if (renderer === "canvas") {
      assert(
        await page.evaluate(() =>
          ["top", "bottom"].some((side) => {
            const canvas = document.querySelector(
              `.pcb-layer-${side}`,
            ) as HTMLCanvasElement
            return canvas
              .getContext("2d")!
              .getImageData(0, 0, canvas.width, canvas.height)
              .data.some((value, index) => index % 4 === 3 && value > 0)
          }),
        ),
        "through-hole copper must actually be painted before comparing it",
      )
    }
    if (renderer === "webgpu") {
      // Camera messages are asynchronous; wait for a stable actual GPU canvas.
      let previous = await captureGpuCopper()
      let stable = false
      for (let attempt = 0; attempt < 20; attempt++) {
        await page.waitForTimeout(50)
        const current = await captureGpuCopper()
        if (current.toString("base64") === previous.toString("base64")) {
          stable = true
          break
        }
        previous = current
      }
      assert(stable, "the GPU camera must settle before comparing copper")
      const copperPixels = await page.evaluate(async (png) => {
        const bitmap = await createImageBitmap(
          await (await fetch(`data:image/png;base64,${png}`)).blob(),
        )
        const canvas = document.createElement("canvas")
        canvas.width = bitmap.width
        canvas.height = bitmap.height
        const context = canvas.getContext("2d")!
        context.drawImage(bitmap, 0, 0)
        bitmap.close()
        const data = context.getImageData(
          0,
          0,
          canvas.width,
          canvas.height,
        ).data
        let copper = 0,
          drill = 0
        for (let i = 0; i < data.length; i += 4) {
          if (
            data[i + 2] > 100 &&
            data[i] < 130 &&
            data[i + 1] > 50 &&
            data[i + 2] > data[i]
          )
            copper++
          if (data[i] > 200 && data[i + 2] > 200 && data[i + 1] < 100) drill++
        }
        return { copper, drill }
      }, previous.toString("base64"))
      assert(
        copperPixels.copper > 0 && copperPixels.drill > 0,
        "actual GPU screenshot must contain both through-hole copper and its drill",
      )
      if (shots)
        await writeFile(
          `${shots}/webgpu-through-hole-before.png`,
          new Uint8Array(previous),
        )
    }
    const before = await copperArtwork()
    await hide(page, "Top")
    await hide(page, "Bottom")
    await page.mouse.move(1, 1)
    const after = await copperArtwork()
    if (renderer === "webgpu" && shots)
      await writeFile(
        `${shots}/webgpu-through-hole-after.png`,
        new Uint8Array(await captureGpuCopper()),
      )
    assert.deepEqual(
      after.map((value) => createHash("sha256").update(value).digest("hex")),
      before.map((value) => createHash("sha256").update(value).digest("hex")),
      "hiding SMT sides must preserve the focused through-hole copper",
    )
    await drag(page, point)
    const edits = await readEdits(page)
    assert.equal(edits.length, 1)
    assert.equal(edits[0].pcb_component_id, "component_pth_top")
    assert.equal(edits[0].in_progress, false)
  })
  await run("visibility-persistence", async (page) => {
    await hide(page, "Top")
    await hide(page, "Bottom")
    await page.reload()
    await page.waitForSelector('[data-painted="true"]', { state: "attached" })
    const toolbar = page.locator("[data-toolbar-overlay]")
    await toolbar
      .locator("[data-view-menu] > div > div")
      .first()
      .click({ delay: 350 })
    for (const side of ["Top", "Bottom"]) {
      const checkbox = toolbar
        .getByText(`Show ${side} Components`, { exact: true })
        .locator("..")
        .locator("input")
      assert.equal(await checkbox.isChecked(), false)
    }
  })
  await run("layer-change-during-drag", async (page) => {
    const point = await focus(page, "U_TOP", "component_top")
    await page.mouse.move(point.x, point.y)
    await page.mouse.down()
    assert.equal((await readEdits(page))[0].in_progress, true)
    await page.keyboard.press("2")
    await page
      .locator("[data-toolbar-overlay]")
      .getByText("bottom", { exact: true })
      .waitFor()
    await page.waitForFunction(
      () => {
        const edits = JSON.parse(
          document.querySelector("[data-edit-events]")!.textContent!,
        )
        return edits.length === 1 && edits[0].in_progress === false
      },
      undefined,
      { timeout: 2000 },
    )
    const stopped = await readEdits(page)
    await page.mouse.move(point.x + 40, point.y + 20)
    await page.mouse.up()
    assert.deepEqual(
      await readEdits(page),
      stopped,
      "an ineligible drag cannot continue after switching layers",
    )
  })
} finally {
  const report = {
    renderer,
    browser: browser.version(),
    results,
    passed: results.filter((r) => r.passed).length,
    failed: results.filter((r) => !r.passed).length,
  }
  console.log(JSON.stringify(report, null, 2))
  if (process.env.PCB_VIEWER_RESULT_PATH)
    await writeFile(
      process.env.PCB_VIEWER_RESULT_PATH,
      `${JSON.stringify(report, null, 2)}\n`,
    )
  await browser.close()
  await server?.close()
}
assert(
  results.every((r) => r.passed),
  "component visibility/picking browser regression failed",
)
