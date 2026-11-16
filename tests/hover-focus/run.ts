import assert from "node:assert/strict"
import { mkdir, readFile } from "node:fs/promises"
import { fileURLToPath } from "node:url"
import { chromium } from "playwright"
import { createServer } from "vite"

const root = fileURLToPath(new URL("../../", import.meta.url))
const fixture = await readFile(
  `${root}src/examples/2025/board.fixture.tsx`,
  "utf8",
)
assert(!fixture.includes("DisabledAutoFocus"), "legacy fixture name is removed")
assert.match(
  fixture,
  /export const FocusOnHoverDisabled[\s\S]*focusOnHover=\{false\}/,
)
assert.match(fixture, /export default\s*\{[\s\S]*FocusOnHoverDisabled/)
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
  const evidence = process.env.PCB_HOVER_EVIDENCE_DIR
  if (evidence) await mkdir(evidence, { recursive: true })
  const context = await browser.newContext({
    viewport: { width: 800, height: 650 },
    ...(evidence ? { recordVideo: { dir: evidence } } : {}),
  })
  const page = await context.newPage()
  const recording = page.video()
  const errors: string[] = []
  page.on("pageerror", (error) => errors.push(error.message))
  await page.goto(`${server.resolvedUrls!.local[0]}tests/hover-focus/`)
  const input = page.getByRole("textbox", { name: "Keyboard input" })
  for (const mode of ["default", "disabled", "enabled"]) {
    await page.getByRole("combobox", { name: "Hover focus" }).selectOption(mode)
    const viewer = page.locator("[data-pcb-viewer]")
    await page.locator("canvas").first().waitFor()
    await page.locator('[data-rendered="true"]').waitFor()
    assert(
      await page
        .locator("canvas")
        .first()
        .evaluate((element) => {
          const canvas = element as HTMLCanvasElement
          const context = canvas.getContext("2d")
          if (!context) return false
          const data = context.getImageData(
            0,
            0,
            canvas.width,
            canvas.height,
          ).data
          for (let i = 4; i < data.length; i += 4) {
            if (
              data[i] !== data[0] ||
              data[i + 1] !== data[1] ||
              data[i + 2] !== data[2]
            )
              return true
          }
          return false
        }),
      "actual canvas is nonblank",
    )
    await input.click()
    await viewer.hover({ position: { x: 400, y: 250 } })
    if (mode === "enabled") {
      assert(
        await viewer.evaluate((element) => element === document.activeElement),
        "enabled hover focuses the viewer",
      )
    } else {
      assert(
        await input.evaluate((element) => element === document.activeElement),
        `${mode} hover preserves input focus`,
      )
      await page.keyboard.type(mode)
      assert(
        (await input.inputValue()).endsWith(mode),
        "typing still reaches the input",
      )
    }
    if (evidence) {
      await page.screenshot({ path: `${evidence}/${mode}-hover.png` })
      await page.waitForTimeout(1200)
    }
    await page.mouse.move(790, 640)
    await viewer.click({ position: { x: 400, y: 250 } })
    assert(
      await viewer.evaluate((element) => element === document.activeElement),
      `${mode} click still focuses the viewer`,
    )
  }
  assert.deepEqual(errors, [], "no browser page errors")
  await context.close()
  if (recording) console.log(JSON.stringify({ video: await recording.path() }))
  console.log(
    "PASS: fixture migration; default, disabled, enabled hover focus; input typing; click focus",
  )
} finally {
  await browser.close()
  await server.close()
}
