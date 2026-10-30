import { expect, test } from "bun:test"
import { fileURLToPath } from "node:url"
import { type Browser, chromium } from "playwright"
import { createServer } from "vite"
import { expectBoardFraming } from "./viewport-framing/expect-board-framing"

test("fits physical boards and refits geometry updates while retaining component-edit views", async () => {
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
      viewport: { width: 800, height: 700 },
    })
    const errors: string[] = []
    page.on("pageerror", (error) => errors.push(error.message))
    const url = new URL(
      "tests/viewport-framing/",
      server.resolvedUrls!.local[0],
    )

    await page.goto(url.href)
    await expectBoardFraming(page, { width: 428.43, height: 450 })

    url.searchParams.set("scenario", "panel")
    await page.goto(url.href)
    await expectBoardFraming(page, { width: 600, height: 450 })
    await page.getByRole("button", { name: "Grow panel", exact: true }).click()
    await expectBoardFraming(page, { width: 600, height: 180 })

    url.searchParams.set("scenario", "multiple_boards")
    await page.goto(url.href)
    await expectBoardFraming(page, { width: 600, height: 240 })
    await page
      .getByRole("button", { name: "Move second board", exact: true })
      .click()
    await expectBoardFraming(page, { width: 600, height: 70.59 })

    const fittedBounds = await page.evaluate(() =>
      window.pcbViewportTest.getPaintedBoardBounds(),
    )
    await page.mouse.move(400, 320)
    await page.mouse.wheel(0, -60)
    await page.mouse.move(500, 350)
    await page.mouse.down({ button: "middle" })
    await page.mouse.move(520, 365, { steps: 5 })
    await page.mouse.up({ button: "middle" })
    await page.waitForFunction(
      (bounds) =>
        JSON.stringify(window.pcbViewportTest.getPaintedBoardBounds()) !==
        JSON.stringify(bounds),
      fittedBounds,
    )
    // Stop wheel inertia before saving the user's chosen camera.
    await page.waitForTimeout(300)
    const editedView = await page.evaluate(() => ({
      bounds: window.pcbViewportTest.getPaintedBoardBounds(),
      renderCount: window.pcbViewportTest.renderCount,
    }))
    await page
      .getByRole("button", { name: "Move component", exact: true })
      .click()
    await page.waitForFunction(
      (renderCount) => window.pcbViewportTest.renderCount > renderCount,
      editedView.renderCount,
    )
    await page.evaluate(
      () =>
        new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        ),
    )
    expect(
      await page.evaluate(() => window.pcbViewportTest.getPaintedBoardBounds()),
    ).toEqual(editedView.bounds)
    expect(errors).toEqual([])
  } finally {
    await browser?.close()
    await server.close()
  }
}, 60000)
