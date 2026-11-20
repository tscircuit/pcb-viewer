import { expect, test } from "bun:test"
import { renderCopperCrossingBoard } from "./local-skew-overlay/copper-crossing-board"
import {
  openOverlayPage,
  screenshotPixelsAt,
  toggleLocalSkew,
} from "./local-skew-overlay/open-overlay-page"

test("WebGPU local skew follows copper order in pixels and hover without replacing the renderer", async () => {
  const { page, errors, close } = await openOverlayPage({
    initialState: { hidden_layer_opacity: 0.5 },
    circuitJson: await renderCopperCrossingBoard(),
    renderer: "webgpu",
  })
  try {
    const gpu = page.locator(".pcb-webgpu-canvas")
    const originalCanvas = await gpu.elementHandle()
    const overlay = page.locator(".pcb-local-skew-overlay")
    const readout = page.locator(".pcb-local-skew-readout")
    // A centered 40 × 20 mm board fits to 75% of the 600 px viewport width.
    const covered = { x: 300 - 4 * 11.25, y: 200 - 0.3 * 11.25 }
    const visible = { x: 300 + 11.25, y: covered.y }
    await toggleLocalSkew({ page })
    await page.mouse.move(visible.x, visible.y)
    await readout.waitFor()
    expect(await readout.textContent()).toStartWith("PAIR: local skew 0.000 mm")
    expect(await overlay.locator("svg").count()).toBe(0)
    const [coveredPixel, visiblePixel] = await screenshotPixelsAt({
      page,
      points: [covered, visible],
    })
    expect(coveredPixel).toEqual([200, 52, 52])
    expect(Math.min(...visiblePixel)).toBeGreaterThan(100)
    expect(Math.max(...visiblePixel)).toBeLessThan(155)

    const lastPick = () => page.evaluate(() => window.lastLocalSkewPick!)
    const visiblePick = await lastPick()
    await page.mouse.move(covered.x, covered.y)
    await page.waitForFunction(
      (id) => (window.lastLocalSkewPick?.id ?? 0) > id,
      visiblePick.id,
    )
    expect((await lastPick()).layer).toBeUndefined()
    await readout.waitFor({ state: "detached" })
    await page.keyboard.press("4")
    // Selecting bottom puts both the stroke and its tooltip above the crossing.
    await readout.waitFor()
    const foregroundPick = await lastPick()
    await page.evaluate(() =>
      window.updateLocalSkewProps({
        localSkewColors: { zero: "lime" },
      }),
    )
    await page.waitForFunction(
      (id) => (window.lastLocalSkewPick?.id ?? 0) > id,
      foregroundPick.id,
    )
    const [foregroundPixel] = await screenshotPixelsAt({
      page,
      points: [covered],
    })
    expect(foregroundPixel).toEqual([0, 255, 0])

    await toggleLocalSkew({ page })
    await overlay.waitFor({ state: "detached" })
    expect(
      await gpu.evaluate(
        (canvas, original) => canvas === original,
        originalCanvas,
      ),
    ).toBe(true)
    expect(
      await page.locator(".pcb-layer-top, [data-webgpu-error]").count(),
    ).toBe(0)
    expect(
      await page.evaluate(() =>
        localStorage.getItem("pcb_viewer_rendering_engine"),
      ),
    ).toBeNull()
    expect(errors).toEqual([])
  } finally {
    await close()
  }
}, 60000)
