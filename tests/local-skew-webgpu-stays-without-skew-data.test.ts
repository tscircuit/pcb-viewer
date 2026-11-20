import { expect, test } from "bun:test"
import { renderDifferentialPairBoard } from "./fixtures/local-skew/differential-pair-board"
import { openOverlayPage } from "./local-skew-overlay/open-overlay-page"

test("with local skew on, a board without stored skew stays on WebGPU", async () => {
  const circuitJson = renderDifferentialPairBoard({ compensated: true }).filter(
    (element) => element.type !== "pcb_differential_pair_local_skew",
  )
  const { page, errors, close } = await openOverlayPage({
    initialState: { is_showing_local_skew: true },
    circuitJson,
    renderer: "webgpu",
  })
  try {
    await page.locator('[data-pcb-renderer="webgpu"]').waitFor()
    expect(await page.locator(".pcb-layer-top").count()).toBe(0)
    expect(await page.locator(".pcb-local-skew-overlay").count()).toBe(0)
    expect(errors).toEqual([])
  } finally {
    await close()
  }
}, 60000)
