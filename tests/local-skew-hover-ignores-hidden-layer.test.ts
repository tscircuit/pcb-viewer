import { expect, test } from "bun:test"
import { renderPairBoard } from "./fixtures/local-skew/pair-board"
import {
  openOverlayPage,
  screenPointOf,
} from "./local-skew-overlay/open-overlay-page"

test("hovering reads the visible layer's segment, not a hidden one beneath it", async () => {
  // DP runs beside DN on top to x = 6, drops to the bottom and comes back
  // over its own path to x = -6, then goes round to its load pad. Viewing
  // the bottom with top hidden, x = 0 shows only the bottom return leg.
  const { page, errors, close } = await openOverlayPage({
    initialState: {
      is_showing_local_skew: true,
      selected_layer: "bottom",
      hidden_layer_opacity: 0,
    },
    circuitJson: renderPairBoard({
      positivePath: [
        { x: 18, y: 0, via: true, fromLayer: "top", toLayer: "bottom" },
        { x: 6, y: 0 },
        { x: 6, y: -1.5 },
        { x: 24, y: -1.5 },
        { x: 24, y: 0, via: true, fromLayer: "bottom", toLayer: "top" },
      ],
      negativePath: [],
      pcbTraceGap: "0.45mm",
    }),
  })
  try {
    await page.locator(".pcb-local-skew-overlay svg").waitFor()
    const point = await screenPointOf({ page, x: 0, y: 0.3 })
    await page.mouse.move(point.x, point.y)
    const readout = page.locator(".pcb-local-skew-readout")
    await readout.waitFor()
    // The hidden top stretch is measured in step; the bottom leg isn't
    // beside DN at all.
    expect(await readout.textContent()).toStartWith(
      "PAIR: skew unknown (traces not running together)",
    )
    expect(errors).toEqual([])
  } finally {
    await close()
  }
}, 60000)
