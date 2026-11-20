import "bun-match-svg"
import { expect, test } from "bun:test"
import { localSkewSvg } from "../../../fixtures/local-skew/local-skew-svg"
import { computeLocalSkew } from "../../../../src/lib/local-skew/compute-local-skew"
import { renderPairBoard } from "../../../fixtures/local-skew/pair-board"
import { segmentAtX } from "../../../fixtures/local-skew/segment-at-x"

test("copper running beside the partner in the opposite direction is not coupled", async () => {
  // DN loops away, then runs right-to-left beside DP (anti-parallel), then
  // returns to its load far from DP.
  const circuitJson = renderPairBoard({
    positivePath: [],
    negativePath: [
      { x: 0, y: -4.7 },
      { x: 23, y: -4.7 },
      { x: 23, y: 0 },
      { x: 2, y: 0 },
      { x: 2, y: -1.2 },
      { x: 24, y: -1.2 },
    ],
    pcbTraceGap: "0.45mm",
  })
  const [pair] = computeLocalSkew(circuitJson)

  expect(segmentAtX({ segments: pair.positive.segments, x: 0 }).coupling).toBe(
    "unknown",
  )
  expect(pair.max_skew).toBeNull()

  await expect(localSkewSvg(circuitJson)).toMatchSvgSnapshot(import.meta.path)
})
