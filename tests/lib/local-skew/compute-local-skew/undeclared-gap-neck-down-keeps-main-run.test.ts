import { expect, test } from "bun:test"
import { computeLocalSkew } from "../../../../src/lib/local-skew/compute-local-skew"
import { renderPairBoard } from "../../../fixtures/local-skew/pair-board"
import { segmentAtX } from "../../../fixtures/local-skew/segment-at-x"

test("without pcbTraceGap, a short closer neck-down doesn't uncouple the main run", () => {
  // DN steps 0.3 mm closer to DP between x = -2 and x = -1.
  const [pair] = computeLocalSkew(
    renderPairBoard({
      positivePath: [],
      negativePath: [
        { x: 10, y: 0 },
        { x: 10, y: 0.3 },
        { x: 11, y: 0.3 },
        { x: 11, y: 0 },
      ],
    }),
  )

  for (const x of [-8, 6]) {
    expect(segmentAtX({ segments: pair.positive.segments, x }).coupling).toBe(
      "coupled",
    )
  }
})
