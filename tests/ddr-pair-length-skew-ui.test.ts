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
    const panel = page.getByRole("region", { name: "End-to-end length skew" })
    const dqs1 = panel.getByRole("group", { name: "DDR_DQS_PAIR1" })
    await dqs1.waitFor()
    expect(await page.getByRole("button", { name: "Pair Skew" }).count()).toBe(
      0,
    )
    const [skew, positive, negative] = await dqs1
      .locator("dd")
      .allTextContents()
    expect(positive).toMatch(/^\d+(\.\d+)? mm$/)
    expect(negative).toMatch(/^\d+(\.\d+)? mm$/)
    expect(Number.parseFloat(skew)).toBeCloseTo(
      Math.abs(Number.parseFloat(positive) - Number.parseFloat(negative)),
      5,
    )
    expect(Number.parseFloat(skew)).toBeLessThan(0.001)
    await page.locator("[data-view-menu] > div > div").first().click()
    expect(await dqs1.isVisible()).toBe(true)
    const localOverlay = page.getByText("Show Accumulated Local Length Skew", {
      exact: true,
    })
    expect(await localOverlay.locator("..").locator("input").isChecked()).toBe(
      false,
    )

    url.searchParams.set("scenario", "ddr-pair-skew-defaults")
    url.searchParams.delete("circuitJsonUrl")
    await page.setViewportSize({ width: 390, height: 780 })
    await page.goto(url.href)
    await page.addStyleTag({ content: "#root { width: 100% !important }" })
    await dqs1.waitFor()
    expect(await panel.getByRole("group").count()).toBe(1)
    expect(await panel.locator("dd").first().textContent()).toBe("0.000487 mm")
    await page.getByText("layer:", { exact: false }).first().click()
    expect(await dqs1.isVisible()).toBe(true)
    await page.locator("[data-view-menu] > div > div").first().click()
    expect(await localOverlay.locator("..").locator("input").isChecked()).toBe(
      false,
    )
  } finally {
    await browser?.close()
    await server.close()
  }
}, 60_000)
