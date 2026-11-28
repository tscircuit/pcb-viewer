import { expect, test } from "bun:test"
import "bun-match-svg"
import { fileURLToPath } from "node:url"
import { type Browser, type Page, chromium } from "playwright"
import { Circuit } from "tscircuit"
import { createServer } from "vite"
import { ForumExampleBoard } from "./fixtures/differential-pair-phase-skew/forum-example-board/forum-example-board"

function readTopCopper(page: Page) {
  return page.locator(".pcb-layer-top").evaluate((element) => {
    const canvas = element as HTMLCanvasElement
    return Array.from(
      canvas.getContext("2d")!.getImageData(0, 0, canvas.width, canvas.height)
        .data,
    )
  })
}

async function snapshotBoard(page: Page) {
  const { image, caption } = await page.evaluate(() => {
    const board = document.querySelector(
      ".pcb-layer-board",
    ) as HTMLCanvasElement
    const composite = document.createElement("canvas")
    composite.width = board.width
    composite.height = board.height
    const ctx = composite.getContext("2d")!
    ctx.fillStyle = "#111"
    ctx.fillRect(0, 0, composite.width, composite.height)
    for (const name of ["board", "bottom", "top"]) {
      const canvas = document.querySelector(
        `.pcb-layer-${name}`,
      ) as HTMLCanvasElement
      ctx.drawImage(canvas, 0, 0)
    }
    const hoverText = document.querySelector("[data-phase-skew-hover]")
    let caption = "Phase skew on, nothing hovered"
    if (hoverText) {
      caption = `Phase skew on, hovering trace: ${hoverText.textContent}`
    }
    ctx.fillStyle = "#fff"
    ctx.font = "bold 20px sans-serif"
    ctx.textAlign = "center"
    ctx.textBaseline = "top"
    ctx.fillText(caption, composite.width / 2, 16)
    return { image: composite.toDataURL(), caption }
  })
  return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><title>${caption}</title><image width="800" height="600" href="${image}"/></svg>`
}

function nextFrame(page: Page) {
  return page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
  )
}

test("View menu toggles the phase skew overlay and its hover readout", async () => {
  const circuit = new Circuit()
  circuit.add(<ForumExampleBoard />)
  await circuit.renderUntilSettled()
  const circuitJson = circuit.getCircuitJson()

  const server = await createServer({
    root: fileURLToPath(new URL("../", import.meta.url)),
    server: { host: "127.0.0.1", port: 0 },
    logLevel: "error",
  })
  await server.listen()
  let browser: Browser | undefined
  try {
    browser = await chromium.launch({
      headless: true,
      ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
        ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE }
        : {}),
    })
    const page = await browser.newPage({
      viewport: { width: 800, height: 600 },
    })
    const errors: string[] = []
    page.on("pageerror", (error) => errors.push(error.message))
    await page.route("**/forum-example.circuit.json", (route) =>
      route.fulfill({ json: circuitJson }),
    )
    await page.goto(
      new URL(
        "tests/differential-pair-phase-skew/",
        server.resolvedUrls!.local[0],
      ).href,
    )
    await page.waitForSelector(".pcb-layer-top")

    const menu = page.locator("[data-view-menu] > div > div").first()
    const label = page.getByText("Show Differential Pair Phase Skew", {
      exact: true,
    })
    const checkbox = label.locator("..").locator("input")
    const hoverText = page.locator("[data-phase-skew-hover]")
    const lowerTrace = { x: 371, y: 272 }
    const emptySpace = { x: 400, y: 560 }

    await page.mouse.move(lowerTrace.x, lowerTrace.y)
    await nextFrame(page)
    expect(await hoverText.count()).toBe(0)
    await page.mouse.move(emptySpace.x, emptySpace.y)
    const copperWithoutSkew = await readTopCopper(page)

    await menu.click({ delay: 350 })
    expect(await checkbox.isChecked()).toBe(false)
    await label.click()
    expect(await checkbox.isChecked()).toBe(true)
    await page.mouse.click(emptySpace.x, emptySpace.y)
    await label.waitFor({ state: "detached" })
    await nextFrame(page)

    const copperWithSkew = await readTopCopper(page)
    const changedValues = copperWithSkew.filter(
      (value, index) => value !== copperWithoutSkew[index],
    ).length
    expect(changedValues).toBeGreaterThan(1000)

    await expect(await snapshotBoard(page)).toMatchSvgSnapshot(
      import.meta.path,
      "differential-pair-phase-skew",
    )

    await page.mouse.move(lowerTrace.x, lowerTrace.y)
    await nextFrame(page)
    expect(await hoverText.textContent()).toBe("Lagging 2.351 mm")
    await expect(await snapshotBoard(page)).toMatchSvgSnapshot(
      import.meta.path,
      "differential-pair-phase-skew-hover",
    )

    await page.mouse.move(emptySpace.x, emptySpace.y)
    await menu.click({ delay: 350 })
    await label.click()
    expect(await checkbox.isChecked()).toBe(false)
    await page.mouse.click(emptySpace.x, emptySpace.y)
    await label.waitFor({ state: "detached" })
    await page.mouse.move(lowerTrace.x, lowerTrace.y)
    await nextFrame(page)
    expect(await hoverText.count()).toBe(0)
    expect(errors).toEqual([])
  } finally {
    await browser?.close()
    await server.close()
  }
}, 60_000)
