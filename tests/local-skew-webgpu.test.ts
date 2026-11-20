import { expect, test } from "bun:test"
import { renderCopperCrossingBoard } from "./local-skew-overlay/copper-crossing-board"
import {
  openOverlayPage,
  screenPointOf,
  screenshotPixelsAt,
} from "./local-skew-overlay/open-overlay-page"

test("the default WebGPU renderer paints local skew over the composite copper", async () => {
  const { page, errors, close } = await openOverlayPage({
    initialState: { is_showing_local_skew: true, hidden_layer_opacity: 0.5 },
    circuitJson: await renderCopperCrossingBoard(),
    renderer: "webgpu",
  })
  try {
    // The test drawer paints opaque copper here. With the real GPU drawer,
    // this point coincides with the crossing's opaque top trace.
    const point = await screenPointOf({ page, x: -4, y: 0.3 })
    const [pixel] = await screenshotPixelsAt({ page, points: [point] })
    expect(pixel[1]).toBeGreaterThan(100)
    expect(pixel[2]).toBeGreaterThan(100)
    await page.mouse.move(point.x, point.y)
    const readout = page.locator(".pcb-local-skew-readout")
    await readout.waitFor()
    expect(await readout.textContent()).toStartWith("PAIR: in step")
    expect(errors).toEqual([])
  } finally {
    await close()
  }
}, 60000)
