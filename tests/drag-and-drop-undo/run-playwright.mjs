import assert from "node:assert/strict"
import { existsSync } from "node:fs"
import { join } from "node:path"
import { chromium } from "playwright"

function resolveWindowsChromiumExecutable() {
  if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE) {
    return process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
  }
  if (process.platform !== "win32") return undefined
  const candidates = [
    process.env.LOCALAPPDATA &&
      join(
        process.env.LOCALAPPDATA,
        "ms-playwright",
        "chromium-1248",
        "chrome-win64",
        "chrome.exe",
      ),
    process.env.LOCALAPPDATA &&
      join(
        process.env.LOCALAPPDATA,
        "ms-playwright",
        "chromium-1208",
        "chrome-win64",
        "chrome.exe",
      ),
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  ].filter(Boolean)
  return candidates.find((p) => existsSync(p))
}

export async function runDragAndDropUndoBrowserChecks(baseUrl) {
  const executablePath = resolveWindowsChromiumExecutable()
  const browser = await chromium.launch({
    headless: true,
    ...(executablePath ? { executablePath } : {}),
  })

  try {
    // 1. Standard mode: side-by-side editor focus isolation + empty-undo toast + Ctrl/Meta+Z
    {
      const page = await browser.newPage({
        viewport: { width: 900, height: 500 },
      })
      const errors = []
      page.on("pageerror", (error) => errors.push(error.message))
      await page.goto(`${baseUrl}tests/drag-and-drop-undo/`)
      await page.waitForSelector(".pcb-layer-top")

      const viewerBox = await page.locator("[data-pcb-viewer]").boundingBox()
      assert(viewerBox, "Expected [data-pcb-viewer] boundingBox")
      const viewerCenterX = viewerBox.x + viewerBox.width / 2
      const viewerCenterY = viewerBox.y + viewerBox.height / 2

      // Reveal toolbar, toggle Edit mode on, and verify empty-undo toast
      await page.mouse.move(viewerCenterX, viewerCenterY)
      await page.locator("[data-edit-button]").click()
      await page.locator("[data-undo-button]").waitFor({ state: "visible" })
      await page.keyboard.press("Control+z")
      await page.getByText("No edits to undo").waitFor({ state: "visible" })

      // Drag component R1 from center by (+80px, -40px)
      await page.mouse.move(viewerCenterX, viewerCenterY)
      await page.mouse.down()
      await page.mouse.move(viewerCenterX + 80, viewerCenterY - 40, {
        steps: 6,
      })
      await page.mouse.up()

      const movedCenter = await page.evaluate(() =>
        window.pcbUndoTest.getComponentCenter(),
      )
      assert(
        Math.abs(movedCenter.x) > 0.5 && Math.abs(movedCenter.y) > 0.5,
        `Expected component to move away from origin, got ${JSON.stringify(movedCenter)}`,
      )

      // Focus side-by-side textarea AND non-input editor shell while hovering mouse over PCB viewer:
      // Ctrl+Z and Meta+Z must NOT steal undo from the code editor!
      await page.locator("[data-code-editor]").click()
      await page.mouse.move(viewerCenterX, viewerCenterY)
      await page.keyboard.press("Control+z")
      await page.keyboard.press("Meta+z")
      assert.deepEqual(
        await page.evaluate(() => window.pcbUndoTest.getComponentCenter()),
        movedCenter,
      )

      await page.locator("[data-editor-shell]").focus()
      await page.keyboard.press("Control+z")
      const editorUndoKeyCount = await page.evaluate(
        () => window.pcbUndoTest.editorUndoKeyCount,
      )
      assert(
        editorUndoKeyCount >= 3,
        `Expected editor shell to receive >=3 undo keydowns, got ${editorUndoKeyCount}`,
      )
      assert.deepEqual(
        await page.evaluate(() => window.pcbUndoTest.getComponentCenter()),
        movedCenter,
      )

      // Click inside PCB viewer to focus it, then press Ctrl+Z -> R1 returns to (0, 0)
      await page.mouse.click(viewerBox.x + 40, viewerBox.y + 200)
      await page.keyboard.press("Control+z")
      const undoneCenter = await page.evaluate(() =>
        window.pcbUndoTest.getComponentCenter(),
      )
      assert(Math.abs(undoneCenter.x) < 1e-4 && Math.abs(undoneCenter.y) < 1e-4)
      assert.deepEqual(errors, [])
      await page.close()
    }

    // 2. CLI immediate-flush mode (editEvents flushed to [] after each drag) + Cmd+Z + Undo button
    {
      const page = await browser.newPage({
        viewport: { width: 900, height: 500 },
      })
      const errors = []
      page.on("pageerror", (error) => errors.push(error.message))
      await page.goto(`${baseUrl}tests/drag-and-drop-undo/?mode=cli-flush`)
      await page.waitForSelector(".pcb-layer-top")

      const viewerBox = await page.locator("[data-pcb-viewer]").boundingBox()
      assert(viewerBox, "Expected [data-pcb-viewer] boundingBox")
      const viewerCenterX = viewerBox.x + viewerBox.width / 2
      const viewerCenterY = viewerBox.y + viewerBox.height / 2

      await page.mouse.move(viewerCenterX, viewerCenterY)
      await page.locator("[data-edit-button]").click()

      // Drag #1: center -> +60px X
      await page.mouse.move(viewerCenterX, viewerCenterY)
      await page.mouse.down()
      await page.mouse.move(viewerCenterX + 60, viewerCenterY, { steps: 5 })
      await page.mouse.up()

      const afterDrag1 = await page.evaluate(() => ({
        center: window.pcbUndoTest.getComponentCenter(),
        eventsCount: window.pcbUndoTest.getEditEventsCount(),
      }))
      assert.equal(afterDrag1.eventsCount, 0)
      assert(afterDrag1.center.x > 0.5)

      // Drag #2: +60px X -> +60px X, -50px Y
      await page.mouse.move(viewerCenterX + 60, viewerCenterY)
      await page.mouse.down()
      await page.mouse.move(viewerCenterX + 60, viewerCenterY - 50, {
        steps: 5,
      })
      await page.mouse.up()

      const afterDrag2 = await page.evaluate(() => ({
        center: window.pcbUndoTest.getComponentCenter(),
        eventsCount: window.pcbUndoTest.getEditEventsCount(),
      }))
      assert.equal(afterDrag2.eventsCount, 0)
      assert(afterDrag2.center.y > 0.5)

      // Meta+Z (Cmd+Z) undoes Drag #2 back to afterDrag1.center
      await page.keyboard.press("Meta+z")
      const afterUndo1 = await page.evaluate(() =>
        window.pcbUndoTest.getComponentCenter(),
      )
      assert(Math.abs(afterUndo1.x - afterDrag1.center.x) < 1e-4)
      assert(Math.abs(afterUndo1.y - afterDrag1.center.y) < 1e-4)

      // Clicking toolbar Undo button undoes Drag #1 back to (0, 0)
      await page.locator("[data-undo-button]").click()
      const afterUndo2 = await page.evaluate(() =>
        window.pcbUndoTest.getComponentCenter(),
      )
      assert(Math.abs(afterUndo2.x) < 1e-4 && Math.abs(afterUndo2.y) < 1e-4)

      // Pressing Ctrl+Z again shows empty-undo toast
      await page.keyboard.press("Control+z")
      await page.getByText("No edits to undo").waitFor({ state: "visible" })
      assert.deepEqual(errors, [])
      await page.close()
    }
  } finally {
    await browser.close()
  }
}

if (process.argv[2]) {
  await runDragAndDropUndoBrowserChecks(process.argv[2])
}
