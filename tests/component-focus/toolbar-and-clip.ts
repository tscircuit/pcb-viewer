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
  for (const width of [800, 390]) {
    for (const host of [false, true]) {
      const page = await browser.newPage({ viewport: { width, height: 800 } })
      const errors: string[] = []
      page.on("pageerror", (error) => errors.push(error.message))
      await page.goto(`${server.resolvedUrls!.local[0]}tests/component-focus/`)
      if (host)
        await page.addStyleTag({
          content:
            "body {font: 16px/1.5 system-ui} button,input {font:inherit} *,::before,::after {box-sizing:border-box}",
        })
      await page.getByRole("button", { name: "Mount and focus U1" }).click()
      const search = page.getByRole("button", { name: "Search components" })
      const measure = page.getByRole("button", { name: "Measure distance" })
      const input = page.getByRole("combobox", { name: "Component name" })
      await search.waitFor()
      const bounds = async () => {
        const searchBox = (await search.boundingBox())!
        const measureBox = (await measure.boundingBox())!
        assert.equal(searchBox.y, measureBox.y)
        assert.equal(searchBox.width, measureBox.width)
        assert.equal(searchBox.height, measureBox.height)
        assert.deepEqual(
          await search.evaluate((e) => getComputedStyle(e).padding),
          await measure.evaluate((e) => getComputedStyle(e).padding),
        )
        for (const control of [search, measure]) {
          const centered = await control.evaluate((e) => {
            const button = e.getBoundingClientRect()
            const icon = e.firstElementChild!.getBoundingClientRect()
            return [
              Math.abs(button.x + button.width / 2 - icon.x - icon.width / 2),
              Math.abs(button.y + button.height / 2 - icon.y - icon.height / 2),
            ]
          })
          assert(
            centered.every((delta) => delta < 0.1),
            "icon slot is centered",
          )
        }
        const svg = (await search.locator("svg").boundingBox())!
        assert(
          Math.abs(svg.x + svg.width / 2 - searchBox.x - searchBox.width / 2) <
            0.1,
        )
        assert(
          Math.abs(
            svg.y + svg.height / 2 - searchBox.y - searchBox.height / 2,
          ) < 0.1,
        )
        console.log(
          JSON.stringify({
            width,
            host,
            search: searchBox,
            measure: measureBox,
          }),
        )
      }
      await bounds()
      await search.focus()
      await page.keyboard.press("Enter")
      await input.waitFor()
      await bounds()
      assert.equal(
        await input.evaluate((e) => e === document.activeElement),
        true,
      )
      await input.fill("u")
      const results = page.getByRole("listbox", { name: "Matching components" })
      const rows = await results.getByRole("option").evaluateAll((options) =>
        options.map((e) => {
          const css = getComputedStyle(e)
          return [css.borderTopWidth, css.borderBottomWidth, css.borderRadius]
        }),
      )
      assert.deepEqual(rows, [
        ["0px", "0px", "0px"],
        ["1px", "0px", "0px"],
      ])
      assert.equal(
        await results.evaluate((e) => getComputedStyle(e).scrollbarGutter),
        "stable",
      )
      assert.equal(
        await results.evaluate((e) => getComputedStyle(e).paddingRight),
        "12px",
      )
      await input.press("ArrowDown")
      await page
        .locator('[data-focused-pcb-component-id="component_0"]')
        .waitFor()
      await input.press("ArrowDown")
      await page
        .locator('[data-focused-pcb-component-id="component_1"]')
        .waitFor()
      assert.equal(
        await page
          .locator('[data-focused-pcb-component-id="component_0"]')
          .count(),
        0,
      )
      assert.equal(
        await input.evaluate((e) => e === document.activeElement),
        true,
      )
      await input.press("Escape")
      assert.equal(
        await page.locator("[data-focused-pcb-component-id]").count(),
        0,
        "dismissing previews clears the outline",
      )
      assert.equal(
        await search.evaluate((e) => e === document.activeElement),
        true,
      )
      await search.press("Space")
      await input.waitFor()
      await input.press("ArrowDown")
      await search.click()
      assert.equal(
        await page.locator("[data-focused-pcb-component-id]").count(),
        0,
        "toggle dismissal clears preview",
      )
      await search.click()
      await input.press("ArrowDown")
      await page.getByRole("button", { name: "Rename U1" }).click()
      assert.equal(
        await page.locator("[data-focused-pcb-component-id]").count(),
        0,
        "outside dismissal clears preview",
      )
      await page.close()
      assert.deepEqual(errors, [])
    }
  }

  const page = await browser.newPage({ viewport: { width: 1000, height: 900 } })
  await page.goto(`${server.resolvedUrls!.local[0]}tests/component-focus/`)
  await page.addStyleTag({
    content:
      "body {margin:0; min-height:1800px} #root {width:600px;margin:120px auto 0}",
  })
  await page.getByRole("button", { name: "Mount and focus U1" }).click()
  await page.clock.install()
  const search = page.getByRole("button", { name: "Search components" })
  const input = page.getByRole("combobox", { name: "Component name" })
  const outline = page.locator("[data-focused-pcb-component-id]")
  const assertClipped = async () => {
    const canvas = (await page.locator("canvas").first().boundingBox())!
    const clip = (await page
      .locator("[data-pcb-focus-viewport]")
      .boundingBox())!
    assert.deepEqual(
      clip,
      canvas,
      "only the highlight layer matches the PCB viewport",
    )
    const png = (await page.screenshot()).toString("base64")
    const blue = await page.evaluate(
      async ({ png, canvas }) => {
        const image = new Image()
        image.src = `data:image/png;base64,${png}`
        await image.decode()
        const surface = document.createElement("canvas")
        surface.width = image.width
        surface.height = image.height
        const ctx = surface.getContext("2d")!
        ctx.drawImage(image, 0, 0)
        const pixels = ctx.getImageData(
          0,
          0,
          surface.width,
          surface.height,
        ).data
        let outside = 0
        let inside = 0
        for (let y = 0; y < surface.height; y++)
          for (let x = 0; x < surface.width; x++) {
            const i = (y * surface.width + x) * 4
            if (
              pixels[i] !== 51 ||
              pixels[i + 1] !== 153 ||
              pixels[i + 2] !== 255
            )
              continue
            if (
              x < canvas.x ||
              x >= canvas.x + canvas.width ||
              y < canvas.y ||
              y >= canvas.y + canvas.height
            )
              outside++
            else inside++
          }
        return { outside, inside }
      },
      { png, canvas },
    )
    assert.equal(
      blue.outside,
      0,
      "the blue highlight never paints into the host page",
    )
    return blue.inside
  }
  await search.click()
  await input.fill("u")
  await input.press("ArrowDown")
  await page.clock.runFor(16)
  await assertClipped()
  await input.press("ArrowDown")
  await page.clock.runFor(16)
  await assertClipped()
  await input.press("ArrowUp")
  await page.clock.runFor(16)
  await assertClipped()
  await input.press("ArrowDown")
  for (const ms of [16, 100, 350]) {
    await page.clock.runFor(ms)
    await assertClipped()
  }
  await input.press("Enter")
  await page.clock.runFor(500)
  assert((await assertClipped()) > 0, "in-viewport highlight remains visible")
  assert.equal(
    await outline.getAttribute("data-focused-pcb-component-id"),
    "component_1",
  )
  const pan = async (distance: number) => {
    const canvas = (await page.locator("canvas").first().boundingBox())!
    let remaining = distance
    while (Math.abs(remaining) > 0) {
      const step =
        Math.sign(remaining) * Math.min(Math.abs(remaining), canvas.width - 80)
      const startX = canvas.x + (step > 0 ? 40 : canvas.width - 40)
      await page.mouse.move(startX, canvas.y + 500)
      await page.mouse.down()
      await page.mouse.move(startX + step, canvas.y + 500, { steps: 10 })
      await page.mouse.up()
      await page.clock.runFor(50)
      remaining -= step
    }
  }
  await pan(-500)
  assert(
    (await outline.boundingBox())!.x < 200,
    "reproduce left viewport overflow",
  )
  await assertClipped()
  if (process.env.PCB_SEARCH_QA_OUTPUT)
    await page.screenshot({
      path: `${process.env.PCB_SEARCH_QA_OUTPUT}/highlight-left-clipped.png`,
    })
  await pan(950)
  assert(
    (await outline.boundingBox())!.x > 750,
    "reproduce right viewport overflow",
  )
  await assertClipped()
  if (process.env.PCB_SEARCH_QA_OUTPUT)
    await page.screenshot({
      path: `${process.env.PCB_SEARCH_QA_OUTPUT}/highlight-right-clipped.png`,
    })
  await page.mouse.wheel(0, -120)
  await page.clock.runFor(100)
  await assertClipped()
  await page.setViewportSize({ width: 900, height: 800 })
  await page.evaluate(() => window.scrollTo(0, 90))
  await page.clock.runFor(100)
  await assertClipped()
  await page.clock.runFor(3000)
  assert.equal(await outline.count(), 0)
  await page.locator("[data-toolbar-overlay]").evaluate((e) => {
    e.style.top = "580px"
  })
  await search.click()
  const inputBox = (await input.boundingBox())!
  const viewportBox = (await page.locator("canvas").first().boundingBox())!
  assert(
    inputBox.y + inputBox.height > viewportBox.y + viewportBox.height,
    "search popup extends beyond the PCB viewport",
  )
  assert(
    await input.evaluate((e) => {
      const r = e.getBoundingClientRect()
      return (
        document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2) === e
      )
    }),
    "highlight clipping does not clip toolbar popovers",
  )
  await page.close()
  console.log(
    "Search/measure sizing, keyboard focus, dismissals and viewport pixel clipping pass.",
  )
} finally {
  await browser.close()
  await server.close()
}
