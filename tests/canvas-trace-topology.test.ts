import { expect, test } from "bun:test"
import { fileURLToPath } from "node:url"
import { type Browser, chromium } from "playwright"
import { createServer } from "vite"

test("Canvas preserves layer transitions instead of painting false copper bridges", async () => {
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
    const page = await browser.newPage()
    const errors: string[] = []
    page.on("pageerror", (error) => errors.push(error.message))
    await page.goto(
      new URL("tests/canvas-trace-topology/", server.resolvedUrls!.local[0])
        .href,
    )
    await page.waitForFunction(() => window.canvasTraceTopologyResults)
    const results = await page.evaluate(() => window.canvasTraceTopologyResults)
    expect(Object.keys(results)).toHaveLength(40)
    for (const [name, alpha] of Object.entries(results)) {
      const shouldPaint = /\/(top-left|top-right|inner-run)$/.test(name)
      expect(alpha, name).toBe(shouldPaint ? 255 : 0)
    }
    expect(errors).toEqual([])
  } finally {
    await browser?.close()
    await server.close()
  }
}, 60_000)
