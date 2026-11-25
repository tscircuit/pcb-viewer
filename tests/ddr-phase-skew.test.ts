import { expect, test } from "bun:test"
import { fileURLToPath } from "node:url"
import type { AnyCircuitElement } from "circuit-json"
import { type Browser, chromium } from "playwright"
import { createServer } from "vite"

const snapshot = new URL("./__snapshots__/ddr-phase-skew.png", import.meta.url)
const boardPath =
  "/src/examples/2026/differential-pair-phase-skew/am3352-ddr-track-a.circuit.json"

test("Canvas phase skew across the three AM3352 DDR pairs", async () => {
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
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
    })
    const page = await browser.newPage()
    const updateSnapshot =
      process.argv.includes("--update-snapshots") ||
      process.argv.includes("-u") ||
      process.env.BUN_UPDATE_SNAPSHOTS === "1"
    await page.route("**/ddr-phase-skew", (route) =>
      route.fulfill({ contentType: "text/html", body: "<!doctype html>" }),
    )
    await page.route("**/ddr-phase-skew.png", (route) =>
      route.fulfill({ path: fileURLToPath(snapshot) }),
    )
    await page.goto(
      new URL("ddr-phase-skew", server.resolvedUrls!.local[0]).href,
    )

    const result = await page.evaluate(
      async ({ boardPath, updateSnapshot }) => {
        const modulePath = "/src/lib/draw-pcb-trace.ts"
        const {
          drawPcbTraceElementsForLayer,
        }: typeof import("../src/lib/draw-pcb-trace") = await import(modulePath)
        const elements: AnyCircuitElement[] = await (
          await fetch(boardPath)
        ).json()
        const pairs = [
          { name: "CK", layer: "inner4_copper", label: "Inner 4" },
          { name: "DQS0", layer: "inner2_copper", label: "Inner 2" },
          { name: "DQS1", layer: "bottom_copper", label: "Bottom" },
        ] as const

        // Use the same 13 × 25 mm viewport on each pair's routed layer.
        const width = 338
        const height = 650
        const header = 34
        const gap = 2
        const canvas = document.createElement("canvas")
        canvas.width = pairs.length * width + (pairs.length - 1) * gap
        canvas.height = header + height
        const context = canvas.getContext("2d")!
        context.fillStyle = "#20252d"
        context.fillRect(0, 0, canvas.width, canvas.height)
        context.font = "bold 16px sans-serif"
        const layerCanvas = document.createElement("canvas")
        layerCanvas.width = width
        layerCanvas.height = height

        for (const [index, { name, layer, label }] of pairs.entries()) {
          const x = index * (width + gap)
          context.fillStyle = "white"
          context.fillText(`${name}  ·  ${label}`, x + 12, 23)
          context.fillStyle = "black"
          context.fillRect(x, header, width, height)
          layerCanvas.getContext("2d")!.clearRect(0, 0, width, height)
          drawPcbTraceElementsForLayer({
            canvas: layerCanvas,
            elements,
            layers: [layer],
            realToCanvasMat: { a: 26, b: 0, c: 0, d: -26, e: 169, f: -104 },
            showCopperPours: false,
            showDifferentialPairPhaseSkew: true,
          })
          context.drawImage(layerCanvas, x, header)
        }

        if (updateSnapshot) return { png: canvas.toDataURL().split(",")[1] }

        const reference = new Image()
        reference.src = "/ddr-phase-skew.png"
        await reference.decode()
        if (
          reference.width !== canvas.width ||
          reference.height !== canvas.height
        )
          throw new Error("DDR phase skew snapshot dimensions changed")
        const referenceCanvas = document.createElement("canvas")
        referenceCanvas.width = reference.width
        referenceCanvas.height = reference.height
        const referenceContext = referenceCanvas.getContext("2d")!
        referenceContext.drawImage(reference, 0, 0)

        // Compare each copper view separately and exclude system-font headers.
        const changedPixels = pairs.map(({ name }, index) => {
          const x = index * (width + gap)
          const actual = context.getImageData(x, header, width, height).data
          const expected = referenceContext.getImageData(
            x,
            header,
            width,
            height,
          ).data
          let count = 0
          for (let pixel = 0; pixel < actual.length; pixel += 4) {
            if (
              Math.abs(actual[pixel] - expected[pixel]) > 24 ||
              Math.abs(actual[pixel + 1] - expected[pixel + 1]) > 24 ||
              Math.abs(actual[pixel + 2] - expected[pixel + 2]) > 24
            )
              count++
          }
          return { name, count }
        })
        return { changedPixels }
      },
      { boardPath, updateSnapshot },
    )

    if (result.png !== undefined) {
      await Bun.write(
        snapshot,
        Uint8Array.from(Buffer.from(result.png, "base64")),
      )
      return
    }
    // Allow small differences in Chromium's antialiasing between platforms.
    for (const { name, count } of result.changedPixels!) {
      expect(count, `Changed pixels in the ${name} panel`).toBeLessThanOrEqual(
        50,
      )
    }
  } finally {
    await browser?.close()
    await server.close()
  }
}, 60_000)
