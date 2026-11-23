import { expect, test } from "bun:test"
import {
  boardPointToScreen,
  openPhaseSkewPage,
  togglePhaseSkew,
} from "./fixtures/phase-skew/open-phase-skew-page"
import { renderUnnamedPairBoard } from "./fixtures/phase-skew/unnamed-pair-board"

test("hovering an unnamed trace of a differential pair shows its phase skew", async () => {
  const { page, errors, close } = await openPhaseSkewPage({
    circuitJson: renderUnnamedPairBoard(),
    renderer: "canvas",
  })
  try {
    await togglePhaseSkew({ page })
    const positiveTrace = boardPointToScreen({ x: 0, y: 0.3 })
    await page.mouse.move(positiveTrace.x, positiveTrace.y)
    const label = page.locator(".pcb-phase-skew-label")
    await label.waitFor()
    expect(await label.textContent()).toBe("phase skew max 0.000 mm")
    expect(errors).toEqual([])
  } finally {
    await close()
  }
}, 60000)
