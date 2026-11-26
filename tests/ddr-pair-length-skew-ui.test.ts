import { expect, test } from "bun:test"
import { fileURLToPath } from "node:url"
import { type Browser, chromium } from "playwright"
import { createServer } from "vite"

test("shows AM3352 DQS1 end-to-end lengths with the local overlay disabled", async () => {
  const server = await createServer({
    root: fileURLToPath(new URL("../", import.meta.url)),
    server: { host: "127.0.0.1", port: 0 },
    logLevel: "error",
  })
  await server.listen()
  let browser: Browser | undefined
  try {
    browser = await chromium.launch({
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
    })
    const page = await browser.newPage({
      viewport: { width: 800, height: 600 },
    })
    const url = new URL("tests/webgpu/", server.resolvedUrls!.local[0])
    url.searchParams.set("scenario", "canvas")
    url.searchParams.set(
      "circuitJsonUrl",
      "/src/examples/2026/differential-pair-phase-skew/am3352-ddr-track-a.circuit.json",
    )
    await page.goto(url.href)
    await page.mouse.move(400, 300)
    await page.getByRole("button", { name: "Pair Skew" }).click()
    const panel = page.getByRole("region", { name: "End-to-end length skew" })
    await panel
      .getByRole("combobox", { name: "Differential pair" })
      .selectOption({
        label: "DDR_DQS_PAIR1",
      })
    const [skew, positive, negative] = await panel
      .locator("dd")
      .allTextContents()
    expect(positive).toMatch(/^\d+(\.\d+)? mm$/)
    expect(negative).toMatch(/^\d+(\.\d+)? mm$/)
    expect(Number.parseFloat(skew)).toBeCloseTo(
      Math.abs(Number.parseFloat(positive) - Number.parseFloat(negative)),
      5,
    )
    expect(Number.parseFloat(skew)).toBeLessThan(0.001)
    await panel.getByRole("button", { name: "Close pair length skew" }).click()
    expect(await panel.count()).toBe(0)
    await page.locator("[data-view-menu] > div > div").first().click()
    const localOverlay = page.getByText("Show Accumulated Local Length Skew", {
      exact: true,
    })
    expect(await localOverlay.locator("..").locator("input").isChecked()).toBe(
      false,
    )
  } finally {
    await browser?.close()
    await server.close()
  }
}, 60_000)
