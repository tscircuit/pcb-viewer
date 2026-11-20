import { expect, test } from "bun:test"
import { renderLayerCrossingBoard } from "./local-skew-overlay/layer-crossing-board"
import {
  OFF_BOARD_POINT,
  openOverlayPage,
  screenPointOf,
  screenshotPixelsAt,
} from "./local-skew-overlay/open-overlay-page"

test("each layer's overlay paints real pixels with the selected layer in front", async () => {
  const { page, errors, close } = await openOverlayPage({
    initialState: {
      is_showing_local_skew: true,
      selected_layer: "top",
      hidden_layer_opacity: 0.5,
    },
    circuitJson: renderLayerCrossingBoard(),
  })
  try {
    await page.locator(".pcb-local-skew-overlay").waitFor()
    const topOnly = await screenPointOf({ page, x: -4, y: 0.3 })
    const bottomOnly = await screenPointOf({ page, x: 0, y: 4 })
    const crossing = await screenPointOf({ page, x: 0, y: 0.3 })
    await page.mouse.move(OFF_BOARD_POINT.x, OFF_BOARD_POINT.y)

    // With top selected: top blue is opaque, bottom white is 50% visible,
    // and top blue paints over bottom white at the crossing.
    const [topBefore, bottomBefore, crossBefore] = await screenshotPixelsAt({
      page,
      points: [topOnly, bottomOnly, crossing],
    })
    expect(topBefore[2]).toBeGreaterThan(220)
    expect(Math.max(topBefore[0], topBefore[1])).toBeLessThan(30)
    expect(Math.min(...bottomBefore)).toBeGreaterThan(100)
    expect(Math.max(...bottomBefore)).toBeLessThan(200)
    expect(crossBefore[2]).toBeGreaterThan(220)
    expect(Math.max(crossBefore[0], crossBefore[1])).toBeLessThan(30)

    // Press "2" to select the bottom layer: bottom white becomes opaque and
    // paints over the now-faded top blue at the crossing.
    await page.keyboard.press("2")
    await page
      .locator('.pcb-local-skew-overlay svg[data-layer="bottom"][opacity="1"]')
      .waitFor()
    const [topAfter, bottomAfter, crossAfter] = await screenshotPixelsAt({
      page,
      points: [topOnly, bottomOnly, crossing],
    })
    expect(topAfter[2]).toBeGreaterThan(90)
    expect(topAfter[2]).toBeLessThan(190)
    expect(Math.max(topAfter[0], topAfter[1])).toBeLessThan(30)
    expect(Math.min(...bottomAfter)).toBeGreaterThan(220)
    expect(Math.min(...crossAfter)).toBeGreaterThan(220)

    expect(errors).toEqual([])
  } finally {
    await close()
  }
}, 60000)
