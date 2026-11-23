import { expect, test } from "bun:test"
import { getDifferentialPairPhaseSkew } from "circuit-json-to-differential-pair-phase-skew"
import { getPhaseSkewStrokes } from "../../src/lib/get-phase-skew-strokes"
import { renderUsbPairBoard } from "../fixtures/phase-skew/usb-pair-board"

test("translucent phaseSkewColors are drawn opaque, so overlapping piece ends don't darken", () => {
  const differentialPairPhaseSkews = getDifferentialPairPhaseSkew({
    circuitJson: renderUsbPairBoard(),
  })
  const colors = getPhaseSkewStrokes({
    differentialPairPhaseSkews,
    phaseSkewColors: { zero: "rgba(0, 0, 255, 0.2)", unknown: "#80808033" },
  }).map((stroke) => stroke.color)
  expect(colors).toContainEqual([0, 0, 1, 1])
  expect(colors.filter((strokeColor) => strokeColor[3] !== 1)).toEqual([])
})
