import { expect, spyOn, test } from "bun:test"
import { getDifferentialPairPhaseSkew } from "circuit-json-to-differential-pair-phase-skew"
import { getPhaseSkewStrokes } from "../../src/lib/get-phase-skew-strokes"
import { renderUsbPairBoard } from "../fixtures/phase-skew/usb-pair-board"

test("phaseSkewColors set to undefined or an unparsable colour keep KiCad's", () => {
  const differentialPairPhaseSkews = getDifferentialPairPhaseSkew({
    circuitJson: renderUsbPairBoard(),
  })
  const warn = spyOn(console, "warn").mockImplementation(() => {})
  try {
    const colors = getPhaseSkewStrokes({
      differentialPairPhaseSkews,
      phaseSkewColors: { positive: "oklch(0.6 0.2 20)", zero: undefined },
    }).map((stroke) => stroke.color)
    // KiCad's blue and white, not the black an undefined colour parses to.
    expect(colors).toContainEqual([0, 0, 1, 1])
    expect(colors).toContainEqual([1, 1, 1, 1])
    expect(colors).not.toContainEqual([0, 0, 0, 1])
    expect(warn).toHaveBeenCalledTimes(1)
  } finally {
    warn.mockRestore()
  }
})
