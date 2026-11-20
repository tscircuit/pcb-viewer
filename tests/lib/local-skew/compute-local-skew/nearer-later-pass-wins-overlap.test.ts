import { expect, test } from "bun:test"
import { computeLocalSkew } from "../../../../src/lib/local-skew/compute-local-skew"
import { renderPairBoard } from "../../../fixtures/local-skew/pair-board"
import { segmentAtX } from "../../../fixtures/local-skew/segment-at-x"

/** DN's length to x = 0 on its second, nearer pass: 0.5 + 0.6 + 13.5 out, 0.3 + 6 + 0.3 back, then 4. */
const NEAR_PASS_LENGTH_AT_X0 = 0.5 + 0.6 + 13.5 + 0.3 + 6 + 0.3 + 4

test("where two passes overlap, the nearer one is used even when it comes later", () => {
  // DN first runs 1.2 mm from DP to x = 2, doubles back to x = -4, then
  // runs 0.6 mm from DP to its load pad. Both passes are within the gap.
  const [pair] = computeLocalSkew(
    renderPairBoard({
      positivePath: [],
      negativePath: [
        { x: 0.5, y: 0 },
        { x: 0.5, y: -0.6 },
        { x: 14, y: -0.6 },
        { x: 14, y: -0.3 },
        { x: 8, y: -0.3 },
        { x: 8, y: 0 },
        { x: 24, y: 0 },
      ],
      pcbTraceGap: "1mm",
    }),
  )

  // At x = 0 DP has run 12 mm.
  expect(
    segmentAtX({ segments: pair.positive.segments, x: 0 }).skew,
  ).toBeCloseTo(12 - NEAR_PASS_LENGTH_AT_X0, 5)
})
