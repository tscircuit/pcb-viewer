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
const browser = await chromium.launch({
  headless: true,
  ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
    ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE }
    : {}),
})
try {
  const page = await browser.newPage({ viewport: { width: 800, height: 600 } })
  const activeXRay = '.pcb-x-ray-net, [data-x-ray-net-active="true"]'
  const errors: string[] = []
  page.on("pageerror", (e) => errors.push(e.message))
  for (const query of [
    "opacity=0",
    "opacity=0.05",
    "opacity=0.4",
    "opacity=1",
    "opacity=0&gpu",
    "opacity=0.05&gpu",
    "opacity=0.4&gpu",
  ]) {
    await page.goto(`${server.resolvedUrls!.local[0]}tests/x-ray-net/?${query}`)
    await page.waitForSelector("canvas")
    await page.mouse.click(650, 180, { button: "right" })
    await page
      .getByRole("menuitem", { name: "Visibility ▸", exact: true })
      .hover()
    await page
      .getByRole("menuitem", { name: "Hidden Layer Visibility ▸", exact: true })
      .hover()
    const opacity = Number(new URLSearchParams(query).get("opacity"))
    await page
      .getByRole("menuitemradio", {
        name: opacity === 0 ? "Hide" : `${opacity * 100}%`,
        exact: true,
      })
      .click()
    // 40x30 board fitted at 15 pixels/mm, centered at (400, 300).
    const enter = async (x = 250, y = 300) => {
      await page.mouse.click(x, y)
      await page
        .getByRole("menuitem", {
          name: y === 300 ? "X-Ray CLK" : "X-Ray U1.1 to U2.2",
          exact: true,
        })
        .click()
      await page.waitForSelector(activeXRay)
    }
    await enter()
    const native =
      (await page.locator('[data-x-ray-net-active="true"]').count()) > 0
    if (process.env.XRAY_EXPECT_NATIVE && query.includes("gpu"))
      assert(native, "X-Ray must remain on WebGPU")
    const pixels = await page.locator(activeXRay).evaluate((node) => {
      const original =
        node instanceof HTMLCanvasElement
          ? node
          : node.querySelector<HTMLCanvasElement>(".pcb-webgpu-canvas")!
      const canvas = document.createElement("canvas")
      canvas.width = original.width
      canvas.height = original.height
      const ctx = canvas.getContext("2d")!
      ctx.drawImage(original, 0, 0)
      return [250, 295, 385, 475, 520].map((x) => [
        ctx.getImageData(x, 300, 1, 1).data[3],
        ctx.getImageData(x, 420, 1, 1).data[3],
      ])
    })
    assert.deepEqual(
      pixels,
      Array.from({ length: 5 }, () => [
        255,
        native ? Math.round(opacity * 255) : 0,
      ]),
      `selected pads/traces are opaque on all layers, unrelated net excluded (${query})`,
    )
    for (const layer of native ? [] : ["top", "inner1", "bottom"]) {
      assert.equal(
        await page
          .locator(`.pcb-layer-${layer}`)
          .evaluate((el) => (el as HTMLElement).style.opacity),
        new URLSearchParams(query).get("opacity"),
      )
    }
    if (!native) {
      const details = await page
        .locator('canvas[class^="pcb-layer-"]')
        .evaluateAll((nodes) =>
          nodes
            .filter(
              (node) =>
                !/^pcb-layer-(top|bottom|inner\d+)$/.test(node.className),
            )
            .map((node) => (node as HTMLElement).style.opacity),
        )
      assert(details.length > 0)
      assert(
        details.every((opacity) => opacity === "0"),
        "All non-copper layers must be transparent during X-Ray",
      )
    }
    const drills = await page.locator(activeXRay).evaluate((node) => {
      const original =
        node instanceof HTMLCanvasElement
          ? node
          : node.querySelector<HTMLCanvasElement>(".pcb-webgpu-canvas")!
      const canvas = document.createElement("canvas")
      canvas.width = original.width
      canvas.height = original.height
      const ctx = canvas.getContext("2d")!
      ctx.drawImage(original, 0, 0)
      return [340, 430].map((x) => ({
        selected: Array.from(ctx.getImageData(x, 300, 1, 1).data),
        unrelated: ctx.getImageData(x, 420, 1, 1).data[3],
      }))
    })
    for (const drill of drills) {
      assert.deepEqual(
        drill.selected,
        [255, 38, 226, 255],
        "Selected via and plated-hole drills must be opaque",
      )
      assert(
        drill.unrelated <= (native ? Math.round(opacity * 255) : 0),
        "Unrelated drills must remain hidden; underlying copper may be dimmed",
      )
    }
    const copperFrames = () =>
      page
        .locator(".pcb-layer-top, .pcb-x-ray-net, .pcb-webgpu-canvas")
        .evaluateAll((canvases) =>
          canvases.map((node) => (node as HTMLCanvasElement).toDataURL()),
        )
    await page.mouse.move(650, 180)
    const unhovered = await copperFrames()
    for (const y of [300, 420]) {
      await page.mouse.move(295, y)
      // Allow React and the worker to render the hover event before comparing.
      await page.waitForTimeout(100)
      assert.deepEqual(
        await copperFrames(),
        unhovered,
        "X-Ray must not highlight either the selected or unrelated net on hover",
      )
    }
    await page.mouse.move(650, 180)
    // Identical overlapping segments must use the frontmost copper color.
    const crossColor = () =>
      page.locator(activeXRay).evaluate((node) => {
        const original =
          node instanceof HTMLCanvasElement
            ? node
            : node.querySelector<HTMLCanvasElement>(".pcb-webgpu-canvas")!
        const canvas = document.createElement("canvas")
        canvas.width = original.width
        canvas.height = original.height
        const ctx = canvas.getContext("2d")!
        ctx.drawImage(original, 0, 0)
        return Array.from(ctx.getImageData(400, 210, 1, 1).data)
      })
    assert.deepEqual(
      await crossColor(),
      [200, 52, 52, 255],
      "top copper must cover bottom copper in X-Ray",
    )
    await page.mouse.move(650, 180)
    for (const [key, expected] of [
      ["4", [77, 127, 196, 255]],
      ["2", [127, 200, 127, 255]],
      ["1", [200, 52, 52, 255]],
    ] as const) {
      await page.keyboard.press(key)
      await page.waitForFunction(
        ({ selector, expected }) => {
          const node = document.querySelector(selector)!
          const original =
            node instanceof HTMLCanvasElement
              ? node
              : node.querySelector<HTMLCanvasElement>(".pcb-webgpu-canvas")!
          const canvas = document.createElement("canvas")
          canvas.width = original.width
          canvas.height = original.height
          const ctx = canvas.getContext("2d")!
          ctx.drawImage(original, 0, 0)
          return Array.from(ctx.getImageData(400, 210, 1, 1).data).every(
            (value, index) => value === expected[index],
          )
        },
        { selector: activeXRay, expected },
      )
    }
    // Exit by clicking the selected bottom-layer trace.
    await page.mouse.click(475, 300)
    await page.waitForSelector(activeXRay, { state: "detached" })
    await enter(295, 300) // Entry from trace, not just pad.
    await page.mouse.dblclick(650, 180)
    await page.waitForSelector(activeXRay, { state: "detached" })
    await enter()
    await page.mouse.dblclick(250, 420)
    await page.waitForSelector(activeXRay, { state: "detached" })
    await enter()
    await page.mouse.click(650, 180, { button: "right" })
    await page
      .getByRole("menuitem", { name: "Exit X-Ray Net", exact: true })
      .click()
    await page.waitForSelector(activeXRay, { state: "detached" })
    if (!query.includes("gpu"))
      assert.equal(
        await page
          .locator(".pcb-layer-top")
          .evaluate((el) => (el as HTMLElement).style.opacity),
        "1",
      )
    // Both left- and right-click menus add another net without replacing the first.
    const netPixels = () =>
      page.locator(activeXRay).evaluate((node) => {
        const original =
          node instanceof HTMLCanvasElement
            ? node
            : node.querySelector<HTMLCanvasElement>(".pcb-webgpu-canvas")!
        const canvas = document.createElement("canvas")
        canvas.width = original.width
        canvas.height = original.height
        const ctx = canvas.getContext("2d")!
        ctx.drawImage(original, 0, 0)
        return [300, 420].map((y) =>
          [250, 295, 385, 475, 520, 340, 430].map(
            (x) => ctx.getImageData(x, y, 1, 1).data[3],
          ),
        )
      })
    for (const button of ["left", "right"] as const) {
      await enter()
      await page.mouse.click(295, 420, { button })
      await page
        .getByRole("menuitem", { name: "X-Ray U1.1 to U2.2", exact: true })
        .click()
      // Wait for the worker's frame, not just the menu state.
      await page.waitForTimeout(150)
      assert.deepEqual(
        await netPixels(),
        [Array(7).fill(255), Array(7).fill(255)],
        "Adding a net must retain opaque copper and drills for both nets",
      )
      await page.mouse.click(475, 300)
      await page.waitForTimeout(150)
      const remaining = await netPixels()
      assert.deepEqual(
        remaining[1],
        Array(7).fill(255),
        "Removing one net must retain the other",
      )
      assert.equal(remaining[0][0], native ? Math.round(opacity * 255) : 0)
      await page.mouse.click(295, 300, { button })
      await page
        .getByRole("menuitem", { name: "X-Ray CLK", exact: true })
        .click()
      await page.waitForTimeout(150)
      assert.deepEqual(await netPixels(), [
        Array(7).fill(255),
        Array(7).fill(255),
      ])
      if (button === "left") {
        await page.mouse.dblclick(650, 180)
      } else {
        await page.mouse.click(650, 180, { button: "right" })
        await page
          .getByRole("menuitem", { name: "Exit X-Ray Net", exact: true })
          .click()
      }
      await page.waitForSelector(activeXRay, { state: "detached" })
    }
    for (const button of ["left", "right"] as const) {
      await page.mouse.click(295, 300, { button })
      assert.equal(
        await page
          .getByRole("menuitem", { name: "X-Ray CLK", exact: true })
          .count(),
        1,
      )
      await page
        .getByRole("menuitem", { name: "X-Ray DATA", exact: true })
        .click()
      await page.waitForTimeout(150)
      assert.deepEqual(
        await netPixels(),
        [Array(7).fill(255), Array(7).fill(255)],
        "The bus option must inspect every member's copper and drills",
      )
      await page.mouse.dblclick(650, 180)
      await page.waitForSelector(activeXRay, { state: "detached" })
    }
    await enter()
    await page.mouse.click(295, 300, { button: "right" })
    await page
      .getByRole("menuitem", { name: "X-Ray DATA", exact: true })
      .click()
    await page.waitForTimeout(150)
    assert.deepEqual(await netPixels(), [
      Array(7).fill(255),
      Array(7).fill(255),
    ])
    await page.mouse.dblclick(650, 180)
    await page.waitForSelector(activeXRay, { state: "detached" })
    // A drag ending on a pad must not open the menu.
    await page.mouse.move(220, 300)
    await page.mouse.down()
    await page.mouse.move(250, 300, { steps: 5 })
    await page.mouse.up()
    assert.equal(await page.getByRole("menu").count(), 0)
  }
  assert.deepEqual(errors, [])
  console.log(
    "X-Ray Net browser tests passed: layer opacity, pads/traces, all exit gestures, pan, and WebGPU selection",
  )
} finally {
  await browser.close()
  await server.close()
}
