import { expect, test } from "bun:test"
import { fileURLToPath } from "node:url"
import { createServer } from "vite"
import { runDragAndDropUndoBrowserChecks } from "./drag-and-drop-undo/run-playwright.mjs"

test("drag-and-drop undo respects viewer focus, supports CLI flushed editEvents, and shows toast when empty", async () => {
  const server = await createServer({
    root: fileURLToPath(new URL("../", import.meta.url)),
    server: { host: "127.0.0.1", port: 0 },
    logLevel: "error",
  })
  await server.listen()
  try {
    const baseUrl = server.resolvedUrls!.local[0]!
    if (process.platform === "win32") {
      // Work around Bun-on-Windows child_process pipe hang when Playwright launches Chromium
      const scriptPath = fileURLToPath(
        new URL("./drag-and-drop-undo/run-playwright.mjs", import.meta.url),
      )
      const child = Bun.spawn(["node", scriptPath, baseUrl], {
        stdout: "pipe",
        stderr: "pipe",
      })
      const [exitCode, stdout, stderr] = await Promise.all([
        child.exited,
        new Response(child.stdout).text(),
        new Response(child.stderr).text(),
      ])
      expect(exitCode, `${stdout}\n${stderr}`).toBe(0)
    } else {
      await runDragAndDropUndoBrowserChecks(baseUrl)
    }
  } finally {
    await server.close()
  }
}, 60_000)
