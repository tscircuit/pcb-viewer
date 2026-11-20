import { expect, test } from "bun:test"
import { renderDifferentialPairBoard } from "./fixtures/local-skew/differential-pair-board"
import { openOverlayPage } from "./local-skew-overlay/open-overlay-page"

test("colours the color package cannot parse fall back instead of breaking the viewer", async () => {
  const circuitJson = renderDifferentialPairBoard({ compensated: true })
  const pair = circuitJson.find(
    (element) => element.type === "pcb_differential_pair_local_skew",
  )
  if (!pair) throw new Error("Missing stored skew for the differential pair")
  pair.positive_skew_color = "var(--skew)"
  pair.negative_skew_color = "rgb(0, 128, 0)"

  const { page, errors, close } = await openOverlayPage({
    initialState: { is_showing_local_skew: true },
    circuitJson,
  })
  try {
    await page.evaluate(() =>
      window.updateLocalSkewProps({
        localSkewColors: { positive: "hsl(0.5turn 100% 50%)", negative: "" },
      }),
    )
    const overlay = page.locator(".pcb-local-skew-overlay")
    // Positive skew uses KiCad's blue; negative skew uses the stored green.
    await overlay
      .locator('line[stroke="rgb(0, 0, 255)"]')
      .first()
      .waitFor({ state: "attached" })
    await overlay
      .locator('line[stroke="rgb(0, 128, 0)"]')
      .first()
      .waitFor({ state: "attached" })
    expect(errors).toEqual([])
  } finally {
    await close()
  }
}, 60000)
