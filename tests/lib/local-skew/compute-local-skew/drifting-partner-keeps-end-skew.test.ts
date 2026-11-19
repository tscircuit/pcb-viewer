import { expect, test } from "bun:test"
import { computeLocalSkew } from "../../../../src/lib/local-skew/compute-local-skew"
import { renderPairBoard } from "../../../fixtures/local-skew/pair-board"

/** DN's slanted 20 mm run is this much longer than DP's straight one, in mm. */
const SLANT_EXTRA_LENGTH = Math.hypot(20, 0.1) - 20

test("a slightly slanted partner keeps the skew it builds along the run", () => {
  // DN runs from x = -10 to x = 10 while drifting 0.1 mm away from DP.
  const [pair] = computeLocalSkew(
    renderPairBoard({
      positivePath: [{ x: 2, y: 0 }],
      negativePath: [
        { x: 2, y: 0 },
        { x: 22, y: -0.1 },
      ],
      pcbTraceGap: "0.45mm",
    }),
  )

  const slanted = pair.negative.segments.filter(
    (segment) =>
      segment.start.y !== segment.end.y && segment.coupling === "coupled",
  )
  const lastSkew = slanted[slanted.length - 1].skew ?? 0
  expect(slanted.length).toBeGreaterThan(1)
  expect(lastSkew).toBeCloseTo(SLANT_EXTRA_LENGTH, 4)
})
