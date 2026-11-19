import { expect, test } from "bun:test"
import { computeLocalSkew } from "../../../../src/lib/local-skew/compute-local-skew"
import { renderDifferentialPairBoard } from "../../../fixtures/local-skew/differential-pair-board"
import { segmentAtX } from "../../../fixtures/local-skew/segment-at-x"

test("skew is zero before the first detour and after the second", () => {
  const [pair] = computeLocalSkew(
    renderDifferentialPairBoard({ compensated: true }),
  )

  for (const segments of [pair.positive.segments, pair.negative.segments]) {
    expect(segmentAtX({ segments, x: -11 }).skew).toBe(0)
    expect(segmentAtX({ segments, x: 11 }).skew).toBe(0)
  }
})
