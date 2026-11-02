import { expect } from "bun:test"
import "bun-match-svg"
import { fileURLToPath } from "node:url"
import { type Browser, chromium } from "playwright"
import { createServer } from "vite"

type ExampleArtwork = {
  fixture: "keepout_rect" | "keepout_circle" | "transform"
  addComponents?: number
}

export async function expectExampleArtwork({
  fixture,
  addComponents = 0,
}: ExampleArtwork) {
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
      viewport: { width: 800, height: 700 },
    })
    const errors: string[] = []
    page.on("pageerror", (error) => errors.push(error.message))
    await page.goto(
      `${server.resolvedUrls!.local[0]}tests/example-circuit-json/?fixture=${fixture}`,
    )
    await page.waitForFunction(() => window.exampleArtworkReady)
    const paintedPixels: number[] = []
    for (const stage of addComponents ? ["initial", "added"] : ["initial"]) {
      if (stage === "added") {
        const button = page.getByRole("button", {
          name: "Add Component",
          exact: true,
        })
        if (await button.count())
          for (let index = 0; index < addComponents; index++)
            await button.click()
      }
      await page.evaluate(
        () =>
          new Promise<void>((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
          ),
      )
      const artwork = await page.evaluate(() => {
        const composite = document.createElement("canvas")
        composite.width = 800
        composite.height = 600
        const ctx = composite.getContext("2d")!
        const layers = [
          ...document.querySelectorAll<HTMLCanvasElement>(
            'canvas[class^="pcb-layer-"]',
          ),
        ].sort(
          (left, right) =>
            Number(getComputedStyle(left).zIndex) -
            Number(getComputedStyle(right).zIndex),
        )
        for (const layer of layers) {
          ctx.globalAlpha = Number(getComputedStyle(layer).opacity)
          ctx.drawImage(layer, 0, 0)
        }
        const pixels = ctx.getImageData(0, 0, 800, 600).data
        const paintedPixels = pixels.filter(
          (channel, index) => index % 4 === 3 && channel > 0,
        ).length
        return { image: composite.toDataURL(), paintedPixels }
      })
      paintedPixels.push(artwork.paintedPixels)
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><rect width="800" height="600" fill="#111"/><image width="800" height="600" href="${artwork.image}"/></svg>`
      await expect(svg).toMatchSvgSnapshot(
        import.meta.path,
        `${fixture}-${stage}`,
      )
    }
    expect(errors).toEqual([])
    expect(paintedPixels.every((count) => count > 0)).toBe(true)
    if (addComponents)
      await expect(
        page
          .getByText(
            `Components: ${addComponents + 1} | Updates: ${addComponents}`,
            { exact: true },
          )
          .count(),
      ).resolves.toBe(1)
  } finally {
    await browser?.close()
    await server.close()
  }
}
