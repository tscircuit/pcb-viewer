import { expect, test } from "bun:test"
import { renderLayerCrossingBoard } from "./local-skew-overlay/layer-crossing-board"
import {
  openOverlayPage,
  screenPointOf,
} from "./local-skew-overlay/open-overlay-page"

test("hovering reads the visible layer's segment, not a hidden one beneath it", async () => {
  const { page, errors, close } = await openOverlayPage({
    initialState: {
      is_showing_local_skew: true,
      selected_layer: "bottom",
      hidden_layer_opacity: 0,
    },
    circuitJson: renderLayerCrossingBoard(),
  })
  try {
    await page.locator(".pcb-local-skew-overlay svg").waitFor()
    const point = await screenPointOf({ page, x: 0, y: 0.3 })
    await page.mouse.move(point.x, point.y)
    const readout = page.locator(".pcb-local-skew-readout")
    await readout.waitFor()
    expect(await readout.textContent()).toStartWith(
      "BOT_PAIR: local skew 0.000 mm",
    )
    expect(errors).toEqual([])
  } finally {
    await close()
  }
}, 60000)
