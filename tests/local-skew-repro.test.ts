import { expect, test } from "bun:test"
import { renderDifferentialPairBoard } from "./fixtures/local-skew/differential-pair-board"
import {
  MENU_CLICK_DELAY_MS,
  openOverlayPage,
} from "./local-skew-overlay/open-overlay-page"

test("the viewer opens a length-matched USB pair with stored local skew", async () => {
  const circuitJson = renderDifferentialPairBoard({ compensated: true })
  const traces = circuitJson.filter((element) => element.type === "pcb_trace")
  expect(traces).toHaveLength(2)
  expect(traces[0].trace_length).toBeCloseTo(traces[1].trace_length!, 3)
  const skew = circuitJson.find(
    (element) => element.type === "pcb_differential_pair_local_skew",
  )
  expect(skew?.max_local_skew).toBeCloseTo(1.236, 3)
  expect(skew?.positive.pcb_trace_id).toBe(traces[0].pcb_trace_id)
  expect(skew?.negative.pcb_trace_id).toBe(traces[1].pcb_trace_id)

  const { page, errors, close } = await openOverlayPage({
    circuitJson,
    initialState: {},
  })
  try {
    const copper = page.locator(".pcb-layer-top")
    expect(
      await copper.evaluate((canvas: HTMLCanvasElement) => {
        const pixels = canvas
          .getContext("2d")!
          .getImageData(0, 0, canvas.width, canvas.height)
        return pixels.data.some((value, index) => index % 4 === 3 && value > 0)
      }),
    ).toBe(true)
    await page.locator("[data-view-menu] > div > div").first().click({
      delay: MENU_CLICK_DELAY_MS,
    })
    await page.getByText("Show Copper Pours", { exact: true }).waitFor()
    expect(
      await page.getByText("Show Local Skew", { exact: true }).count(),
    ).toBe(0)
    expect(errors).toEqual([])
  } finally {
    await close()
  }
}, 60000)
