import { expect, test } from "bun:test"
import "bun-match-svg"
import { cju } from "@tscircuit/circuit-json-util"
import {
  openPhaseSkewPage,
  snapshotTopCopper,
  toggleViewMenu,
} from "./fixtures/phase-skew/open-phase-skew-page"
import { renderUsbPairBoard } from "./fixtures/phase-skew/usb-pair-board"

test("the View menu lacks the phase skew toggle for a length-matched USB pair", async () => {
  const circuitJson = renderUsbPairBoard()
  const [usbPair] = cju(circuitJson).source_bus.list()
  expect(usbPair.differential_pair).toBeDefined()
  const traceLengths = cju(circuitJson)
    .pcb_trace.list()
    .map((trace) => trace.trace_length?.toFixed(3))
  // End to end the pair is matched, so only phase skew reveals the detours.
  expect(traceLengths).toEqual(["25.236", "25.236"])

  const { page, errors, close } = await openPhaseSkewPage({ circuitJson })
  try {
    await toggleViewMenu({ page })
    await page.getByText("Show Copper Pours", { exact: true }).waitFor()
    expect(
      await page
        .getByText("Show Differential Pair Phase Skew", { exact: true })
        .count(),
    ).toBe(0)
    await toggleViewMenu({ page })

    const svg = await snapshotTopCopper({
      page,
      title: "USB pair matched end to end, with no phase skew shown",
    })
    await expect(svg).toMatchSvgSnapshot(
      import.meta.path,
      "differential-pair-phase-skew",
    )
    expect(errors).toEqual([])
  } finally {
    await close()
  }
}, 60000)
