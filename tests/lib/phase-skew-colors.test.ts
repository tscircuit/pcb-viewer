import { expect, test } from "bun:test"
import { getDifferentialPairPhaseSkew } from "circuit-json-to-differential-pair-phase-skew"
import { getPhaseSkewStrokes } from "../../src/lib/get-phase-skew-strokes"
import { renderUsbPairBoard } from "../fixtures/phase-skew/usb-pair-board"

test("phaseSkewColors replace KiCad's colours, and unset ones keep them", () => {
  const differentialPairPhaseSkews = getDifferentialPairPhaseSkew({
    circuitJson: renderUsbPairBoard(),
  })
  const colors = getPhaseSkewStrokes({
    differentialPairPhaseSkews,
    phaseSkewColors: { positive: "lime" },
  }).map((stroke) => stroke.color)
  // Each trace reaches full colour at its own peak.
  expect(colors).toContainEqual([0, 1, 0, 1])
  expect(colors).toContainEqual([1, 0, 0, 1])
  expect(colors).toContainEqual([1, 1, 1, 1])
  expect(colors).not.toContainEqual([0, 0, 1, 1])
})
