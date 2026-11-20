import "bun-match-svg"
import { expect, test } from "bun:test"
import { localSkewSvg } from "../../../fixtures/local-skew/local-skew-svg"
import { computeLocalSkew } from "../../../../src/lib/local-skew/compute-local-skew"
import { renderPairBoard } from "../../../fixtures/local-skew/pair-board"
import { segmentAtX } from "../../../fixtures/local-skew/segment-at-x"

test("without pcbTraceGap, a short closer neck-down doesn't uncouple the main run", async () => {
  // DN steps 0.3 mm closer to DP between x = -2 and x = -1.
  const circuitJson = renderPairBoard({
    positivePath: [],
    negativePath: [
      { x: 10, y: 0 },
      { x: 10, y: 0.3 },
      { x: 11, y: 0.3 },
      { x: 11, y: 0 },
    ],
  })
  const [pair] = computeLocalSkew(circuitJson)

  for (const x of [-8, 6]) {
    expect(segmentAtX({ segments: pair.positive.segments, x }).coupling).toBe(
      "coupled",
    )
  }

  await expect(localSkewSvg(circuitJson)).toMatchSvgSnapshot(import.meta.path)
})
