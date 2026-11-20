import { expect, test } from "bun:test"
import { renderCopperCrossingBoard } from "./local-skew-overlay/copper-crossing-board"
import { openOverlayPage } from "./local-skew-overlay/open-overlay-page"

test("on WebGPU the readout stays up while the pointer moves along a segment", async () => {
  const { page, errors, close } = await openOverlayPage({
    initialState: { is_showing_local_skew: true, hidden_layer_opacity: 0.5 },
    circuitJson: await renderCopperCrossingBoard(),
    renderer: "webgpu",
  })
  try {
    const readout = page.locator(".pcb-local-skew-readout")
    // A visible stretch of DP on bottom, right of the top-layer crossing.
    const start = { x: 300 + 11.25, y: 200 - 0.3 * 11.25 }
    await page.mouse.move(start.x, start.y)
    await readout.waitFor()
    await page.evaluate(() => {
      new MutationObserver(() => {
        if (document.querySelector(".pcb-local-skew-readout")) return
        document.body.dataset.readoutBlinked = "true"
      }).observe(document.body, { childList: true, subtree: true })
    })
    const firstPick = await page.evaluate(() => window.lastLocalSkewPick!.id)
    // Each move asks the worker again; the answer arrives a frame later.
    // x = 1 to 1.7 mm stays clear of top-layer copper.
    await page.mouse.move(start.x + 8, start.y, { steps: 8 })
    await page.waitForFunction(
      (id) => (window.lastLocalSkewPick?.id ?? 0) > id,
      firstPick,
    )
    expect(await readout.count()).toBe(1)
    expect(
      await page.evaluate(() => document.body.dataset.readoutBlinked),
    ).toBeUndefined()
    expect(errors).toEqual([])
  } finally {
    await close()
  }
}, 60000)
