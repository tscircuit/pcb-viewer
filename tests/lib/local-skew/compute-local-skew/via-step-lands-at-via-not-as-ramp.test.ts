import "bun-match-svg"
import { expect, test } from "bun:test"
import { computeLocalSkew } from "../../../../src/lib/local-skew/compute-local-skew"
import { localSkewSvg } from "../../../fixtures/local-skew/local-skew-svg"
import { renderPairBoard } from "../../../fixtures/local-skew/pair-board"
import { segmentAtX } from "../../../fixtures/local-skew/segment-at-x"

test("an asymmetric via lands as a step at the via instead of smearing across the uncoupled stretch", async () => {
  // DP drops to the bottom layer at x = -6 while DN stays on top until its own
  // via at x = 0; both return to top together at x = 6. Between x = -6 and
  // x = 0, DP has already paid the 1.6 mm via length and DN has not yet.
  const circuitJson = renderPairBoard({
    positivePath: [
      { x: 6, y: 0, via: true, fromLayer: "top", toLayer: "bottom" },
      { x: 18, y: 0, via: true, fromLayer: "bottom", toLayer: "top" },
    ],
    negativePath: [
      { x: 12, y: 0, via: true, fromLayer: "top", toLayer: "bottom" },
      { x: 18, y: 0, via: true, fromLayer: "bottom", toLayer: "top" },
    ],
    pcbTraceGap: "0.45mm",
  })

  const [pair] = computeLocalSkew(circuitJson)

  // Coupled before x = -6 and after x = 0 with zero skew.
  expect(segmentAtX({ segments: pair.positive.segments, x: -9 }).skew).toBe(0)
  expect(segmentAtX({ segments: pair.positive.segments, x: 3 }).skew).toBe(0)

  // Between the staggered vias, the via length has stepped in immediately at
  // x = -6 and stays flat across the uncoupled stretch until DN's via at x = 0.
  const positiveInterpolated = pair.positive.segments.filter(
    (segment) => segment.coupling === "interpolated",
  )
  const negativeInterpolated = pair.negative.segments.filter(
    (segment) => segment.coupling === "interpolated",
  )
  expect(positiveInterpolated).toHaveLength(1)
  expect(negativeInterpolated).toHaveLength(1)
  expect(positiveInterpolated[0].skew).toBeCloseTo(1.6, 5)
  expect(negativeInterpolated[0].skew).toBeCloseTo(-1.6, 5)
  expect(pair.max_skew).toBeCloseTo(1.6, 5)

  await expect(localSkewSvg(circuitJson)).toMatchSvgSnapshot(import.meta.path)
})
