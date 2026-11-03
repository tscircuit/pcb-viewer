import { expect } from "bun:test"
import { fileURLToPath } from "node:url"
import { type Browser, chromium } from "playwright"
import { createServer } from "vite"

export async function checkFirstZoom() {
  const server = await createServer({
    root: fileURLToPath(new URL("../../", import.meta.url)),
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
    await page.goto(
      new URL("tests/first-zoom/", server.resolvedUrls!.local[0]).href,
    )
    await page.waitForFunction(
      () => window.pcbFirstZoomTest?.pendingFrameCount() > 0,
      undefined,
      { polling: 50 },
    )
    // Let React commit the hook's external-update render before the frame.
    await page.waitForTimeout(100)
    await page.evaluate(() => window.pcbFirstZoomTest.flushFrame())
    await page.waitForFunction(
      () => {
        const bounds = window.pcbFirstZoomTest.getPaintedBoardBounds()
        return bounds && bounds.maxY - bounds.minY > 440
      },
      undefined,
      { polling: 50 },
    )
    const fittedBounds = await page.evaluate(() =>
      window.pcbFirstZoomTest.getPaintedBoardBounds(),
    )
    expect(
      await page.evaluate(() => window.pcbFirstZoomTest.elementCount),
    ).toBe(100_548)
    expect(fittedBounds).not.toBeNull()
    await page.mouse.move(400, 300)
    await page.mouse.wheel(0, -80)
    await page.waitForFunction(
      () => window.pcbFirstZoomTest.pendingFrameCount() > 0,
      undefined,
      { polling: 50 },
    )
    await page.evaluate(() => window.pcbFirstZoomTest.flushFrame())
    await page.waitForFunction(
      (bounds) =>
        JSON.stringify(window.pcbFirstZoomTest.getPaintedBoardBounds()) !==
        JSON.stringify(bounds),
      fittedBounds,
      { polling: 50 },
    )
    const zoomedBounds = await page.evaluate(() =>
      window.pcbFirstZoomTest.getPaintedBoardBounds(),
    )
    expect(zoomedBounds).not.toBeNull()
    expect(errors).toEqual([])
    expect(
      (zoomedBounds!.maxY - zoomedBounds!.minY) /
        (fittedBounds!.maxY - fittedBounds!.minY),
    ).toBeCloseTo(1.08, 2)
    expect(
      Math.abs((zoomedBounds!.minX + zoomedBounds!.maxX) / 2 - 400),
    ).toBeLessThan(2)
    expect(
      Math.abs((zoomedBounds!.minY + zoomedBounds!.maxY) / 2 - 300),
    ).toBeLessThan(2)

    await page.evaluate(() => {
      const canvas = document.querySelector(".pcb-layer-board")!
      for (let index = 0; index < 10; index++) {
        canvas.dispatchEvent(
          new WheelEvent("wheel", {
            bubbles: true,
            cancelable: true,
            clientX: 400,
            clientY: 300,
            deltaY: -5,
          }),
        )
      }
    })
    await page.evaluate(() => window.pcbFirstZoomTest.flushFrame())
    await page.waitForFunction(
      (bounds) =>
        JSON.stringify(window.pcbFirstZoomTest.getPaintedBoardBounds()) !==
        JSON.stringify(bounds),
      zoomedBounds,
      { polling: 50 },
    )
    const burstBounds = await page.evaluate(() =>
      window.pcbFirstZoomTest.getPaintedBoardBounds(),
    )
    expect(burstBounds).not.toBeNull()
    expect(
      (burstBounds!.maxY - burstBounds!.minY) /
        (zoomedBounds!.maxY - zoomedBounds!.minY),
    ).toBeCloseTo(1.005 ** 10, 2)
    await page.mouse.down()
    await page.mouse.move(440, 280, { steps: 4 })
    await page.mouse.up()
    await page.evaluate(() => window.pcbFirstZoomTest.flushFrame())
    await page.waitForFunction(
      (bounds) =>
        JSON.stringify(window.pcbFirstZoomTest.getPaintedBoardBounds()) !==
        JSON.stringify(bounds),
      burstBounds,
      { polling: 50 },
    )
    const pannedBounds = await page.evaluate(() =>
      window.pcbFirstZoomTest.getPaintedBoardBounds(),
    )
    expect(pannedBounds).not.toBeNull()
    expect(pannedBounds!.minX - burstBounds!.minX).toBeCloseTo(40, 0)
    expect(pannedBounds!.minY - burstBounds!.minY).toBeCloseTo(-20, 0)
  } finally {
    await browser?.close()
    await server.close()
  }
}
