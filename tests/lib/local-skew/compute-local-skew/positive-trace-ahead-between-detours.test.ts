import { expect, test } from "bun:test"
import { computeLocalSkew } from "../../../../src/lib/local-skew/compute-local-skew"
import { renderDifferentialPairBoard } from "../../../fixtures/local-skew/differential-pair-board"
import { skewAtX } from "../../../fixtures/local-skew/skew-at-x"

/** Length the positive trace's detour adds, in mm. */
const DETOUR_EXTRA_LENGTH = 2 * Math.sqrt(0.5 ** 2 + 1 ** 2) - 1

test("positive trace is ahead by the detour length between the detours", () => {
  const [pair] = computeLocalSkew(renderDifferentialPairBoard())

  expect(skewAtX({ segments: pair.positive.segments, x: 0 })).toBeCloseTo(
    DETOUR_EXTRA_LENGTH,
    4,
  )
  expect(skewAtX({ segments: pair.negative.segments, x: 0 })).toBeCloseTo(
    -DETOUR_EXTRA_LENGTH,
    4,
  )
})
