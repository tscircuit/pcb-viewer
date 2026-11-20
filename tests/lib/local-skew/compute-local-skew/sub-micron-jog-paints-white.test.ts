import "bun-match-svg"
import { expect, test } from "bun:test"
import { computeLocalSkew } from "../../../../src/lib/local-skew/compute-local-skew"
import { skewColor } from "../../../../src/lib/local-skew/skew-color"
import { localSkewSvg } from "../../../fixtures/local-skew/local-skew-svg"
import { renderPairBoard } from "../../../fixtures/local-skew/pair-board"
import { segmentAtX } from "../../../fixtures/local-skew/segment-at-x"

/** Extra copper added by the 0.5 µm triangular jog (~0.00041 mm, below 0.0005 mm). */
const JOG_EXTRA_LENGTH = 2 * Math.hypot(0.0005, 0.0005) - 0.001

test("a sub-micron jog whose skew rounds to 0.000 mm paints white instead of saturating", async () => {
  // DP takes a 0.5 µm jog at x = -2, adding ~0.00041 mm of copper. The 14 mm
  // run after the jog has non-zero skew that formats as 0.000 mm ("in step")
  // in the readout, so skewColor must paint it white rather than full blue/red.
  const circuitJson = renderPairBoard({
    positivePath: [
      { x: 10, y: 0 },
      { x: 10.0005, y: 0.0005 },
      { x: 10.001, y: 0 },
    ],
    negativePath: [],
    pcbTraceGap: "0.45mm",
  })

  const [pair] = computeLocalSkew(circuitJson)
  expect(pair.max_skew).toBeCloseTo(JOG_EXTRA_LENGTH, 5)

  const positiveAfter = segmentAtX({ segments: pair.positive.segments, x: 5 })
  const negativeAfter = segmentAtX({ segments: pair.negative.segments, x: 5 })
  expect(positiveAfter.coupling).toBe("coupled")
  expect(positiveAfter.skew).toBeCloseTo(JOG_EXTRA_LENGTH, 5)
  expect(negativeAfter.skew).toBeCloseTo(-JOG_EXTRA_LENGTH, 5)

  expect(
    skewColor({ skew: positiveAfter.skew, fullScale: pair.positive.scale }),
  ).toBe("rgb(255, 255, 255)")
  expect(
    skewColor({ skew: negativeAfter.skew, fullScale: pair.negative.scale }),
  ).toBe("rgb(255, 255, 255)")

  await expect(localSkewSvg(circuitJson)).toMatchSvgSnapshot(import.meta.path)
})
