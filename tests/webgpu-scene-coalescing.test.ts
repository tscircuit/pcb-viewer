import { expect, test } from "bun:test"
import { fileURLToPath } from "node:url"
import { type Browser, chromium } from "playwright"
import { createServer } from "vite"

test.failing(
  "compiles only the latest pending TMDS62LEVM worker scene",
  async () => {
    const root = fileURLToPath(new URL("../", import.meta.url))
    const server = await createServer({
      root,
      resolve: {
        alias: [
          {
            find: "@tscircuit/circuit-json-webgpu",
            replacement: `${root}tests/webgpu-scene-coalescing/controlled-drawer.ts`,
          },
        ],
      },
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
        new URL("tests/webgpu-scene-coalescing/", server.resolvedUrls!.local[0])
          .href,
      )
      await page.evaluate(() => window.workerSceneTest.start())
      await page.waitForFunction(() => window.workerSceneTest.stats.ready)

      await page.evaluate(() => {
        window.workerSceneTest.submitScene(1)
        window.workerSceneTest.submitScene(2, true)
        window.workerSceneTest.submitScene(3)
        window.workerSceneTest.submitView()
        window.workerSceneTest.flushFrame()
      })
      await page.waitForFunction(
        () => window.workerSceneTest.stats.flushedFrames === 1,
      )
      const initial = await page.evaluate(() => window.workerSceneTest.stats)
      expect(initial.elementCount).toBe(100_548)
      expect(initial.compiledElementCounts).toEqual([100_548])
      expect(
        initial.renderedFrames.map((frame) => frame.sceneGeneration),
      ).toEqual([3])

      await page.evaluate(() => {
        window.workerSceneTest.submitView()
        window.workerSceneTest.flushFrame()
      })
      await page.waitForFunction(
        () => window.workerSceneTest.stats.flushedFrames === 2,
      )
      expect(
        await page.evaluate(
          () => window.workerSceneTest.stats.compiledElementCounts,
        ),
      ).toEqual([100_548])

      await page.evaluate(() => {
        window.workerSceneTest.submitScene(4, true)
        window.workerSceneTest.flushFrame()
      })
      await page.waitForFunction(
        () => window.workerSceneTest.stats.flushedFrames === 3,
      )
      const updated = await page.evaluate(() => window.workerSceneTest.stats)
      expect(updated.compiledElementCounts).toEqual([100_548, 0])
      expect(updated.renderedFrames.at(-1)?.sceneGeneration).toBe(4)

      await page.evaluate(() => {
        window.workerSceneTest.submitScene(5)
        window.workerSceneTest.dispose()
        window.workerSceneTest.flushFrame()
      })
      await page.waitForFunction(
        () => window.workerSceneTest.stats.flushedFrames === 4,
      )
      const disposed = await page.evaluate(() => window.workerSceneTest.stats)
      expect(disposed.compiledElementCounts).toEqual([100_548, 0])
      expect(disposed.renderedFrames).toHaveLength(3)
      expect(disposed.errors).toEqual([])
      expect(errors).toEqual([])
    } finally {
      await browser?.close()
      await server.close()
    }
  },
  60_000,
)
