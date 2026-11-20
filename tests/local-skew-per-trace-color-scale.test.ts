import { expect, test } from "bun:test"
import { renderAsymmetricSkewBoard } from "./local-skew-overlay/asymmetric-skew-board"
import {
  OFF_BOARD_POINT,
  openOverlayPage,
  screenPointOf,
  screenshotPixelsAt,
} from "./local-skew-overlay/open-overlay-page"

test("overlay colours scale per trace and sign rather than per pair", async () => {
  const { page, errors, close } = await openOverlayPage({
    initialState: {
      is_showing_local_skew: true,
    },
    circuitJson: renderAsymmetricSkewBoard(),
  })
  try {
    await page.locator(".pcb-local-skew-overlay").waitFor()
    const dpA = await screenPointOf({ page, x: -6, y: 0.3 })
    const dnA = await screenPointOf({ page, x: -6, y: -0.3 })
    const dpB = await screenPointOf({ page, x: 0, y: 0.3 })
    const dnB = await screenPointOf({ page, x: 0, y: -0.3 })
    const dpC = await screenPointOf({ page, x: 7, y: 0.3 })
    const dnC = await screenPointOf({ page, x: 7, y: -0.3 })

    await page.mouse.move(OFF_BOARD_POINT.x, OFF_BOARD_POINT.y)
    const [pDpA, pDnA, pDpB, pDnB, pDpC, pDnC] = await screenshotPixelsAt({
      page,
      points: [dpA, dnA, dpB, dnB, dpC, dnC],
    })

    // Stretch A (+1.0 mm on DP, -1.0 mm on DN): reaches each trace's own
    // positive/negative peak, so both saturate despite the 5.0 mm peak ahead.
    // Per-pair scaling would paint ~rgb(204, 204, 255) and ~rgb(255, 204, 204).
    expect(pDpA[2]).toBeGreaterThan(220)
    expect(Math.max(pDpA[0], pDpA[1])).toBeLessThan(30)
    expect(pDnA[0]).toBeGreaterThan(220)
    expect(Math.max(pDnA[1], pDnA[2])).toBeLessThan(30)

    // Stretch B (-2.5 mm on DP, +2.5 mm on DN): half of the 5.0 mm peak on
    // each trace, so both render mid-blended (~rgb(255, 128, 128) / ~rgb(128, 128, 255)).
    expect(pDpB[0]).toBeGreaterThan(220)
    expect(pDpB[1]).toBeGreaterThan(80)
    expect(pDpB[1]).toBeLessThan(180)
    expect(pDpB[2]).toBeGreaterThan(80)
    expect(pDpB[2]).toBeLessThan(180)
    expect(pDnB[2]).toBeGreaterThan(220)
    expect(pDnB[0]).toBeGreaterThan(80)
    expect(pDnB[0]).toBeLessThan(180)
    expect(pDnB[1]).toBeGreaterThan(80)
    expect(pDnB[1]).toBeLessThan(180)

    // Stretch C (-5.0 mm on DP, +5.0 mm on DN): full red on DP, full blue on DN.
    expect(pDpC[0]).toBeGreaterThan(220)
    expect(Math.max(pDpC[1], pDpC[2])).toBeLessThan(30)
    expect(pDnC[2]).toBeGreaterThan(220)
    expect(Math.max(pDnC[0], pDnC[1])).toBeLessThan(30)

    expect(errors).toEqual([])
  } finally {
    await close()
  }
}, 60000)
