import { expect, test } from "bun:test"
import { fileURLToPath } from "node:url"
import type { AnyCircuitElement } from "circuit-json"
import { chromium } from "playwright"
import { createServer } from "vite"

const snapshot = new URL(
  "./__snapshots__/ddr-end-to-end-skew.png",
  import.meta.url,
)
const boardPath =
  "/src/examples/2026/differential-pair-end-to-end-skew/am3352-ddr-track-a.circuit.json"

test("Canvas renders one end-to-end skew color per DDR pair", async () => {
  const server = await createServer({
    root: fileURLToPath(new URL("../", import.meta.url)),
    server: { host: "127.0.0.1", port: 0 },
    logLevel: "error",
  })
  await server.listen()
  try {
    const browser = await chromium.launch({
      headless: true,
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
    })
    try {
      const page = await browser.newPage()
      const updateSnapshot =
        process.argv.includes("--update-snapshots") ||
        process.argv.includes("-u") ||
        process.env.BUN_UPDATE_SNAPSHOTS === "1"
      await page.route("**/ddr-end-to-end-skew", (route) =>
        route.fulfill({ contentType: "text/html", body: "<!doctype html>" }),
      )
      if (!updateSnapshot) {
        await page.route("**/ddr-end-to-end-skew.png", (route) =>
          route.fulfill({ path: fileURLToPath(snapshot) }),
        )
      }
      const urls = server.resolvedUrls
      if (!urls || urls.local.length === 0) throw new Error("Vite URL missing")
      await page.goto(new URL("ddr-end-to-end-skew", urls.local[0]).href)

      const result = await page.evaluate(
        async ({ boardPath, updateSnapshot }) => {
          const modulePath = "/src/lib/draw-pcb-trace.ts"
          const {
            drawPcbTraceElementsForLayer,
          }: typeof import("../src/lib/draw-pcb-trace") = await import(
            modulePath
          )
          const response = await fetch(boardPath)
          if (!response.ok) throw new Error("DDR Circuit JSON unavailable")
          const elements: AnyCircuitElement[] = await response.json()
          const pairs = [
            {
              label: "CK (+0.070 mm) / Inner 4",
              layer: "inner4_copper",
              traceX: [-3.98, -4.511],
              traceY: -7.025,
            },
            {
              label: "DQS0 (+0.387 mm) / Inner 2",
              layer: "inner2_copper",
              traceX: [3.6, 4.0125],
              traceY: -7.05,
            },
            {
              label: "DQS1 (+0.0005 mm) / Bottom",
              layer: "bottom_copper",
              traceX: [1.599, 1.821],
              traceY: -9.2,
            },
          ] as const

          // Show the same 13 × 25 mm viewport on each pair's routed layer.
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
          const layerContext = layerCanvas.getContext("2d")!
          const transform = { a: 26, b: 0, c: 0, d: -26, e: 169, f: -104 }

          const colors = pairs.map(
            ({ layer, label, traceX, traceY }, index) => {
              const x = index * (width + gap)
              context.fillStyle = "white"
              context.fillText(label, x + 12, 23)
              context.fillStyle = "black"
              context.fillRect(x, header, width, height)
              layerContext.clearRect(0, 0, width, height)
              drawPcbTraceElementsForLayer({
                canvas: layerCanvas,
                elements,
                layers: [layer],
                realToCanvasMat: transform,
                showCopperPours: false,
                showDifferentialPairEndToEndSkew: true,
              })
              context.drawImage(layerCanvas, x, header)
              return traceX.map((traceCenter) => {
                const pixelX = Math.floor(
                  transform.a * traceCenter + transform.e,
                )
                const pixelY = Math.floor(transform.d * traceY + transform.f)
                return Array.from(
                  layerContext.getImageData(pixelX, pixelY, 1, 1).data,
                )
              })
            },
          )

          if (updateSnapshot) {
            return { colors, png: canvas.toDataURL().split(",")[1] }
          }

          const reference = new Image()
          reference.src = "/ddr-end-to-end-skew.png"
          await reference.decode()
          if (
            reference.width !== canvas.width ||
            reference.height !== canvas.height
          ) {
            throw new Error("DDR end-to-end skew snapshot dimensions changed")
          }
          const referenceCanvas = document.createElement("canvas")
          referenceCanvas.width = reference.width
          referenceCanvas.height = reference.height
          const referenceContext = referenceCanvas.getContext("2d")!
          referenceContext.drawImage(reference, 0, 0)

          // Exclude system-font headers and allow minor antialiasing differences.
          const changedPixels = pairs.map(({ label }, index) => {
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
              ) {
                count++
              }
            }
            return { label, count }
          })
          return { colors, changedPixels }
        },
        { boardPath, updateSnapshot },
      )

      expect(result.colors).toEqual([
        [
          [209, 209, 255, 255],
          [209, 209, 255, 255],
        ],
        [
          [0, 0, 255, 255],
          [0, 0, 255, 255],
        ],
        [
          [255, 255, 255, 255],
          [255, 255, 255, 255],
        ],
      ])
      if (result.png !== undefined) {
        await Bun.write(
          snapshot,
          Uint8Array.from(Buffer.from(result.png, "base64")),
        )
      } else if (result.changedPixels !== undefined) {
        for (const { label, count } of result.changedPixels) {
          expect(count, `Changed pixels in ${label}`).toBeLessThanOrEqual(50)
        }
      }
    } finally {
      await browser.close()
    }
  } finally {
    await server.close()
  }
}, 60_000)
