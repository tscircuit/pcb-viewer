import { expect, test } from "bun:test"
import { renderAsymmetricSkewBoard } from "./local-skew-overlay/asymmetric-skew-board"
import {
  openOverlayPage,
  screenPointOf,
  screenshotPixelsAt,
} from "./local-skew-overlay/open-overlay-page"

test("custom colours and KiCad's log scale change the rendered skew pixels", async () => {
  const { page, errors, close } = await openOverlayPage({
    initialState: { is_showing_local_skew: true },
    circuitJson: renderAsymmetricSkewBoard(),
  })
  try {
    // DP at x = 0 is halfway to its negative peak; at x = -6 it reaches
    // its positive peak. Sample the board after changing the public props.
    const points = [
      await screenPointOf({ page, x: 0, y: 0.3 }),
      await screenPointOf({ page, x: -6, y: 0.3 }),
    ]
    const [defaultNegative, defaultPositive] = await screenshotPixelsAt({
      page,
      points,
    })
    expect(defaultNegative[0]).toBeGreaterThan(220)
    expect(defaultPositive[2]).toBeGreaterThan(220)

    const localSkewColors = {
      zero: "#00ff00",
      positive: "magenta",
      negative: "rgb(255, 255, 0)",
      unknown: "cyan",
    }
    await page.evaluate(
      (colors) => window.updateLocalSkewProps({ localSkewColors: colors }),
      localSkewColors,
    )
    await page
      .locator('line[stroke="rgb(128, 255, 0)"]')
      .first()
      .waitFor({ state: "attached" })
    const [linear, positive] = await screenshotPixelsAt({ page, points })
    expect(linear[0]).toBeGreaterThan(100)
    expect(linear[0]).toBeLessThan(150)
    expect(linear[1]).toBeGreaterThan(220)
    expect(linear[2]).toBeLessThan(35)
    expect(positive[0]).toBeGreaterThan(220)
    expect(positive[1]).toBeLessThan(35)
    expect(positive[2]).toBeGreaterThan(220)

    await page.evaluate(
      (colors) =>
        window.updateLocalSkewProps({
          localSkewColors: colors,
          localSkewUseLogScale: true,
        }),
      localSkewColors,
    )
    const logRed = Math.round((255 * Math.log(5.5)) / Math.log(10))
    await page
      .locator(`line[stroke="rgb(${logRed}, 255, 0)"]`)
      .first()
      .waitFor({ state: "attached" })
    const [log, logPositive] = await screenshotPixelsAt({ page, points })
    expect(log[0]).toBeGreaterThan(linear[0] + 40)
    expect(log.slice(1)).toEqual(linear.slice(1))
    expect(logPositive).toEqual(positive)
    expect(errors).toEqual([])
  } finally {
    await close()
  }
}, 60000)
