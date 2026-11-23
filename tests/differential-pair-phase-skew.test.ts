import { expect, test } from "bun:test"
import "bun-match-svg"
import { cju } from "@tscircuit/circuit-json-util"
import {
  boardPointToScreen,
  openPhaseSkewPage,
  screenshotPixelsAt,
  snapshotTopCopper,
  togglePhaseSkew,
} from "./fixtures/phase-skew/open-phase-skew-page"
import { renderUsbPairBoard } from "./fixtures/phase-skew/usb-pair-board"

test("Show Differential Pair Phase Skew colours a length-matched USB pair between its detours", async () => {
  const circuitJson = renderUsbPairBoard()
  const [usbPair] = cju(circuitJson).source_bus.list()
  expect(usbPair.differential_pair).toBeDefined()
  const traceLengths = cju(circuitJson)
    .pcb_trace.list()
    .map((trace) => trace.trace_length?.toFixed(3))
  // End to end the pair is matched, so only phase skew reveals the detours.
  expect(traceLengths).toEqual(["25.236", "25.236"])

  const { page, errors, close } = await openPhaseSkewPage({
    circuitJson,
    renderer: "canvas",
  })
  try {
    await togglePhaseSkew({ page })
    expect(
      await page.evaluate(() =>
        localStorage.getItem(
          "pcb_viewer_is_showing_differential_pair_phase_skew",
        ),
      ),
    ).toBe("true")
    // Between the detours the positive trace has run farther: KiCad paints
    // it blue and its partner red, each at the full colour of its peak.
    const positivePoint = boardPointToScreen({ x: 0, y: 0.3 })
    const pixels = await screenshotPixelsAt({
      page,
      points: [positivePoint, boardPointToScreen({ x: 0, y: -0.3 })],
    })
    expect(pixels).toEqual([
      [0, 0, 255],
      [255, 0, 0],
    ])

    const svg = await snapshotTopCopper({
      page,
      title: "USB pair matched end to end, coloured by phase skew",
    })
    await expect(svg).toMatchSvgSnapshot(
      import.meta.path,
      "differential-pair-phase-skew",
    )

    // Hovering a trace of the pair adds its peak and its length skew limit.
    await page.mouse.move(positivePoint.x, positivePoint.y)
    const label = page.locator(".pcb-phase-skew-label")
    await label.waitFor()
    expect(await label.textContent()).toBe(
      "phase skew max 1.236 mm, length skew 0.000 / 0.1 mm",
    )
    expect(errors).toEqual([])
  } finally {
    await close()
  }
}, 60000)
