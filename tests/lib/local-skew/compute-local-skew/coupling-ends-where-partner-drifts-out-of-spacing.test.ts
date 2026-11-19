import { expect, test } from "bun:test"
import { computeLocalSkew } from "../../../../src/lib/local-skew/compute-local-skew"
import { renderPairBoard } from "../../../fixtures/local-skew/pair-board"
import { segmentAtX } from "../../../fixtures/local-skew/segment-at-x"

test("coupling stops partway along a step where the partner drifts out of spacing", () => {
  // DN slants from 0.6 mm to 0.88 mm away from DP between x = -10 and
  // x = 10. With a 0.45 mm gap and 0.15 mm traces it leaves the 0.72 mm
  // coupling limit near x = -1.4.
  const [pair] = computeLocalSkew(
    renderPairBoard({
      positivePath: [],
      negativePath: [
        { x: 2, y: 0 },
        { x: 22, y: -0.28 },
      ],
      pcbTraceGap: "0.45mm",
    }),
  )

  expect(segmentAtX({ segments: pair.positive.segments, x: -5 }).coupling).toBe(
    "coupled",
  )
  expect(segmentAtX({ segments: pair.positive.segments, x: 5 }).coupling).toBe(
    "unknown",
  )
})
